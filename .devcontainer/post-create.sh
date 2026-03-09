#!/usr/bin/env bash
set -euo pipefail

pnpm install --frozen-lockfile
pnpm --dir backend install --frozen-lockfile
