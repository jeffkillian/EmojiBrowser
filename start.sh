#!/bin/bash

echo "🚀 Starting EmojiBrowser..."
echo ""

# Check if emojis directory exists
if [ ! -d "emojis" ]; then
    echo "❌ Error: 'emojis' directory not found!"
    echo ""
    echo "Please create an 'emojis' directory and add your emoji images:"
    echo "  mkdir emojis"
    echo "  cp /path/to/your/images/* emojis/"
    echo ""
    exit 1
fi

# Check if emojis directory has files
if [ -z "$(ls -A emojis)" ]; then
    echo "❌ Error: 'emojis' directory is empty!"
    echo ""
    echo "Please add your emoji images to the 'emojis' directory:"
    echo "  cp /path/to/your/images/* emojis/"
    echo ""
    exit 1
fi

# Generate HTML if it doesn't exist or emojis changed
if [ ! -f "emoji_browser.html" ] || [ "emojis" -nt "emoji_browser.html" ]; then
    echo "📝 Generating HTML with emoji data..."
    ./generate_html.sh
    if [ $? -ne 0 ]; then
        echo "❌ Failed to generate HTML"
        exit 1
    fi
    echo ""
fi

echo "✓ Ready to go!"
echo ""
echo "🌐 Starting server on http://localhost:8000"
echo "   Press Ctrl+C to stop"
echo ""

# Start the server
node start_server.js
