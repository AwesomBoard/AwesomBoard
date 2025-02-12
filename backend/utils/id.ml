(** Handling of ids and their string representations *)
let sqids : Sqids.t = Sqids.make ~min_length:8 ()

let lobby = -1

let to_string = fun (id : int) : string ->
    if id = lobby then
        "lobby"
    else
        Sqids.encode sqids [id]

let of_string = fun (string_id : string) : int ->
    if string_id = "lobby" then
        lobby
    else
        match Sqids.decode sqids string_id with
        | [id] -> id
        | _ -> raise (Errors.UnexpectedError (Printf.sprintf "Badly formatted id: %s" string_id))
