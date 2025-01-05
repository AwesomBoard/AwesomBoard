(** We want to have let* denote a monadic operation from Lwt in order to have more readability *)
let ( let* ) = Lwt.bind

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
