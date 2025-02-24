(** Game ids are represented internally as ints, but sent to the client as
    readable strings instead.  We introduce a specific type for game id with two
    purposes: first, we will not mix them with regular ints, and second, we can
    transparently convert them to client strings *)
type t = GameId of int

let of_yojson = fun (json : JSON.t) : (t, string) result ->
    match json with
    | `String s -> Ok (GameId (Id.of_string s))
    | _ -> Error "invalid id"

let to_string = fun (GameId game_id : t) : string ->
    Id.to_string game_id

let to_yojson = fun (game_id : t) : JSON.t ->
    `String (to_string game_id)

let to_int = fun (GameId game_id : t) : int ->
    game_id


let lobby = GameId Id.lobby
