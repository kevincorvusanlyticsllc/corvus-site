#!/usr/bin/env bash
# Tells Bing (and the other IndexNow engines) the site changed, so updates show up in Bing,
# ChatGPT search and Copilot within minutes. Run after a push, once GitHub Pages has rebuilt:
#   bash tools/indexnow.sh                 (every URL in sitemap.xml)
#   bash tools/indexnow.sh /corvus/        (just these paths)
# The key is public by design: it only proves this site asked. Its file is /1e630272ce5b3e4e7d5580c484fa515e.txt.
KEY=1e630272ce5b3e4e7d5580c484fa515e
HOST=corvusanalyticsllc.com
cd "$(dirname "$0")/.."
if [ $# -gt 0 ]; then
  urls=$(printf '"https://%s%s",' $(for p in "$@"; do echo "$HOST $p"; done) | sed 's/,$//')
else
  urls=$(grep -o '<loc>[^<]*</loc>' sitemap.xml | sed -E 's#</?loc>##g; s#.*#"&"#' | paste -sd, -)
fi
curl -s -o /dev/null -w 'IndexNow: HTTP %{http_code}\n' -H 'Content-Type: application/json; charset=utf-8'   -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$KEY.txt\",\"urlList\":[$urls]}"   https://api.indexnow.org/indexnow
