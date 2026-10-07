#!/usr/bin/env bash
# Downloads the public data the career list is built from, into data/.
#   - O*NET database (text files): what each job involves, interests, work context.
#     https://www.onetcenter.org/database.html  (CC BY 4.0, U.S. Department of Labor)
#   - BLS OEWS national wages: pay percentiles and employment for every occupation.
#     https://www.bls.gov/oes/tables.htm
#   - BLS Employment Projections: growth, openings, and typical education.
#     https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm
# Run from the repo root: bash tools/fetch-data.sh
set -euo pipefail
mkdir -p data
cd data

UA_CONTACT="CareerCombine data build (+https://github.com/bjohnso88/career-combine)"
UA_BROWSER="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"

get() { # get URL OUTFILE — tries a contact user agent, then a browser one (bls.gov blocks bare curl)
  local url="$1" out="$2"
  for ua in "$UA_CONTACT" "$UA_BROWSER"; do
    if curl -fsSL --retry 2 -A "$ua" -H "Accept-Language: en-US,en;q=0.9" -H "Accept: */*" -o "$out" "$url"; then
      echo "ok   $url"; return 0
    fi
  done
  echo "FAIL $url"; return 1
}

# --- O*NET: find the newest text-format database on the download page
onet_page=$(curl -fsSL -A "$UA_CONTACT" https://www.onetcenter.org/database.html)
onet_path=$(printf '%s' "$onet_page" | grep -oE '/dl_files/database/db_[0-9]+_[0-9]+_text\.zip' | sort -V | tail -1)
[ -n "$onet_path" ] || { echo "Could not find the O*NET text zip link"; exit 1; }
get "https://www.onetcenter.org${onet_path}" onet.zip
rm -rf onet && mkdir onet
unzip -q -j onet.zip -d onet
echo "$onet_path" > onet/VERSION.txt
rm onet.zip

# --- BLS OEWS national file: newest year that exists (May data, released the next spring)
year=$(date +%y)
got=""
for y in $((10#$year)) $((10#$year - 1)) $((10#$year - 2)); do
  if get "https://www.bls.gov/oes/special-requests/oesm${y}nat.zip" oews.zip; then got=$y; break; fi
done
[ -n "$got" ] || { echo "Could not download BLS OEWS national data"; exit 1; }
rm -rf oews && mkdir oews
unzip -q -j oews.zip -d oews
echo "May 20${got}" > oews/VERSION.txt
rm oews.zip

# --- BLS Employment Projections (optional: growth, openings, education)
get "https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx" ep-occupation.xlsx || echo "Employment Projections skipped"

ls -la . onet oews | head -80
