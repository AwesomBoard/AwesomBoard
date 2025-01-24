open Utils

(** The role a user may have in a config-room *)
type t = Player | Observer | Creator | ChosenOpponent | Candidate

(** Roles are represented as strings in the database *)
let (to_yojson, of_yojson) =
    JSON.for_enum [
        Player, `String "Player";
        Observer, `String "Observer";
        Creator, `String "Creator";
        ChosenOpponent, `String "ChosenOpponent";
        Candidate, `String "Candidate";
    ]
