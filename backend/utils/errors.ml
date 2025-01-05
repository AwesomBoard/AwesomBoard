(** [UnexpectedError reason] is raised upon unexpected errors *)
exception UnexpectedError of string

(** [DocumentNotFound path] is raised when a firestore document is missing. This will
    result in a [`Not_Found] response from our end *)
exception DocumentNotFound of string

(** [DocumentInvalid path] is raised when a firestore document exists but can't be
    converted to the proper type. This will result in a [`Not_Found] response from
    our end, as it's like the document does not exist. *)
exception DocumentInvalid of string

(** [BadInput input] is raised when the client did not include the correct information
    as part of their request *)
exception BadInput of string
