open Alcotest
open TestUtils
open Backend
open Utils
open FirestoreUtils

module type MOCK = sig
    include FirestorePrimitives.FIRESTORE_PRIMITIVES

    val read_docs : string list ref

    val created_docs : (string * JSON.t) list ref

    val set_docs : (string * string * JSON.t) list ref

    val updated_docs : (string * JSON.t) list ref

    val deleted_docs : string list ref

    val doc_to_return : JSON.t option ref
end

module Mock : MOCK = struct

    let read_docs = ref []

    let created_docs = ref []

    let set_docs = ref []

    let updated_docs = ref []

    let deleted_docs = ref []

    let doc_to_return = ref None

    let try_get_doc ~request:_ ~path =
        read_docs := path :: !read_docs;
        Lwt.return !doc_to_return

    let get_doc ~request ~path =
        let* doc = try_get_doc ~request ~path in
        match doc with
        | Some doc -> Lwt.return doc
        | None -> raise (DocumentNotFound path)

    let create_doc ~request:_ ~collection ~doc =
        created_docs := (collection, doc) :: !created_docs;
        Lwt.return "created-id"

    let set_doc ~request:_ ~collection ~id ~doc =
        set_docs := (collection, id, doc) :: !set_docs;
        Lwt.return ()

    let update_doc ~request:_ ~path ~update =
        updated_docs := (path, update) :: !updated_docs;
        Lwt.return ()

    let delete_doc ~request:_ ~path =
        deleted_docs := path :: !deleted_docs;
        Lwt.return ()

end

module FirestorePrimitives = FirestorePrimitives.Make(ExternalTests.Mock)(TokenRefresherTests.Mock)(StatsTests.Mock)

