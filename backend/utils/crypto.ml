(** We will be using RSA keys only *)
type public_key = Mirage_crypto_pk.Rsa.pub
type private_key = Mirage_crypto_pk.Rsa.priv

(** [public_key_of_certificate_string pem] extracts an RSA public key from the
    PEM string that represents a certificate. Raises [UnexpectedError] in case
    of failure. *)
let public_key_of_certificate_string = fun (pem : string) : public_key ->
    let public_key = pem |> X509.Certificate.decode_pem in
    match public_key with
    | Error _ -> raise (Errors.UnexpectedError "Invalid certificate")
    | Ok cert -> match X509.Certificate.public_key cert with
        | `RSA pk -> pk
        | _ -> raise (Errors.UnexpectedError "Certificate does not contain an RSA public key")
