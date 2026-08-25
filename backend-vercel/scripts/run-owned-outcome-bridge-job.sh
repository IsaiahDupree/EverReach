#!/bin/zsh

set -euo pipefail
umask 077

if [[ -n "${OWNED_OUTCOME_ENV_FILE:-}" ]]; then
  if [[ "$OWNED_OUTCOME_ENV_FILE" != /* || -L "$OWNED_OUTCOME_ENV_FILE" \
    || ! -f "$OWNED_OUTCOME_ENV_FILE" || ! -r "$OWNED_OUTCOME_ENV_FILE" ]]; then
    print -u2 -- '{"status":"blocked","error":"OWNED_OUTCOME_ENV_FILE must be an absolute, readable, non-symlink regular file"}'
    exit 78
  fi
  env_file_uid="$(stat -f '%u' "$OWNED_OUTCOME_ENV_FILE")"
  env_file_mode="$(stat -f '%Lp' "$OWNED_OUTCOME_ENV_FILE")"
  if [[ "$env_file_uid" != "$EUID" ]] || (( (8#$env_file_mode & 8#077) != 0 )); then
    print -u2 -- '{"status":"blocked","error":"OWNED_OUTCOME_ENV_FILE must be owned by the current user with no group/world permissions"}'
    exit 78
  fi
  set -a
  source "$OWNED_OUTCOME_ENV_FILE"
  set +a
fi

required_names=(
  OWNED_OUTCOME_NODE_BIN
  OWNED_OUTCOME_SUPABASE_URL
  OWNED_OUTCOME_SUPABASE_SERVICE_ROLE_KEY
  CONTENT_QUALITY_URL
  'CONTENT_QUALITY_''CONTROL_TOKEN'
  OWNED_OUTCOME_BRIDGE_STATE_DB
  OWNED_OUTCOME_RUN_STATUS_FILE
)
missing_names=()
for required_name in "${required_names[@]}"; do
  if [[ -z "${(P)required_name-}" ]]; then
    missing_names+=("$required_name")
  fi
done
if (( ${#missing_names[@]} > 0 )); then
  print -u2 -- "{\"status\":\"blocked\",\"error\":\"missing required environment\",\"names\":\"${(j:,:)missing_names}\"}"
  exit 78
fi
if [[ "$OWNED_OUTCOME_BRIDGE_STATE_DB" != /* \
  || "$OWNED_OUTCOME_RUN_STATUS_FILE" != /* ]]; then
  print -u2 -- '{"status":"blocked","error":"bridge state and run status paths must be absolute"}'
  exit 78
fi
if [[ "$OWNED_OUTCOME_NODE_BIN" != /* || ! -x "$OWNED_OUTCOME_NODE_BIN" ]]; then
  print -u2 -- '{"status":"blocked","error":"OWNED_OUTCOME_NODE_BIN must be an absolute executable file"}'
  exit 78
fi

script_dir="${0:A:h}"
status_dir="${OWNED_OUTCOME_RUN_STATUS_FILE:h}"
mkdir -p "$status_dir"
temporary_status="$(mktemp "${OWNED_OUTCOME_RUN_STATUS_FILE}.tmp.XXXXXX")"
trap 'rm -f "$temporary_status"' EXIT INT TERM

exit_status=0
"$OWNED_OUTCOME_NODE_BIN" "$script_dir/owned-outcome-bridge.mjs" "$@" >"$temporary_status" 2>&1 \
  || exit_status=$?
mv "$temporary_status" "$OWNED_OUTCOME_RUN_STATUS_FILE"
trap - EXIT INT TERM
exit "$exit_status"
