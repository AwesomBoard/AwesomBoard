open Alcotest
open TestUtils
open Backend
open Utils
open DreamUtils

module type MOCK = sig
    include TokenRefresher.TOKEN_REFRESHER

    (* To be overriden by the tests that need it *)
    val token_value : string ref
end

module Mock : TokenRefresher.TOKEN_REFRESHER = struct

    let token_value = ref "token"

    let header (_ : Dream.request) : Cohttp.Header.t Lwt.t =
        Lwt.return (Cohttp.Header.of_list [authorization_header !token_value])

    let middleware (_ : string) : Dream.middleware =
        fun handler -> handler
end

module TokenRefresher = TokenRefresher.Make(ExternalTests.Mock)(JwtTests.Mock)

let access_token : JSON.t = `Assoc [
    ("access_token", `String "some-access-token");
    ("expires_in", `Int 42)
]

let access_token_str : string = JSON.to_string access_token

let tests = [

    "TokenRefresher.header", [
        lwt_test "should fail if the middleware is absent" (fun () ->
            lwt_check_raises "failure" ((=) (UnexpectedError "get_token_field not set, the middleware is probably missing")) (fun () ->
                let request : Dream.request = Dream.request "/" in
                let* _ = TokenRefresher.header request in
                Lwt.return ()
            )
        );
    ];

    "TokenRefresher.middleware", [
        test "should fail if there is no service account (without emulator)" (fun () ->
            Options.emulator := false; (* need to not use the emulator to read the service-account file *)
            check_raises "failure" (UnexpectedError "Cannot read service account from file: does-not-exist.json: No such file or directory") (fun () ->
                let _ : Dream.middleware = TokenRefresher.middleware "does-not-exist.json" in ()
            );
            Options.emulator := true
        );

        test "should fail if the private key is invalid" (fun () ->
            Options.emulator := false; (* need to not use the emulator to read the service-account file *)
            check_raises "failure" (UnexpectedError "Cannot read private key from service account file") (fun () ->
                let _ : Dream.middleware = TokenRefresher.middleware "test-data/corrupted-service-account.json" in ()
            );
            Options.emulator := true
        );

        test "should create middleware if the service account exists" (fun () ->
            Options.emulator := false; (* need to not use the emulator to read the service-account file *)
            (* it should not throw *)
            let _ : Dream.middleware = TokenRefresher.middleware "test-data/service-account.json" in
            Options.emulator := true
        );

        lwt_test "should request a token and bind it in the request" (fun () ->
            Options.emulator := false; (* need to not use the emulator to read the service-account file *)
            Mirage_crypto_rng_lwt.initialize (module Mirage_crypto_rng.Fortuna);
            (* Given a middleware and an access token that it will retrieve *)
            let middleware : Dream.middleware = TokenRefresher.middleware "test-data/service-account.json" in
            let response = response `OK in
            let body = access_token_str in
            let mock = ExternalTests.Mock.Http.mock_response (response, body) in
            (* When the middleware receives a request *)
            let request : Dream.request = Dream.request "/" in
            (* Then it should bind the headers containing the token in the request passed to the handler *)
            let handler = Dream.router [ Dream.get "/" (fun request ->
                let* header = TokenRefresher.header request in
                let actual = Cohttp.Header.to_list header in
                let expected = [("Authorization", "Bearer some-access-token")] in
                check (list (pair string string)) "success" expected actual;
                Dream.empty `Found) ] in
            let* _ = middleware handler request in
            check int "number of tokens requested" 1 !(mock.number_of_calls);
            Options.emulator := true;
            Lwt.return ()
        );

        lwt_test "should request a new token if the old one is outdated" (fun () ->
            Options.emulator := false; (* need to not use the emulator to read the service-account file *)
            Mirage_crypto_rng_lwt.initialize (module Mirage_crypto_rng.Fortuna);
            (* Given a middleware where a token has already been requested but is now expired *)
            ExternalTests.Mock.current_time_seconds := 0;
            let middleware : Dream.middleware = TokenRefresher.middleware "test-data/service-account.json" in
            let response = response `OK in
            let body = access_token_str in (* this token expires in 42 seconds! *)
            let mock = ExternalTests.Mock.Http.mock_response (response, body) in
            (* A first request is made to retrieve the token *)
            let request : Dream.request = Dream.request "/" in
            let handler = Dream.router [ Dream.get "/" (fun request ->
                let* header = TokenRefresher.header request in
                let actual = Cohttp.Header.to_list header in
                let expected = [("Authorization", "Bearer some-access-token")] in
                check (list (pair string string)) "success" expected actual;
                Dream.empty `Found) ] in
            let* _ = middleware handler request in
            check int "number of tokens requested" 1 !(mock.number_of_calls);
            (* When handling a new request after expiration time *)
            ExternalTests.Mock.current_time_seconds := 100;
            let* _ = middleware handler request in
            (* Then it should have requested a new token *)
            check int "number of tokens requested" 2 !(mock.number_of_calls);
            Options.emulator := true;
            Lwt.return ()
        );

        lwt_test "should not request a new token if the old one is still valid" (fun () ->
            Options.emulator := false; (* need to not use the emulator to read the service-account file *)
            (* Given a middleware where a token has already been requested (and is not expired) *)
            ExternalTests.Mock.current_time_seconds := 0;
            let middleware : Dream.middleware = TokenRefresher.middleware "test-data/service-account.json" in
            let response = response `OK in
            let body = access_token_str in (* expires in 42 seconds! *)
            let mock = ExternalTests.Mock.Http.mock_response (response, body) in
            let request : Dream.request = Dream.request "/" in
            let handler = Dream.router [ Dream.get "/" (fun request ->
                let* header = TokenRefresher.header request in
                let actual = Cohttp.Header.to_list header in
                let expected = [("Authorization", "Bearer some-access-token")] in
                check (list (pair string string)) "success" expected actual;
                Dream.empty `Found) ] in
            let* _ = middleware handler request in
            check int "number of tokens requested" 1 !(mock.number_of_calls);
            (* When handling a new request before the expiration of the token *)
            ExternalTests.Mock.current_time_seconds := 20;
            let* _ = middleware handler request in
            (* Then it should not have requested a new token *)
            check int "number of tokens requested" 1 !(mock.number_of_calls);
            Options.emulator := true;
            Lwt.return ()
        );

        lwt_test "should not request a token in the emulator" (fun () ->
            Mirage_crypto_rng_lwt.initialize (module Mirage_crypto_rng.Fortuna);
            (* Given a middleware run with the emulator *)
            Options.emulator := true; (* by default *)
            let middleware : Dream.middleware = TokenRefresher.middleware "test-data/service-account.json" in
            let response = response `OK in
            let body = access_token_str in
            let mock = ExternalTests.Mock.Http.mock_response (response, body) in
            (* When the middleware receives a request *)
            let request : Dream.request = Dream.request "/" in
            (* Then it should not retrieve the token but use the string "owner" instead *)
            let handler = Dream.router [ Dream.get "/" (fun request ->
                let* header = TokenRefresher.header request in
                let actual = Cohttp.Header.to_list header in
                let expected = [("Authorization", "Bearer owner")] in
                check (list (pair string string)) "success" expected actual;
                Dream.empty `Found) ] in
            let* _ = middleware handler request in
            check int "number of tokens requested" 0 !(mock.number_of_calls);
            Lwt.return ()
        );

    ];
]