let tests = [
    "FirestorePrimitives.try_get_doc", [

        lwt_test "should retrieve the document returned by firestore if there is one" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document that exists *)
            let path : string = "collection/some-id" in
            let doc = `Assoc [("foo", `String "bar")] in
            let body : string = JSON.to_string (to_firestore ~path doc) in
            let _ = ExternalTests.Mock.Http.mock_response (response `OK, body) in
            (* When retrieving the document *)
            let* actual = FirestorePrimitives.try_get_doc ~request ~path in
            (* Then it should be the same document *)
            let expected = Some doc in
            check (option json_eq) "success" expected actual;
            Lwt.return ()
        );

        lwt_test "should return None if there is no document" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document that does not exist *)
            let path : string = "collection/some-id" in
            let _ = ExternalTests.Mock.Http.mock_response (response `Not_found, "") in
            (* When retrieving the document *)
            let* actual = FirestorePrimitives.try_get_doc ~request ~path in
            (* Then it should return None *)
            let expected = None in
            check (option json_eq) "missing document" expected actual;
            Lwt.return ()
        );
    ];

    "FirestorePrimitives.get_doc", [

        lwt_test "should retrieve the document returned by firestore" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document that exists *)
            let path : string = "collection/some-id" in
            let doc = `Assoc [("foo", `String "bar")] in
            let body : string = JSON.to_string (to_firestore ~path doc) in
            let _ = ExternalTests.Mock.Http.mock_response (response `OK, body) in
            (* When retrieving the document *)
            let* actual = FirestorePrimitives.get_doc ~request ~path in
            (* Then it should be the same document *)
            let expected = doc in
            check json_eq "success" expected actual;
            Lwt.return ()
        );

        lwt_test "should fail if firebase returns an error" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document that does not exist *)
            let _ = ExternalTests.Mock.Http.mock_response (response `Not_found, "") in
            (* When retrieving the document *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (DocumentNotFound "some-doc-that-doesnt-exist")) (fun () ->
                let* _ = FirestorePrimitives.get_doc ~request ~path:"some-doc-that-doesnt-exist" in
                Lwt.return ()
            )
        );
    ];

    "FirestorePrimitives.create_doc", [

        lwt_test "should make a POST request if we don't ask for a specific id, and return the id" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document that we want to create *)
            let collection : string = "collection" in
            let id : string = "some-id" in
            let path : string = collection ^ "/" ^ id in
            let doc = `Assoc [("foo", `String "bar")] in
            (* When we create it *)
            let body : string = JSON.to_string (`Assoc [("name", `String path)]) in
            let mock = ExternalTests.Mock.Http.mock_response (response `OK, body) in
            let* actual_id : string = FirestorePrimitives.create_doc ~request ~collection ~doc in
            (* Then it should have made a POST request with the doc, and should return the document id*)
            let firestore_doc = to_firestore doc in
            check (list http_query) "query" [(`POST, endpoint ~params:[("mask.fieldPaths", "_")] collection, Some firestore_doc)] !(mock.calls);
            check string "document id" id actual_id;
            Lwt.return ()
        );


        lwt_test "should fail if the document cannot be created" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document we want to create *)
            let doc = `Assoc [("foo", `String "bar")] in
            (* When we try to create it but firestore will not accept it *)
            let response = response `Bad_request in
            let _ = ExternalTests.Mock.Http.mock_response (response, "{}") in
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (UnexpectedError "error on document creation for collection: {}")) (fun () ->
                let* _ = FirestorePrimitives.create_doc ~request ~collection:"collection" ~doc in
                Lwt.return ())
        );
    ];

    "FirestorePrimitives.set_doc", [
        lwt_test "should make a PATCH request" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document that we want to create, along with a specific id *)
            let collection = "collection" in
            let id : string = "some-id" in
            let path : string = collection ^ "/" ^ id in
            let doc = `Assoc [("foo", `String "bar")] in
            (* When we create it (with set_doc) *)
            let body : string = JSON.to_string (`Assoc [("name", `String path)]) in
            let mock = ExternalTests.Mock.Http.mock_response (response `OK, body) in
            let* _ = FirestorePrimitives.set_doc ~request ~collection:"collection" ~id ~doc in
            (* Then it should have made a PATCH request with the doc *)
            let firestore_doc = to_firestore doc in
            check (list http_query) "query" [(`PATCH, endpoint ~params:[("mask.fieldPaths", "_"); ("updateMask.fieldPaths", "foo")] path, Some firestore_doc)] !(mock.calls);
            Lwt.return ()
        );
    ];

    "FirestorePrimitives.update_doc", [

        lwt_test "should make a PATCH request on the document with only the update" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given an update that we want to apply to some document *)
            let update = `Assoc [("foo", `String "bli")] in
            let path : string = "collection/some-id" in
            (* When we update it *)
            let mock = ExternalTests.Mock.Http.mock_response (response `OK, "") in
            let* _ = FirestorePrimitives.update_doc ~request ~path ~update in
            (* Then it should have made a PATCH request on the document with the update *)
            let firestore_update = to_firestore update in
            (* mask=_ means we don't care about the return value, updateMask=foo means we only update the foo field *)
            let params = [("mask.fieldPaths", "_"); ("updateMask.fieldPaths", "foo")] in
            check (list http_query) "query" [(`PATCH, endpoint ~params path, Some firestore_update)] !(mock.calls);
            Lwt.return ()
        );

        lwt_test "should fail if the update failed" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given an update that we want to apply to some document *)
            let update = `Assoc [("foo", `String "bli")] in
            (* When we update it and the update fails*)
            let _ = ExternalTests.Mock.Http.mock_response (response `Bad_request, "") in
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (UnexpectedError "error on document update for collection/some-id: ")) (fun () ->
                let* _ = FirestorePrimitives.update_doc ~request ~path:"collection/some-id" ~update in
                Lwt.return ())
        );

        lwt_test "should fail if provided an invalid update" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given an update that is not an Assoc, hence is invalid *)
            let update = `String "I am illegal" in
            (* When we try to perform the update *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (UnexpectedError "invalid update: should be a Assoc")) (fun () ->
                let* _ = FirestorePrimitives.update_doc ~request ~path:"collection/some-id" ~update in
                Lwt.return ())
        );
    ];

    "FirestorePrimitives.delete_doc", [

        lwt_test "should make a DELETE request on the document" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document we want to delete *)
            let path : string = "collection/some-id" in
            (* When we update it *)
            let mock = ExternalTests.Mock.Http.mock_response (response `OK, "") in
            let* _ = FirestorePrimitives.delete_doc ~request ~path in
            (* Then it should have made a DELETE request on the document *)
            check (list http_query) "query" [(`DELETE, endpoint path, None)] !(mock.calls);
            Lwt.return ()
        );

        lwt_test "should fail if the deletion failed" (fun () ->
            let request : Dream.request = Dream.request "/" in
            (* Given a document we want to delete *)
            let path : string = "collection/some-id" in
            (* When we update it *)
            let _ = ExternalTests.Mock.Http.mock_response (response `Bad_request, "") in
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (UnexpectedError "error on document deletion for collection/some-id: ")) (fun () ->
                let* _ = FirestorePrimitives.delete_doc ~request ~path in
                Lwt.return ())
        );
    ];

]
