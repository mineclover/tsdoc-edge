#!/bin/bash

# Fix null to undefined for optional fields
for file in src/__tests__/generator/*.test.ts; do
  sed -i '' 's/summary: null,/\/\/ summary omitted (undefined),/g' "$file"
  sed -i '' 's/responsibility: null,/\/\/ responsibility omitted (undefined),/g' "$file"
  sed -i '' 's/contract: null,/\/\/ contract omitted (undefined),/g' "$file"
done

echo "Fixed optional field assignments"
