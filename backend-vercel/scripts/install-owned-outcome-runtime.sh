#!/bin/zsh

set -euo pipefail
umask 077

script_dir="${0:A:h}"
backend_dir="${script_dir:h}"
label="com.everreach.owned-outcome-bridge"
runtime_dir="${OWNED_OUTCOME_RUNTIME_DIR:-$HOME/Library/Application Support/EverReach/owned-outcomes}"
runtime_env="$runtime_dir/owned-outcome.env"
agent="$HOME/Library/LaunchAgents/$label.plist"
load_agent=false

builder_args=(--output "$runtime_env")
while (( $# > 0 )); do
  case "$1" in
    --shared-env|--content-quality-env|--content-quality-url|--posthog-env|--posthog-project-env)
      if (( $# < 2 )); then
        print -u2 -- "missing value for $1"
        exit 64
      fi
      builder_args+=("$1" "$2")
      shift 2
      ;;
    --load)
      load_agent=true
      shift
      ;;
    *)
      print -u2 -- "unsupported argument: $1"
      exit 64
      ;;
  esac
done

mkdir -p "$runtime_dir" "$HOME/Library/LaunchAgents"
chmod 700 "$runtime_dir"
node "$script_dir/build-owned-outcome-runtime-env.mjs" "${builder_args[@]}"

runtime_files=(
  run-owned-outcome-bridge-job.sh
  owned-outcome-bridge.mjs
  owned-retention-producer.mjs
)
runtime_modes=(700 600 600)
for index in {1..${#runtime_files[@]}}; do
  runtime_file="${runtime_files[$index]}"
  temporary_runtime_file="$(mktemp "$runtime_dir/$runtime_file.tmp.XXXXXX")"
  cp "$script_dir/$runtime_file" "$temporary_runtime_file"
  chmod "${runtime_modes[$index]}" "$temporary_runtime_file"
  mv "$temporary_runtime_file" "$runtime_dir/$runtime_file"
done

escaped_runtime="${runtime_dir//\/\\}"
escaped_runtime="${escaped_runtime//|/\\|}"
temporary_agent="$(mktemp "$runtime_dir/$label.plist.tmp.XXXXXX")"
trap 'rm -f "$temporary_agent"' EXIT INT TERM
sed \
  -e "s|/ABSOLUTE/PRIVATE/PATH|$escaped_runtime|g" \
  "$backend_dir/ops/$label.plist.example" > "$temporary_agent"
chmod 600 "$temporary_agent"
plutil -lint "$temporary_agent" >/dev/null
mv "$temporary_agent" "$agent"
chmod 600 "$agent"
trap - EXIT INT TERM

if [[ "$load_agent" == "true" ]]; then
  launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "$agent"
  launchctl enable "gui/$(id -u)/$label"
  launchctl kickstart -k "gui/$(id -u)/$label"
fi

print -- "Owned-outcome runtime configured; launchd_loaded=$load_agent"
