open Utils

(** This module contains the subscription-related code. The idea is that one
    client can subscribe to at most one game. When they are subscribed, they will
    receive all data related to the game immediately, then receive any further
    updates until they unsubscribe. *)

(** The subscriptions of the clients. Each client can be subscribed to only one game.
    Both maps are managed together, in order to provide fast lookup in both ways. *)
let client_to_game : (int, int) Hashtbl.t = Hashtbl.create 16
let game_to_clients : (int, IntSet.t) Hashtbl.t = Hashtbl.create 16

(** [subsrcibe client_id game_id] subscribes client [client_id] to game [game_id] *)
let subscribe = fun (client_id : int) (game_id : int) : unit ->
    (* Add it to the client_to_game map. It overwrites the previous subscription, if any. *)
    Hashtbl.replace client_to_game client_id game_id;
    (* Add it to the game_to_clients map, on top of other subscribers *)
    let new_clients = match Hashtbl.find_opt game_to_clients game_id with
        | Some clients -> IntSet.add client_id clients
        | None -> IntSet.singleton client_id in
    Hashtbl.replace game_to_clients game_id new_clients

(** [unsubscribe client_id] unsubscribes client [client_id] from its current subscription *)
let unsubscribe = fun (client_id : int) : unit ->
    begin match Hashtbl.find_opt client_to_game client_id with
        | Some game_id ->
            let old_clients = Hashtbl.find game_to_clients game_id in
            let new_clients = IntSet.remove client_id old_clients in
            if IntSet.is_empty new_clients then
                Hashtbl.remove game_to_clients game_id
            else
                Hashtbl.replace game_to_clients game_id new_clients
        | None ->
            (* Client was not subscribed to anything *)
            ()
    end;
    Hashtbl.remove client_to_game client_id

(** [subscription_to game_id] returns all the subscribers to game [game_id] *)
let subscriptions_to = fun (game_id : int) : IntSet.t ->
    match Hashtbl.find_opt game_to_clients game_id with
    | Some clients -> clients
    | None -> IntSet.empty

(** [is_subscribed client_id] checks that client [client_id] is subscribed to something *)
let is_subscribed = fun (client_id : int) : bool ->
    Hashtbl.mem client_to_game client_id

(** [subsrciption_of client_id] gets the game to which a client is subscribed.
    Assumes that the client is subscribed to a game. If not, raises [Not_found] *)
let subscription_of = fun (client_id : int) : int ->
    match Hashtbl.find_opt client_to_game client_id with
    | Some game -> game
        | None -> raise Not_found
