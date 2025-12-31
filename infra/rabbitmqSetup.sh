# Create direct exchange
rabbitmqadmin declare exchange name=s3-exchange type=direct durable=true

# Create queue
rabbitmqadmin declare queue name=s3-events durable=true

# Bind queue to exchange with routing key
rabbitmqadmin declare binding source=s3-exchange destination=s3-events routing_key=s3