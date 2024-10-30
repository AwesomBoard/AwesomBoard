open Alcotest
open TestUtils
open Backend
open Utils

module type MOCK = sig
    include Auth.AUTH

    val set : string -> Domain.User.t -> unit

end

module Mock : MOCK = struct

    let uid : string ref = ref ""
    let user : Domain.User.t option ref = ref None

    let set new_uid new_user =
        uid := new_uid;
        user := Some new_user

    let get_user _request = match !user with
        | Some user -> user
        | None -> failwith "No user set"

    let get_uid _request = !uid

    let get_minimal_user _request =
        Domain.User.to_minimal_user !uid (Option.get !user)

    let middleware = fun handler request ->
        handler request

end

module Auth = Auth.Make(FirestoreTests.Mock)(GoogleCertificatesTests.Mock)(StatsTests.Mock)(JwtTests.Mock)

let valid_token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjAzMmNjMWNiMjg5ZGQ0NjI2YTQzNWQ3Mjk4OWFlNDMyMTJkZWZlNzgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZXZlcnlib2FyZC10ZXN0IiwiYXVkIjoiZXZlcnlib2FyZC10ZXN0IiwiYXV0aF90aW1lIjoxNjc3OTM2MTQ5LCJ1c2VyX2lkIjoid0VDY3VNUFZRSE85VlNzN2JnT0w1ckx4bVBEMiIsInN1YiI6IndFQ2N1TVBWUUhPOVZTczdiZ09MNXJMeG1QRDIiLCJpYXQiOjE3MDI5NTI0MDEsImV4cCI6MTcwMjk1NjAwMSwiZW1haWwiOiJhYmNAZGVmLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJhYmNAZGVmLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.w356bi9Dwx9gGqORRfOwKSPLhq21XyiE7V1pmqnNxpUsQJeKRlHz9vi8QeJDwFT1dTkt79pVRacqd2w4G52tjNv7Khf6aRx6arbBtWfqLBNzbzD-US2iQFkPnXy_EkJma-YGTGbUSly6Ry9vd0axiUAvUkJ_DD1Ig1ySeYLMzeVkf501MZHshn7FO4Gx27DeLEQOLebNR9wJW4YnFN1lzyD4FM8KMpkgrpe7QQdoKNtG01aG96musc0YW0LofXN8_oQILg2Ocpnm9GLtSoUy7XNSqmQzgjiDvCR9xrPKMoPHmLcWZdrsTwTzLda9q4g0-RFGzA1yV1JMKzfY9qoRgQ"

