open Utils

(** This module contains the subscription-related code. The idea is that one
    client can subscribe to at most one game. When they are subscribed, they
    will receive all data related to the game immediately, then receive any
    further updates until they unsubscribe. There are different types of
    subscriptions: chat subscriptions, config room subscriptions, and game
    subscriptions
*)

module type SUBSCRIPTION_MANAGER = sig

    type subscription_kind =
        | Lobby
        | ConfigRoom
        | Game

    (** [subscribe client_id user game_id] subscribes client [client_id] of user
        [user] to game [game_id] *)
    val subscribe : client_id:int -> Models.MinimalUser.t -> GameId.t -> subscription_kind -> unit

    (** [unsubscribe client_id] unsubscribes client [client_id] from its current subscription *)
    val unsubscribe : client_id:int -> unit

    (** [subscription_of client_id] gets the game to which a client is subscribed.
        Assumes that the client is subscribed to a game. If not, raises [Not_found] *)
    val subscription_of : client_id:int -> subscription_kind * GameId.t

    (** [subscription_to game_id] returns all the subscribers to game [game_id] *)
    val subscriptions_to : GameId.t -> subscription_kind -> IntSet.t

    (** [is_subscribed user] checks if user [user] is subscribed to something *)
    val is_subscribed : Models.MinimalUser.t -> bool

end

module SubscriptionManager : SUBSCRIPTION_MANAGER = struct
    type subscription_kind =
        | Lobby
        | ConfigRoom
        | Game

  (** The subscriptions of the clients. Each client can be subscribed to only one game.
      Both maps are managed together, in order to provide fast lookup in both ways. *)
  let client_to_game : (int, subscription_kind * GameId.t) Hashtbl.t = Hashtbl.create 16
  let game_to_clients : (subscription_kind * GameId.t, IntSet.t) Hashtbl.t = Hashtbl.create 16

  (** We also track the user corresponding to each client. We don't want more than
      one subscription per user. *)
  let client_to_user : (int, Models.MinimalUser.t) Hashtbl.t = Hashtbl.create 16
  let user_to_client : (Models.MinimalUser.t, int) Hashtbl.t = Hashtbl.create 16

  let subscribe = fun ~(client_id : int) (user : Models.MinimalUser.t) (game_id : GameId.t) (kind : subscription_kind) : unit ->
      (* Add it to the client_to_game map. It overwrites the previous subscription, if any. *)
      Hashtbl.replace client_to_game client_id (kind, game_id);
      (* Add it to the game_to_clients map, on top of other subscribers *)
      let new_clients = match Hashtbl.find_opt game_to_clients (kind, game_id) with
          | Some clients -> IntSet.add client_id clients
          | None -> IntSet.singleton client_id in
      Hashtbl.replace game_to_clients (kind, game_id) new_clients;
      (* Add the user to the relevant maps *)
      Hashtbl.replace client_to_user client_id user;
      Hashtbl.replace user_to_client user client_id

  let unsubscribe = fun ~(client_id : int) : unit ->
      begin match Hashtbl.find_opt client_to_game client_id with
          | Some (kind, game_id) ->
              let old_clients = Hashtbl.find game_to_clients (kind, game_id) in
              let new_clients = IntSet.remove client_id old_clients in
              if IntSet.is_empty new_clients then
                  Hashtbl.remove game_to_clients (kind, game_id)
              else
                  Hashtbl.replace game_to_clients (kind, game_id) new_clients
          | None ->
              (* Client was not subscribed to anything *)
              ()
      end;
      Hashtbl.remove client_to_game client_id;
      (* Same logic for the client/user mapping *)
      begin match Hashtbl.find_opt client_to_user client_id with
          | Some user ->
              Hashtbl.remove user_to_client user
          | None -> ()
      end;
      Hashtbl.remove client_to_user client_id

  let subscriptions_to = fun (game_id : GameId.t) (kind : subscription_kind) : IntSet.t ->
      match Hashtbl.find_opt game_to_clients (kind, game_id) with
      | Some clients -> clients
      | None -> IntSet.empty

  let is_subscribed = fun (user : Models.MinimalUser.t) : bool ->
      Hashtbl.mem user_to_client user

  let subscription_of = fun ~(client_id : int) : (subscription_kind * GameId.t) ->
      match Hashtbl.find_opt client_to_game client_id with
      | Some (kind, game) -> kind, game
      | None -> raise Not_found
end


include SubscriptionManager
