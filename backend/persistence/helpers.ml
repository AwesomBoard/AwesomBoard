open Utils
open Caqti
open Models

module MinimalUserSql = struct
    let t : MinimalUser.t Caqti_type.t =
        let make = fun (id : string) (name : string) : MinimalUser.t ->
            MinimalUser.{ id; name } in
        product make
        @@ proj string (fun (u : MinimalUser.t) -> u.id)
        @@ proj string (fun (u : MinimalUser.t) -> u.name)
        @@ proj_end

    end