let tests = [
    "Auth.middleware", [
        lwt_test "should fail if there is no Authorization token" (fun () ->
            (* Given a request without Authorization token *)
            let request : Dream.request = Dream.request ~headers:[] "/" in
            (* When it is received by the middleware *)
            let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
            let* actual = Auth.middleware handler request in
            (* Then it should fail *)
            let json_response = `Assoc [("reason", `String "Authorization token is missing")] in
            let expected = Dream.response ~status:`Unauthorized (JSON.to_string json_response) in
            lwt_check_response "failure"  expected actual
        );

        lwt_test "should fail if the authorization header is invalid" (fun () ->
            (* Given a request with an invalid Authorization header *)
            let request : Dream.request = Dream.request ~headers:[("Authorization", "i'm missing the Bearer part")] "/" in
            (* When it is received by the middleware *)
            let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
            let* actual = Auth.middleware handler request in
            (* Then it should fail *)
            let json_response = `Assoc [("reason", `String "Authorization header is invalid")] in
            let expected = Dream.response ~status:`Unauthorized (JSON.to_string json_response) in
            lwt_check_response "failure" expected actual
        );

        lwt_test "should fail if the token is invalid" (fun () ->
            (* Given a request with an invalid Authorization token *)
            let request : Dream.request = Dream.request ~headers:[("Authorization", "Bearer foo")] "/" in
            (* When it is received by the middleware *)
            let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
            let* actual = Auth.middleware handler request in
            (* Then it should fail *)
            let json_response = `Assoc [("reason", `String "Authorization token cannot be parsed")] in
            let expected = Dream.response ~status:`Unauthorized (JSON.to_string json_response) in
            lwt_check_response "failure" expected actual
        );

        lwt_test "should fail if the token is invalid (but is base64)" (fun () ->
            (* Given a request with an invalid Authorization token, but correctly formed as 3 base64 strings *)
            let request : Dream.request = Dream.request ~headers:[("Authorization", "Bearer TUdQ.SmVhbkphamE=.cnVsZXo=")] "/" in
            (* When it is received by the middleware *)
            let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
            let* actual = Auth.middleware handler request in
            (* Then it should fail *)
            let json_response = `Assoc [("reason", `String "Authorization token cannot be parsed")] in
            let expected = Dream.response ~status:`Unauthorized (JSON.to_string json_response) in
            lwt_check_response "failure" expected actual
        );

        lwt_test "should fail if the token is invalid (but is base64 from JSON)" (fun () ->
            (* Given a request with an invalid Authorization token, but correctly formed as 3 base64 strings from JSON *)
            let request : Dream.request = Dream.request ~headers:[("Authorization", "Bearer e30=.e30=.e30=")] "/" in
            (* When it is received by the middleware *)
            let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
            let* actual = Auth.middleware handler request in
            (* Then it should fail *)
            let json_response = `Assoc [("reason", `String "Authorization token cannot be verified")] in
            let expected = Dream.response ~status:`Unauthorized (JSON.to_string json_response) in
            lwt_check_response "failure" expected actual
        );

        lwt_test "should fail if the user has no account" (fun () ->
            (* Given a request with a valid Authorization token, but no corresponding user *)
            let request : Dream.request = Dream.request ~headers:[("Authorization", "Bearer " ^ valid_token)] "/" in
            JwtTests.Mock.validate_token := true;
            FirestoreTests.Mock.user := (fun () -> raise (DocumentNotFound "user"));
            (* When it is received by the middleware *)
            let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
            let* actual = Auth.middleware handler request in
            (* Then it should fail *)
            let json_response = `Assoc [("reason", `String "User is invalid")] in
            let expected = Dream.response ~status:`Unauthorized (JSON.to_string json_response) in
            lwt_check_response "failure" expected actual
        );

        lwt_test "should fail if the user is broken" (fun () ->
            (* Given a request with a valid Authorization token, but no corresponding user *)
            let request : Dream.request = Dream.request ~headers:[("Authorization", "Bearer " ^ valid_token)] "/" in
            JwtTests.Mock.validate_token := true;
            FirestoreTests.Mock.user := (fun () -> raise (DocumentInvalid "user"));
            (* When it is received by the middleware *)
            let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
            let* actual = Auth.middleware handler request in
            (* Then it should fail *)
            let json_response = `Assoc [("reason", `String "User is invalid")] in
            let expected = Dream.response ~status:`Unauthorized (JSON.to_string json_response) in
            lwt_check_response "failure" expected actual
        );

        lwt_test "should fail if the user has an unverified account" (fun () ->
            (* Given a request with a valid Authorization token for an user that is not verified *)
            let request : Dream.request = Dream.request ~headers:[("Authorization", "Bearer " ^ valid_token)] "/" in
            JwtTests.Mock.validate_token := true;
            FirestoreTests.Mock.user := (fun () -> FirestoreTests.unverified_user);
            (* When it is received by the middleware *)
            let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
            let* actual = Auth.middleware handler request in
            (* Then it should fail *)
            let json_response = `Assoc [("reason", `String "User is not verified")] in
            let expected = Dream.response ~status:`Unauthorized (JSON.to_string json_response) in
            lwt_check_response "failure" expected actual
        );

        lwt_test "should call the handler with the user bound if the request is well formed" (fun () ->
            (* Given a request with a valid Authorization token for an user that is verified *)
            let request : Dream.request = Dream.request ~headers:[("Authorization", "Bearer " ^ valid_token)] "/" in
            JwtTests.Mock.validate_token := true;
            FirestoreTests.Mock.user := (fun () -> FirestoreTests.verified_user);
            (* When it is received by the middleware *)
            (* Then it should succeed and bind the user in the handler *)
            let handler = Dream.router [ Dream.get "/" (fun request ->
                let actual_user : Domain.User.t = Auth.get_user request in
                let uid : string = Auth.get_uid request in
                let minimal_user : Domain.MinimalUser.t = Auth.get_minimal_user request in
                let expected_user : Domain.User.t = FirestoreTests.verified_user in
                let expected_minimal_user : Domain.MinimalUser.t = FirestoreTests.verified_minimal_user in
                check user_eq "user" expected_user actual_user;
                check string "uid (user)" expected_minimal_user.id uid;
                check string "name" expected_minimal_user.name minimal_user.name;
                check string "uid (minimal user)" expected_minimal_user.id minimal_user.id;
                Dream.html ~status:`Found "response from the handler") ] in
            let* actual = Auth.middleware handler request in
            let expected = Dream.response ~status:`Found "response from the handler" in
            lwt_check_response "success" expected actual
        );
    ];

    "Auth.get_user", [
        test "should fail if there is no middleware" (fun () ->
            check_raises "failure" (UnexpectedError "No user stored. Is the Auth middleware missing?") (fun () ->
                let request : Dream.request = Dream.request "" in
                let _ = Auth.get_user request in
                ()
            )
        );
    ];

]
