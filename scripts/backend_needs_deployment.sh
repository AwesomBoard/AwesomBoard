#!/bin/sh
# Get the curent version of the backend from the source code (in the form of let version_number : string = "1.0.0" for example)
CURRENT_VERSION=$(grep -E "let version_number " backend/*.ml | grep -Eo "[0-9]+\.[0-9]+\.[0-9]+")
# Get the deployed version number, where the server is provided as an argument to the script
DEPLOYED_VERSION=$(curl -s "$1"/version)
# If versions differ, we need to redeploy
test "$CURRENT_VERSION" != "$DEPLOYED_VERSION"
