#!/bin/bash

# Script to generate the final HTML and JS with emoji data embedded

if [ ! -d "emojis" ]; then
    echo "Error: 'emojis' directory not found!"
    echo "Please create an 'emojis' directory and add your emoji images to it."
    exit 1
fi

echo "Generating emoji data..."

# Create list of emoji files recursively
# Find all files in emojis directory and subdirectories
# Remove the "emojis/" prefix to get relative paths
find emojis -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.gif" -o -iname "*.svg" \) | sed 's|^emojis/||' | sort > emoji_list.txt

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

echo "✓ Generated emoji_browser.html and emoji_browser.js with $EMOJI_COUNT emojis"
echo "✓ You can now start the server with: node start_server.js"
