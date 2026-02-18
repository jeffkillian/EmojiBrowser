#!/bin/bash

# Script to generate the final HTML with emoji data embedded

if [ ! -d "emojis" ]; then
    echo "Error: 'emojis' directory not found!"
    echo "Please create an 'emojis' directory and add your emoji images to it."
    exit 1
fi

echo "Generating emoji data..."

# Create list of emoji files
ls emojis | sort > emoji_list.txt

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

# Insert emoji data into HTML template
sed -e '/EMOJI_DATA_PLACEHOLDER/r emoji_array.txt' -e '/EMOJI_DATA_PLACEHOLDER/d' index.html > emoji_browser.html

# Count emojis
EMOJI_COUNT=$(wc -l < emoji_list.txt | tr -d ' ')

echo "✓ Generated emoji_browser.html with $EMOJI_COUNT emojis"
echo "✓ You can now start the server with: node start_server.js"
