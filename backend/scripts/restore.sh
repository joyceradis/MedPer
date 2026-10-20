#!/usr/bin/env sh
set -eu
# Use the backend virtual environment; never replace an existing restore target.
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec "${PYTHON_BIN:-python3}" "$script_dir/backup_bundle.py" restore "$@"
