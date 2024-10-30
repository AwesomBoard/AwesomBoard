#!/bin/sh
if [ "$1" != "skip" ]; then
    ./scripts/update-translations.sh
fi

if python ./scripts/check-translations.py script; then
    echo 'Translations are OK!'
    echo 'Generating fr.json'
    BEFORE=$(sha256sum src/assets/fr.json)
    npx xlf-merge translations/messages.fr.xlf --convert json -o src/assets/fr.json
    AFTER=$(sha256sum src/assets/fr.json)
    rm -f translations/messages.fr.json
    if [ "$BEFORE" != "$AFTER" ]; then
        echo 'src/assets/fr.json has been updated, please add it to your commit'
        exit 1 # We fail here for the CI pipeline
    fi
    exit 0 # Success
else
    echo 'Translations are not finalized'
    exit 1 # Failure
fi
