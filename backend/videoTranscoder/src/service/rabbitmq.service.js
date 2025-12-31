import amqp from "amqplib";
import dotenv from "dotenv";
dotenv.config()

const RABBIT_QUEUE = process.env.RABBIT_QUEUE
const RABBIT_URL = process.env.RABBIT_URL


export async function fetchOneRabbitmqMessage() {
  let connection;
  let channel;

  try {
    console.log("rabbitmq service started 1")
    connection = await amqp.connect(RABBIT_URL);
    channel = await connection.createChannel();
    console.log("rabbitmq service started 2")
    await channel.assertQueue(RABBIT_QUEUE, { durable: true });

    console.log("[*] Waiting for one message...");

    // Get a single message (no consumer loop)
    const msg = await channel.get(RABBIT_QUEUE, { noAck: false });

    if (!msg) {
      console.log("[!] No message in queue");
      await channel.close();
      await connection.close();
      process.exit(0);
    }

    let key = null;

    try {
      const data = JSON.parse(msg.content.toString("utf8"));
      key = data?.Key;
    } catch (err) {
      console.error("Invalid JSON:", msg.content.toString());
    }

    console.log("RabbitMq messaged fecthed")
    return {msg,key,channel,connection}


  } catch (err) {
    console.error("RabbitMQ error:", err);
    process.exit(1);
  }
}



export async function sendRabbitmqAck(msg, channel,connection){
    channel.ack(msg);

    await channel.close();
    await connection.close();

    console.log("Ack sended, exiting");
    process.exit(0);
}



