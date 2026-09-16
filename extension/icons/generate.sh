#!/bin/sh
# Rasterizes icon.svg to the PNG sizes manifest.json declares. Re-run after
# editing icon.svg; the PNGs are committed since a Chrome extension can't
# reference an SVG in its manifest icon fields.
set -e
cd "$(dirname "$0")"
for size in 16 32 48 128; do
  magick -background none icon.svg -resize "${size}x${size}" "icon${size}.png"
done
