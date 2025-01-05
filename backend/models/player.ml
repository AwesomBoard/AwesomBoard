open Utils

(** A player is either player zero or one *)
module Player = struct
    type t = Zero | One

    (** Players are represented by numbers in the database *)
    let (to_yojson, of_yojson) =
        JSON.for_enum [
            Zero, `Int 0;
            One, `Int 1;
        ]

    let opponent_of = fun (player : t) : t ->
        match player with
        | Zero -> One
        | One -> Zero
end

(** It is sometimes useful to represent player maps *)
module Map = struct
    type 'a t = {
        zero : 'a;
        one : 'a;
    }

    let get = fun (map : 'a t) (player : Player.t) ->
        match player with
        | Zero -> map.zero
        | One -> map.one
end

include Player
