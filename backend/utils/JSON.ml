include Yojson.Safe

(** We need conversion functions from and to JSON.t to be able to include a
    JSON.t inside another type that we want to convert *)
let to_yojson = fun (json : t) : t -> json
let of_yojson = fun (json : t) : (t, string) result -> Ok json

(** Helper to define conversion for enum-like variants, as ppx-yojson's
    conversion is not what we want here.  [for_enum [value, json_value; ...]]
    provide conversion functions that transform the OCaml value [value] into
    the JSON value [json_value], and vice-versa. *)
let for_enum = fun (values : ('a * t) list) : (('a -> t) * (t -> ('a, string) result)) ->
    let inversed_values = List.map (fun (x, y) -> (y, x)) values in
    let enum_to_yojson = fun (v : 'a) : t -> List.assoc v values in
    let enum_of_yojson = fun (json : t) : ('a, string) result ->
        match List.assoc_opt json inversed_values with
        | Some v -> Ok v
        | None -> Error
                      (Printf.sprintf
                           "%s not a member of the enum [%s]"
                           (to_string json)
                           (values |> List.map snd |> List.map to_string |> String.concat ","))
    in
    (enum_to_yojson, enum_of_yojson)
