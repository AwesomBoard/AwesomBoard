open Alcotest
open Backend
open Utils
open TestUtils

let expected_headers = [
    "Access-Control-Allow-Origin";
    "Access-Control-Allow-Methods";
    "Access-Control-Allow-Headers";
    "Access-Control-Allow-Credentials";
    "Access-Control-Max-Age";
]

let check_presence_of_headers request =
    (* Given a CORS middleware *)
    let handler = Dream.router [ Dream.get "/" (fun _ -> Dream.empty `Found) ] in
    let middleware = Cors.middleware handler in
    (* When an OPTIONS request is made *)
    let* result = middleware request in
    (* Then we should have the headers *)
    List.iter (fun header ->
        check bool
            (Printf.sprintf "has expected header: %s" header)
            true
            (Dream.has_header result header))
        expected_headers;
    Lwt.return ()

let tests = [
    "Cors.middleware", [

        lwt_test "should reply to OPTIONS request with appropriate headers" (fun () ->
            let request : Dream.request = Dream.request ~method_:`OPTIONS "/" in
            check_presence_of_headers request);


        lwt_test "should reply to other requests with appropriate headers" (fun () ->
            let request : Dream.request = Dream.request ~method_:`GET "/" in
            check_presence_of_headers request);
    ]
]
