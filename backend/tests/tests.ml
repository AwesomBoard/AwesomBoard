let () =
    (* Need to initialize crypto for some tests *)
    Mirage_crypto_rng_lwt.initialize (module Mirage_crypto_rng.Fortuna);
    Backend.Options.emulator := false;
    Lwt_main.run @@ Alcotest_lwt.run "unit tests" @@ List.concat [
        UtilsTests.tests;
        DomainTests.tests;
        StatsTests.tests;
        GoogleCertificatesTests.tests;
        JwtTests.tests ();
        TokenRefresherTests.tests;
        FirestorePrimitivesTests.tests;
        FirestoreTests.tests;
        AuthTests.tests;
        CorsTests.tests;
        ConfigRoomEndpointTests.tests;
        GameEndpointTests.tests;
        ServerUtilsTests.tests;
        EloTests.tests;
    ]
