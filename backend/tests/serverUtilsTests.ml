open Alcotest
open Backend
open Utils
open TestUtils

module ServerUtils = ServerUtils.Make(ExternalTests.Mock)

(** [error_of_exn exn] creates a Dream error that corresponds to what will be
    created if the server ever encounters the exception [exn]. *)
let error_of_exn = fun (exn : exn) : Dream.error ->
    Dream.{
        condition = `Exn exn;
        layer = `App;
        caused_by = `Server;
        request = None;
        response = None;
        client = None;
        severity = `Error;
        will_send_response = true;
    }


let tests = [

   "ServerUtils.server_time", [
       lwt_test "should answer with the current time in JSON" (fun () ->
           ExternalTests.Mock.current_time_seconds := 42;
           (* When requesting the current time *)
           let request : Dream.request = Dream.request ~method_:`GET "/time" in
           let* response = ServerUtils.server_time request in
           let* body = Dream.body response in
           (* Then it should answer with a JSON containing the time *)
           check status "response status" `OK (Dream.status response);
           let json_expected = `Assoc [("time", `Int 42000)] in
           check json_eq "response content" json_expected (JSON.from_string body);
           Lwt.return ()
       )
   ];

   "ServerUtils.error_handler", [
       lwt_test "should answer with JSONified error and 400 in case of BadInput" (fun () ->
           (* Given a BadInput exception that was raised *)
           let error_message : string = "I can't do this!" in
           let exn = BadInput error_message in
           let error = error_of_exn exn in
           (* When handling it with the error handler *)
           let* result = ServerUtils.error_handler error in
           (* Then... *)
           match result with
           | None -> fail "should have return something"
           | Some response ->
               check status "response status" `Bad_Request (Dream.status response);
               let* body = Dream.body response in
               let expected = `Assoc [("reason", `String error_message)] in
               check json_eq "response body" expected (JSON.from_string body);
               Lwt.return ()
       );

       lwt_test "should answer with JSONified error and 500 in case of DocumentInvalid" (fun () ->
           (* Given a DocumentInvalid exception that was raised *)
           let document_path : string = "/foo/bar" in
           let exn = DocumentInvalid document_path in
           let error = error_of_exn exn in
           (* When handling it with the error handler *)
           let* result = ServerUtils.error_handler error in
           (* Then... *)
           match result with
           | None -> fail "should have return something"
           | Some response ->
               check status "response status" `Internal_Server_Error (Dream.status response);
               let* body = Dream.body response in
               let expected = `Assoc [("reason", `String "invalid_doc"); ("document", `String document_path)] in
               check json_eq "response body" expected (JSON.from_string body);
               Lwt.return ()
       );

       lwt_test "should answer with JSONified error and 404 in case of DocumentNotFound" (fun () ->
           (* Given a DocumentNotFound exception that was raised *)
           let document_path : string = "/foo/bar" in
           let exn = DocumentNotFound document_path in
           let error = error_of_exn exn in
           (* When handling it with the error handler *)
           let* result = ServerUtils.error_handler error in
           (* Then... *)
           match result with
           | None -> fail "should have return something"
           | Some response ->
               check status "response status" `Not_Found (Dream.status response);
               let* body = Dream.body response in
               let expected = `Assoc [("reason", `String "not_found"); ("document", `String document_path)] in
               check json_eq "response body" expected (JSON.from_string body);
               Lwt.return ()
       );

       lwt_test "should answer with JSONified error default return code otherwise" (fun () ->
           (* Given an unknown exception that was raised *)
           let exn = Failure "unexpected error" in
           let error = error_of_exn exn in
           (* When handling it with the error handler *)
           let* result = ServerUtils.error_handler error in
           (* Then... *)
           match result with
           | None -> fail "should have return something"
           | Some response ->
               check status "response status" `Internal_Server_Error (Dream.status response);
               let* body = Dream.body response in
               let expected = `Assoc [("reason", `String "")] in
               check json_eq "response body" expected (JSON.from_string body);
               Lwt.return ()
       );

       lwt_test "should provide debug info when option is enabled" (fun () ->
           (* Given a exception that was raised when show_errors is set *)
           Options.show_errors := true;
           let exn = Failure "unexpected error" in
           let error = error_of_exn exn in
           (* When handling it with the error handler *)
           let* result = ServerUtils.error_handler error in
           (* Then... *)
           Options.show_errors := false;
           match result with
           | None -> fail "should have return something"
           | Some response ->
               let* body = Dream.body response in
               match JSON.Util.member "debug" (JSON.from_string body) with
               | `String s when String.length s > 0 ->
                   Lwt.return ()
               | _ ->
                   fail (Printf.sprintf "unexpected JSON output, expected non empty 'debug', but got %s" body)
       );
   ]
]
