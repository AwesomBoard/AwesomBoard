(** Handling of ids and their string representations *)
let sqids : Sqids.t = Sqids.make ()

let to_string = fun (id : int) : string ->
    Sqids.encode sqids [id]

let of_string = fun (string_id : string) : int ->
    match Sqids.decode sqids string_id with
    | [id] -> id
    | _ -> raise (Errors.UnexpectedError (Printf.sprintf "Badly formatted id: %s" string_id))
