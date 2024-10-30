open Alcotest
open TestUtils
open Backend
open Utils

module type MOCK = sig
    include Jwt.JWT

    val validate_token : bool ref

end

module Mock = struct
    include Jwt.Make(ExternalTests.Mock)

    let validate_token = ref false

    let verify_and_get_uid token _ _ =
        let open JSON.Util in
        if !validate_token
        then Some (to_string (member "sub" token.payload))
        else None
end

module Jwt = Jwt.Make(ExternalTests.Mock)


let b64_of_json (json : JSON.t) : string = Dream.to_base64url (JSON.to_string json)

let jwt : Jwt.t testable =
    let pp_jwt ppf jwt = Fmt.pf ppf "%s, %s, %s"
            (JSON.to_string Jwt.(jwt.header))
            (JSON.to_string Jwt.(jwt.payload))
            (Dream.to_base64url Jwt.(jwt.signature))
    in
    testable pp_jwt (=)


(* Some private key used to sign tokens (not used anywhere in production) *)
let private_key_str = "-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCw1btIPHNumh1t
MtkJlTa8rEfazG7p/1SG6Efe2rkIJBqZEOLIBRVocUhDciBKwbujkntHiuUoe9N7
WFcUQWyx5XKZP5B050Tvwn6y4xHonXvcFK4UWSqKmGzKC1XA3BxrdUuHDSxRZmtg
HvW0vmqwACnogK36up83RYZYEuO971rJk70tVrnGCviieJmT40/lFI/KqYB4KFj+
ZxlOOaIQXNjDCvR9vyUjdoCWTkN1bNTc+S9FiWBxhi8FBTM6vkw/WJ+pDLWsep+O
PlnUL/FuuCk+ezBwCeED7WoroYVCzEY3B4Nc1z9Hu1lRNLs20amsdhQKyIgxcU7a
iz4AnCkNAgMBAAECggEAEeYYVkf0ISJNTzPB3yPwzekcPsvJgDrdaehR+f8mkmnh
HVQluDw3fgJVX6pKFXcFkJlvi/7FkjLyZX48FitHHryMPHHAI+0Sv7fujhnIwsRJ
+K1JL3sVAMFL5al/DQ3afI/7TJirPzQAM1L+6MQLVXQ2ybdYpNPF8NjDL9/9mEha
LL5cclSeZ1mAD8eVrBPHTl32jCGo/Year6kj1aBY2ijJmIzAEy0vD1ytYH4oJEHt
Adc6nbljz1P5DrYV55dIorwW52tNqtZzWEbenhe6IwDqzT4mNGaQSGXYH8C4uvuR
Vc3ziY2HJNU1pVJv1FAu8Fw5ZQcDNPkRYvmM0M2Q0QKBgQDniQCK/rQ2Ky0iZdzw
gchO6GecHxxXp8ejaGVwLrhz3muXgrE/G/2cOEbgPAZLSowUA+1Ng9iI4La4JzGm
hYGILNGJ74/JO13LaxzCUqag0KVGKgHN3XUXpEuRLx520gQhPC1q33ijC+xTOdvJ
tEvadeagy8Flp6rhWCu1xStxmQKBgQDDhRf71lV0xH3hnE+AQOGBm8euGroYWN++
7y4UiJpX38tAT+iv4qStni+UHMiScTqCEVLfndauIPW7kowSonlxbUmQWazj3nVe
9pGIL7ozveQLOpD8b9t65fJec/q7F9+nbP759pqTHKusojyhXSpHXhxg2O+zVf5L
i/JJS1hDlQKBgQCPXWGcr0HfGLUFy5UWxwXE9lrRbOIb1KPlJstIv2UvOdXdJuuh
bC+I/7/DMOekzzAVZKkXikAV4S7CsGIp/hjKvRWyF0gtDjlxr41LNeo/QXJVE8Wy
NyI91VmFOGvgnwI3og9tUZpdOxDGJ9lT9/PP/Zkkj4Xc8Aj7J6FJGCFiYQKBgQC3
HXin6UYh1UFcQmwG3z0UiRSLkAaIdPwgs5uBqap78GJIek6gI/E9lbBT1F1ZIei9
FoJ6YjZE4SOkKA0+CqMYw1Upd4M/6wIcDWuhk6mdehQRHCnb8tspECFdqtvBzAsw
oBlxfC+q5ig2x79nFX1aV97WKXbdjAVdNdWWJZWlvQKBgEjwoUPiV3cwf9L7qhHe
iXRkSzWYJsL3Kp3uZyPMwvgpu3nq6U6CzJIEvjMQKp+PGH1CpjbfAA8mHxZtFSVX
h9IaRp8KW+Z7gik0lu4UDkoeMc9HLdkG60LY5mMLSe64cObbZ8q1xwTidsY0Fw6+
a720UxBIZrGsdffHKHoyceuO
-----END PRIVATE KEY-----"

