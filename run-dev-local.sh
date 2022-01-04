set -x
set -e

DIALECT_PRIVATE_KEY=$(cat ~/projects/dialect/notification-service-dev-local-key.json) \
  ts-node examples/on-new-user.ts
