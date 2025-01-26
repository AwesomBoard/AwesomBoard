(** The user document in Firestore *)
type t = {
    username: string option;
    last_update_time: string option [@default None] [@key "lastUpdateTime"];
    verified: bool;
    (* The current game is only there for informational purposes *)
    current_game: CurrentGame.t option [@default None] [@key "currentGame"];
}
[@@deriving yojson]

let to_minimal_user = fun (uid : string) (user : t) : MinimalUser.t ->
    { id = uid; name = Option.get user.username }
