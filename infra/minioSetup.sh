# set minio alias
mc alias set myminio http://localhost:9000 admin password

# create bucket in minio
mc mb myminio/streamtube

# create second user
mc admin user add myminio stsuser stspassword

# add policy to minio
mc admin policy create myminio stsuserpolicy /polices/sts-streamtube-readonly-policy.json

# attach policy to second user
mc admin policy attach myminio stsuserpolicy --user stsuser

# configure minio for event notfication
mc event add myminio/streamtube arn:minio:sqs::rabbitmq1:amqp --event put --prefix private/
