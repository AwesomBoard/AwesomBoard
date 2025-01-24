open Everyboard

let arguments_spec = [
    ("-project", Arg.Set_string Options.project_name, "Firebase project name");
    ("-endpoint", Arg.Set_string Options.base_endpoint, "Base endpoint of firebase server");
    ("-service-account", Arg.Set_string Options.service_account_file, "Path to the JSON file of the service account to use");
    ("-address", Arg.Set_string Options.address, "Address on which to listen for connections");
    ("-port", Arg.Set_int Options.port, "Port on which to listen for connections");
    ("-no-emulator", Arg.Clear Options.emulator, "Whether this is linked to a firebase emulator");
    ("-origin", Arg.Set_string Options.frontend_origin, "Where the frontend is hosted, for CORS");
    ("-show-errors", Arg.Set Options.show_errors, "Should error be shown in details when sent back to the client?");
]

(* This is the entry point. We parse the argument and start the server *)
let () =
    Arg.parse arguments_spec (fun _ -> ()) "backend [options]";
    Server.start ()
