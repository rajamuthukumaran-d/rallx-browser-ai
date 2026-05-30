#!/bin/bash
# package.sh - Packaging script for Firefox Add-on Store

FILENAME="rallx-browser-ai.zip"
BUILD_DIR="build"

echo "Packaging Rallx Browser AI..."

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Remove existing zip from build directory
rm -f "$BUILD_DIR/$FILENAME"

# Zip the necessary files
# -r: recursive
# -x: exclude patterns (using quotes to ensure shell doesn't expand them prematurely)
# Use "*.DS_Store" to catch them in any directory
zip -r "$BUILD_DIR/$FILENAME" \
    manifest.json \
    src/ \
    assets/ \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "package.sh" \
    -x "prd.md" \
    -x "GEMINI.md" \
    -x "README.md" \
    -x "CLAUDE.md" \
    -x ".prettierignore" \
    -x ".gitignore" \
    -x "build/*"

echo "-------------------------------------------"
echo "Done! Package created: $BUILD_DIR/$FILENAME"
echo "You can now upload this file to the Firefox Add-on Hub."