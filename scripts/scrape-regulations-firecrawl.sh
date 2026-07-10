#!/bin/bash
# Scrape Indonesian regulations using Firecrawl CLI.
# Run: npx firecrawl-cli login --browser  (first time)
# Then: ./scripts/scrape-regulations-firecrawl.sh

set -e
cd "$(dirname "$0")/.."
mkdir -p .firecrawl

echo "Searching for Indonesian environmental regulations..."
npx firecrawl-cli search "UU 32 tahun 2009 lingkungan hidup Indonesia" --limit 5 --scrape -o .firecrawl/search-uu32.json --json

npx firecrawl-cli search "Perda DKI Jakarta sampah lingkungan" --limit 5 --scrape -o .firecrawl/search-perda-dki.json --json

echo "Scraping key regulation pages..."
npx firecrawl-cli scrape "https://peraturan.go.id/id/uu-no-32-tahun-2009" -o .firecrawl/uu-32-2009.md
npx firecrawl-cli scrape "https://peraturan.go.id/id/perda-provinsi-dki-jakarta-no-1-tahun-2014" -o .firecrawl/perda-dki-1-2014.md 2>/dev/null || true

echo "Done. Output in .firecrawl/"
