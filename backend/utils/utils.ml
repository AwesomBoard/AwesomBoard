(** We want to have let* and let+ from Lwt (respectively, monadic bind and applicative map) *)
include Lwt.Syntax

(** A set of integers *)
module IntSet = Set.Make(Int)

(** A set of strings *)
module StringSet = Set.Make(String)

module Caqti = Caqti
module Crypto = Crypto
module JSON = JSON
module DreamUtils = DreamUtils
module External = External
module Errors = Errors
module Id = Id
module GameId = GameId
