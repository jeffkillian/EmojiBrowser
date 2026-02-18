#!/bin/bash

# Script to generate the final HTML and JS with emoji data embedded

# Read emoji directory from config.json
EMOJI_DIR=$(node -e "console.log(require('./config.json').emojiDirectory)")

# Expand ~ to home directory if present
if [[ "$EMOJI_DIR" == "~/"* ]]; then
    EMOJI_DIR="${HOME}/${EMOJI_DIR#~/}"
fi

if [ ! -d "$EMOJI_DIR" ]; then
    echo "Error: Emoji directory '$EMOJI_DIR' not found!"
    echo "Please check your config.json or create the directory and add your emoji images to it."
    exit 1
fi

echo "Generating emoji data from '$EMOJI_DIR'..."

# Create list of emoji files in emoji directory (not subdirectories)
# Only look at files directly in the directory, not nested folders
find "$EMOJI_DIR" -maxdepth 1 -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.gif" -o -iname "*.svg" \) | sed "s|^$EMOJI_DIR/||" | sort > emoji_list.txt

# Generate properly formatted JSON array
cat emoji_list.txt | awk 'BEGIN {print ""} {
    filename = $0
    name = $0
    sub(/\.[^.]*$/, "", name)
    gsub(/\\/, "\\\\", name)
    gsub(/"/, "\\\"", name)
    gsub(/\\/, "\\\\", filename)
    gsub(/"/, "\\\"", filename)
    if (NR > 1) print ","
    printf "            \"%s\"", filename
} END {print ""}' > emoji_array.txt

# Insert emoji data into JS template
sed -e '/EMOJI_DATA_PLACEHOLDER/r emoji_array.txt' -e '/EMOJI_DATA_PLACEHOLDER/d' app.js > emoji_browser.js

# Update HTML template to use emoji_browser.js instead of app.js
sed 's/app\.js/emoji_browser.js/g' index.html > emoji_browser.html

# Count emojis
EMOJI_COUNT=$(wc -l < emoji_list.txt | tr -d ' ')

# Save the config used for this generation
cp config.json .last-generation-config.json

echo "✓ Generated emoji_browser.html and emoji_browser.js with $EMOJI_COUNT emojis"
echo "✓ You can now start the server with: node start_server.js"
