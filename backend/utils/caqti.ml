include Caqti_type.Std
include Caqti_request.Infix

module type DB = Caqti_lwt.CONNECTION

let json = fun (to_yojson : 'a -> JSON.t) (of_yojson : JSON.t -> ('a, string) Result.t) : 'a Caqti_type.t ->
    let encode = fun (v : 'a) : (string, string) Result.t ->
        to_yojson v |> JSON.to_string |> Result.ok in
    let decode = fun (v : string) : ('a, string) Result.t ->
        of_yojson (JSON.from_string v) in
    custom ~encode ~decode string

let check = fun (result : ('a, Caqti_error.t) Result.t Lwt.t) : 'a Lwt.t ->
    match%lwt result with
    | Result.Ok r -> Lwt.return r
    | Result.Error e ->
        raise (Errors.UnexpectedError (Printf.sprintf "db failure: %s" (Caqti_error.show e)))
