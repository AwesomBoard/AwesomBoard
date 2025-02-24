(** The current game stored in the user document *)
type t = {
    id: string; (** The id of the game *)
    game_name: string [@key "gameName"]; (** The name of the game *)
    opponent: MinimalUser.t option; (** The opponent against which the user is playing *)
    role: Role.t; (** The role of the user *)
}
[@@deriving yojson]
