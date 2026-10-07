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

# Messages as GitHub annotations, so they show on the run page and through the API.
note() { echo "$*"; [ -n "${GITHUB_ACTIONS:-}" ] && echo "::warning::$*" || true; }
fail() { echo "$*"; [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error::$*" || true; exit 1; }

get() { # get URL OUTFILE — tries a contact user agent, then a browser one (bls.gov blocks bare curl)
  local url="$1" out="$2"
  local code
  for ua in "$UA_CONTACT" "$UA_BROWSER"; do
    code=$(curl -sSL --retry 2 -A "$ua" -H "Accept-Language: en-US,en;q=0.9" -H "Accept: */*" -o "$out" -w '%{http_code}' "$url" || echo "000")
    if [ "$code" = "200" ]; then echo "ok   $url"; return 0; fi
    note "HTTP $code for $url (user agent: ${ua%% *})"
  done
  return 1
}

# --- O*NET: find the newest database on the download page. Text (tab-delimited)
# files are preferred; recent releases may only offer Excel, which the build script also reads.
onet_page=$(curl -fsSL -A "$UA_CONTACT" https://www.onetcenter.org/database.html) || fail "Could not open the O*NET download page"
pick() { printf '%s' "$onet_page" | grep -oE "db_[0-9]+_[0-9]+_$1\.zip" | sort -uV | tail -1 || true; }
onet_file=$(pick text); [ -n "$onet_file" ] || onet_file=$(pick excel)
[ -n "$onet_file" ] || fail "Could not find an O*NET text or Excel zip link"
get "https://www.onetcenter.org/dl_files/database/${onet_file}" onet.zip || fail "O*NET download failed"
note "O*NET: $onet_file"
rm -rf onet && mkdir onet
unzip -q -j onet.zip -d onet
echo "$onet_file" > onet/VERSION.txt
rm onet.zip

# --- BLS files. bls.gov blocks downloads from cloud servers (including GitHub's), so these
# usually come from source-data/bls/ in the repo, where they're added by hand once a year:
#   - OEWS national zip (e.g. oesm24nat.zip): https://www.bls.gov/oes/tables.htm → "National" → XLS
#   - Employment Projections: https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx
# A direct download is still tried first, in case it works from where this runs.
BLS_IN="../source-data/bls"
rm -rf oews && mkdir oews
oews_zip=$(ls "$BLS_IN"/oesm*nat.zip 2>/dev/null | sort -V | tail -1 || true)
oews_xlsx=$(ls "$BLS_IN"/national_M*_dl.xlsx 2>/dev/null | sort -V | tail -1 || true)
year=$(date +%y); got=""
for y in $((10#$year)) $((10#$year - 1)); do
  if get "https://www.bls.gov/oes/special-requests/oesm${y}nat.zip" oews.zip; then got="20$y"; unzip -q -j oews.zip -d oews; rm oews.zip; break; fi
done
if [ -z "$got" ] && [ -n "$oews_zip" ]; then
  unzip -q -j "$oews_zip" -d oews; got="20$(basename "$oews_zip" | grep -oE '[0-9]{2}' | head -1)"
elif [ -z "$got" ] && [ -n "$oews_xlsx" ]; then
  cp "$oews_xlsx" oews/; got=$(basename "$oews_xlsx" | grep -oE '20[0-9]{2}' | head -1)
fi
if [ -n "$got" ]; then echo "May $got" > oews/VERSION.txt; note "OEWS: May $got"
else note "No BLS OEWS wage file. Add one to source-data/bls/ (see README) to build careers."; fi

# --- BLS Employment Projections (optional: growth, openings, education)
get "https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx" ep-occupation.xlsx \
  || { [ -f "$BLS_IN/occupation.xlsx" ] && cp "$BLS_IN/occupation.xlsx" ep-occupation.xlsx && note "Employment Projections: from source-data/bls"; } \
  || { rm -f ep-occupation.xlsx; note "No Employment Projections file; growth will be left out"; }

ls -la . onet oews | head -80
