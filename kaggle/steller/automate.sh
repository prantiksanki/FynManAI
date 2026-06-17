#!/usr/bin/env bash
# One-shot automation for Playground Series S6E6.
#   ./automate.sh pull     -> (re)download competition data
#   ./automate.sh train    -> run training, produce submissions/latest.csv
#   ./automate.sh submit   -> submit submissions/latest.csv to Kaggle
#   ./automate.sh score    -> show your recent submission scores
#   ./automate.sh git      -> commit & push the repo
#   ./automate.sh all      -> pull + train + submit + git   (full loop)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"
export KAGGLE_CONFIG_DIR="$HERE"
COMP="playground-series-s6e6"
PY="${PY:-C:/Users/pahar/anaconda3/envs/medimg/python.exe}"

pull() {
  echo "[pull] downloading $COMP ..."
  mkdir -p data
  kaggle competitions download -c "$COMP" -p data --force
  ( cd data && unzip -o "$COMP.zip" >/dev/null && rm -f "$COMP.zip" )
  echo "[pull] done -> data/"
}

train() {
  echo "[train] launching..."
  "$PY" train.py
}

submit() {
  local msg
  msg="$(${PY} -c "import json;print(json.load(open('submissions/latest.json'))['message'])" 2>/dev/null || echo 'auto submission')"
  echo "[submit] $msg"
  kaggle competitions submit -c "$COMP" -f submissions/latest.csv -m "$msg"
  echo "[submit] queued. Run './automate.sh score' in ~30s for the public score."
}

score() {
  kaggle competitions submissions -c "$COMP" | head -12
}

gitpush() {
  echo "[git] committing..."
  git add -A train.py automate.sh claude.md submissions/latest.json 2>/dev/null || true
  git commit -m "steller: pipeline + latest submission" || echo "[git] nothing to commit"
  git push origin "$(git rev-parse --abbrev-ref HEAD)"
}

cmd="${1:-all}"
case "$cmd" in
  pull)   pull ;;
  train)  train ;;
  submit) submit ;;
  score)  score ;;
  git)    gitpush ;;
  all)    pull; train; submit; score ;;
  *) echo "usage: $0 {pull|train|submit|score|git|all}"; exit 1 ;;
esac
