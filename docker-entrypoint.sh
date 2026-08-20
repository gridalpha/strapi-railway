#!/bin/sh
set -e

# V8 sizes its heap from the host's RAM, and Railway hosts are far larger than
# the container's quota, so an unbounded heap lets the process reach the cgroup
# limit and get SIGKILLed with nothing in the log. Derive it from the quota
# instead, so a resize retunes it without a rebuild.
if [ -z "${NODE_OPTIONS:-}" ]; then
  limit=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo max)
  case "$limit" in
    '' | max | *[!0-9]*) heap=1024 ;;
    *) heap=$((limit / 1024 / 1024 / 2)) ;;
  esac
  [ "$heap" -lt 512 ] && heap=512
  [ "$heap" -gt 4096 ] && heap=4096
  NODE_OPTIONS="--max-old-space-size=$heap"
  export NODE_OPTIONS
fi

echo "[railway] starting Strapi with NODE_OPTIONS=$NODE_OPTIONS on port ${PORT:-1337}"

# exec the binary directly rather than via npm, so signals reach Strapi itself.
exec ./node_modules/.bin/strapi start
