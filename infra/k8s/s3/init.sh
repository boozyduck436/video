#!/bin/sh

# set minio alias
CMD="mc alias set myminio ${STORAGE_ENDPOINT} ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}"

echo "Waiting for bucket-storage"

# > /dev/null : Sends success output to trash
# 2>&1 : Sends errors to trash too
# slient waiting loop
until $CMD > /dev/null 2>&1; do
  echo "MinIO not ready. Retrying in 2s..."
  sleep 2
done

echo "bucket-storage is up, init setup start"

# create bucket in minio
mc mb --ignore-existing myminio/streamtube

# create second user
mc admin user add myminio ${STORAGE_STS_USER} ${STORAGE_STS_PASSWORD}  2> /dev/null || true

# add policy to minio
mc admin policy create myminio stsuserpolicy /setup/sts-streamtube-readonly-policy.json

# attach policy to second user
mc admin policy attach myminio stsuserpolicy --user stsuser

# configure minio for event notfication
mc event add myminio/streamtube arn:minio:sqs::rabbitmq1:amqp --event put --prefix private/ 2> /dev/null || echo "Event notification already exists(skipping command)"

echo "bucket-storage init setup complete"
