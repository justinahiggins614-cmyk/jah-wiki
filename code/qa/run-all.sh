#!/bin/sh
# code/qa/run-all.sh — run every JAH Wiki QA checker. Exit 1 if any fails.
set -u
cd "$(dirname "$0")"
fail=0
for c in link-check count-check dupe-id-check missing-id-check; do
  echo "=== $c ==="
  node "$c.js" || fail=1
  echo
done
if [ "$fail" = "1" ]; then echo "QA: FAIL"; else echo "QA: ALL PASS"; fi
exit "$fail"