(* The corresponding public key *)
let public_key_str = "-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsNW7SDxzbpodbTLZCZU2
vKxH2sxu6f9UhuhH3tq5CCQamRDiyAUVaHFIQ3IgSsG7o5J7R4rlKHvTe1hXFEFs
seVymT+QdOdE78J+suMR6J173BSuFFkqiphsygtVwNwca3VLhw0sUWZrYB71tL5q
sAAp6ICt+rqfN0WGWBLjve9ayZO9LVa5xgr4oniZk+NP5RSPyqmAeChY/mcZTjmi
EFzYwwr0fb8lI3aAlk5DdWzU3PkvRYlgcYYvBQUzOr5MP1ifqQy1rHqfjj5Z1C/x
brgpPnswcAnhA+1qK6GFQsxGNweDXNc/R7tZUTS7NtGprHYUCsiIMXFO2os+AJwp
DQIDAQAB
-----END PUBLIC KEY-----"

let public_key_id = "032cc1cb289dd4626a435d72989ae43212defe78"

let get_rsa = function
    | `RSA k -> k
    | _ -> failwith "Invalid key"

let tests () =

    let private_key = private_key_str |> X509.Private_key.decode_pem |> Result.get_ok |> get_rsa in

    let public_key = public_key_str |> X509.Public_key.decode_pem |> Result.get_ok |> get_rsa in

    (* Some identity token *)
    let identity_token =
        let header = `Assoc [
            "alg", `String "RS256";
            "kid", `String "032cc1cb289dd4626a435d72989ae43212defe78";
            "typ", `String "JWT";
        ] in
        let payload = `Assoc [
            "iss", `String "https://securetoken.google.com/everyboard-test";
            "aud", `String "everyboard-test";
            "auth_time", `Int 1677936149;
            "user_id", `String "wECcuMPVQHO9VSs7bgOL5rLxmPD2";
            "sub", `String "wECcuMPVQHO9VSs7bgOL5rLxmPD2";
            "iat", `Int 1702952401;
            "exp", `Int 1702956001;
            "email", `String "abc@def.com";
            "email_verified", `Bool false;
            "firebase", `Assoc [
                "identities", `Assoc [
                    "email", `List [`String "abc@def.com"]
                ];
                "sign_in_provider", `String "password";
            ];
        ] in
        let to_sign = (b64_of_json header) ^ "." ^ (b64_of_json payload) in
        let signature = Mirage_crypto_pk.Rsa.PKCS1.sign ~hash:`SHA256 ~key:private_key (`Message to_sign) in
        Printf.printf "verify: %b\n%!" (Mirage_crypto_pk.Rsa.PKCS1.verify ~hashp:(function _ -> true) ~key:public_key ~signature (`Message to_sign));
        (* signature = Option.get (Dream.from_base64url "w356bi9Dwx9gGqORRfOwKSPLhq21XyiE7V1pmqnNxpUsQJeKRlHz9vi8QeJDwFT1dTkt79pVRacqd2w4G52tjNv7Khf6aRx6arbBtWfqLBNzbzD-US2iQFkPnXy_EkJma-YGTGbUSly6Ry9vd0axiUAvUkJ_DD1Ig1ySeYLMzeVkf501MZHshn7FO4Gx27DeLEQOLebNR9wJW4YnFN1lzyD4FM8KMpkgrpe7QQdoKNtG01aG96musc0YW0LofXN8_oQILg2Ocpnm9GLtSoUy7XNSqmQzgjiDvCR9xrPKMoPHmLcWZdrsTwTzLda9q4g0-RFGzA1yV1JMKzfY9qoRgQ"); *)
        Jwt.{ header; payload; signature } in

    let identity_token_str = Jwt.to_string identity_token in

    (* Some signed token *)
    let signed_token =
        let header = `Assoc [
            "alg", `String "RS256";
            "typ", `String "JWT";
        ] in
        let payload = `Assoc [
            "iss", `String "foo@bar.com";
            "scope", `String "scope1 scope2";
            "aud", `String "audience";
            "exp", `Int 1702956001;
            "iat", `Int 1702952401;
        ] in
        let to_sign = (b64_of_json header) ^ "." ^ (b64_of_json payload) in
        let signature = Mirage_crypto_pk.Rsa.PKCS1.sign ~hash:`SHA256 ~key:private_key (`Message to_sign) in
        Jwt.{
            header;
            payload;
            signature;
        } in

    [

        "Jwt.make", [
            test "should construct a token" (fun () ->
                ExternalTests.Mock.current_time_seconds := 1702952401;
                (* When constructing a token *)
                let actual = Jwt.make "foo@bar.com" private_key ["scope1"; "scope2"] "audience" in
                (* Then it should be constructed as expected *)
                let expected = signed_token in
                check jwt "success" expected actual
            );
        ];

        "Jwt.to_string", [
            test "should construct the expected string representation" (fun () ->
                (* Given a token *)
                (* When converting it to a string *)
                let actual = Jwt.to_string signed_token in
                (* Then it should provide the expected representation *)
                let expected = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmb29AYmFyLmNvbSIsInNjb3BlIjoic2NvcGUxIHNjb3BlMiIsImF1ZCI6ImF1ZGllbmNlIiwiZXhwIjoxNzAyOTU2MDAxLCJpYXQiOjE3MDI5NTI0MDF9.eD9JfdUZilJiJoLDy7HayU1nU-6XD1BxzDHtZRlNhxgmldIcMtWSt6RWPIsF259G9DzZAH6hBmWfKY5RqYyC0i98G6nbM443AcfyzVd8JRY-lGoz7f79k6XRHHp4Z0zutMKfW70O9ZTGKx4tQaCLW4H_9Pcc_FK-Ugv_yjc4Syn858pxPvlj7J6xC_QRn1sgQzey-2gCJNqRBGDVwsdGHdXBJcn5CfvBIauFPktImPCPajA6mhS8Z_wStEjSJ6t0BrCpTiPrCyJgAUNhhIKlTTlMR4eQ21Q5SJw_aMJ82moEbamRJsnTNnCbyuz57KoQZSp7iFI5nJZTmiaGzYa7xQ" in
                check string "success" expected actual
            );
        ];

        "Jwt.parse", [
            test "should succeed on a valid identity token" (fun () ->
                (* Given a valid identity token string representation *)
                (* When parsing it *)
                let actual = Jwt.parse identity_token_str in
                (* Then it should provide the expected token *)
                let expected = Some identity_token in
                check (option jwt) "success" expected actual
            );

            test "should fail on an invalid identity token" (fun () ->
                (* Given an invalid identity token string representation *)
                let invalid_token = "invalid token!"  in
                (* When parsing it *)
                let actual = Jwt.parse invalid_token in
                (* Then it should fail *)
                let expected = None in
                check (option jwt) "failure" expected actual
            );

            test "should fail on a base64-encoded invalid identity token" (fun () ->
                (* Given an invalid identity token string representation *)
                let invalid_token = "TUdQ.SmVhbkphamE=.cnVsZXo="  in
                (* When parsing it *)
                let actual = Jwt.parse invalid_token in
                (* Then it should fail *)
                let expected = None in
                check (option jwt) "failure" expected actual
            );
        ];

        "Jwt.verify_and_get_uid",
        begin
            let now = 1702956000 in
            ExternalTests.Mock.current_time_seconds := now;
            let replace_assoc (json : JSON.t) (field : string) (replacement : JSON.t) : JSON.t = match json with
                | `Assoc assoc ->
                    `Assoc ((field, replacement) :: (List.remove_assoc field assoc))
                | _ -> failwith "replace_assoc called without an assoc" in
            [
                test "should succeed on a valid token" (fun () ->
                    (* Given a valid token *)
                    (* When verifying it and extracting the uid *)
                    let actual = Jwt.verify_and_get_uid identity_token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should provide the expected uid *)
                    let expected = Some "wECcuMPVQHO9VSs7bgOL5rLxmPD2" in
                    check (option string) "success" expected actual
                );

                test "should succeed with emulator tokens" (fun () ->
                    (* Given an emulator token, and the emulator mode being on *)
                    Options.emulator := true;
                    (* When verifying it and extracting the uid *)
                    let emulator_token : Jwt.t = {
                        identity_token with
                        header = `Assoc [
                            "alg", `String "none";
                            "typ", `String "JWT";
                        ];
                        signature = "";
                    } in
                    let actual = Jwt.verify_and_get_uid emulator_token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should provide the expected uid *)
                    let expected = Some "wECcuMPVQHO9VSs7bgOL5rLxmPD2" in
                    check (option string) "success" expected actual;
                    Options.emulator := false
                );

                test "should fail if alg is not RS256" (fun () ->
                    (* Given an invalid token due to invalid algorithm used *)
                    let token = { identity_token with header = replace_assoc identity_token.header "alg" (`String "foo") } in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if kid is not a known key" (fun () ->
                    (* Given no keys to use in verification *)
                    let keys = [] in
                    (* When verifying a token *)
                    let actual = Jwt.verify_and_get_uid identity_token "everyboard-test" keys in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if token is expired" (fun () ->
                    (* Given an expired token *)
                    let token = { identity_token with payload = replace_assoc identity_token.payload "exp" (`Int (now - 100000)) } in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if token is issued in the future" (fun () ->
                    (* Given a token issued in the future *)
                    let token = { identity_token with payload = replace_assoc identity_token.payload "iat" (`Int (now + 1000)) } in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if audience is not the project id" (fun () ->
                    (* Given a token with an audience different from the project id *)
                    let project_id = "another-project" in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid identity_token project_id [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if issuer is not the expected url" (fun () ->
                    (* Given a token with a wrong issuer url *)
                    let token = { identity_token with payload = replace_assoc identity_token.payload "iss" (`String "http://other") } in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if subject is empty" (fun () ->
                    (* Given a token with an empty subject *)
                    let token = { identity_token with payload = replace_assoc identity_token.payload "sub" (`String "") } in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if authentication time is in the future" (fun () ->
                    (* Given a token with an authentication time in the future *)
                    let token = { identity_token with payload = replace_assoc identity_token.payload "auth_time" (`Int (now + 1000)) } in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if signature is invalid" (fun () ->
                    (* Given a token with an invalid signature *)
                    let token = { identity_token with signature = "foo" } in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );

                test "should fail if signature is not using SHA256" (fun () ->
                    let sha224_signature = "Qwa2V6lxKUua-Mc-pt--w7vTwnkaPZI2MGT7C3_yubz8vRy7vUPOJdUOyGrhc1Dw76uR7JSI8niqisE1NryvVTKoEqfXBNjxEVHSoeX-wbRzXnJILnTPLqi323-LgHsnc8EvRUs2_t5AoOA4T85DEZxbUugpcg332Kk2t4USBMDw7zIIu2QoHxuh1DoYlhmAd89tVg9ucNd4tNSx--Yf5GtOWq0SuoDwjaX_OA-43s61aoE2Y6XUrxmPYkBfpHOsIl5CJdh6vl9v-7SKRUDAIZMWx8GhDM9LSOR7nQ9ywIxZAWQ-x9bl3MIPfx6JHVWmfelF0goZkTNxQc7vrnr8BQ==" in
                    (* Given a token with a SHA-224 signature instead of SHA-256 *)
                    let token = { identity_token with signature = Option.get (Dream.from_base64url sha224_signature) } in
                    (* When verifying it *)
                    let actual = Jwt.verify_and_get_uid token "everyboard-test" [(public_key_id, public_key)] in
                    (* Then it should fail *)
                    let expected = None in
                    check (option string) "failure" expected actual
                );
            ]
        end;

    ]
