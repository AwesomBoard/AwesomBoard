#!/bin/sh
ARGS="$*"
npx firebase emulators:exec --only firestore,auth,database --project 'my-project' "ng serve --configuration local $ARGS" --ui
