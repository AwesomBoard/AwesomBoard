#!/bin/sh

# Get the list of games
grep "new GameInfo" src/app/components/normal-component/pick-game/pick-game.component.ts | sed -E "s/.*new GameInfo\([^,]+, +'([^']+)'.*/\1/" > scripts/games.txt

# Screenshot the games
python scripts/screenshot.py light || exit
mv ./*.png src/assets/images/light/

# Screenshot the games
python scripts/screenshot.py dark || exit
mv ./*.png src/assets/images/dark/

# Remove game list
rm scripts/games.txt

# And finally, square the images
for image in src/assets/images/dark/*.png src/assets/images/light/*.png; do
    python scripts/square-image.py "$image"
done
