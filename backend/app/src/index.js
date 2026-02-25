import dotenv from 'dotenv'
import { app } from './app.js'
import connectMongoDb from './config/mongoDb.config.js'
import prisma from './config/postgres.config.js'
import { s3Client } from './config/s3.config.js'
import { HeadBucketCommand } from '@aws-sdk/client-s3'

dotenv.config({ path: '../../.env', quiet: true }) // '../../.env' is relative to process.cwd(), not this file

const startServer = async () => {
  try {
    console.log('Attempting to connect to services')

    await connectMongoDb()
    console.log('MongoDB Connected')

    await prisma.$connect()
    console.log('Postgres (Prisma) Connected')

    await s3Client.send(new HeadBucketCommand({ Bucket: process.env.STORAGE_BUCKET }))
    console.log('MinIO (S3) Connected')

    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is running on ${process.env.PORT}`)
    })
  } catch (error) {
    console.error('Startup Error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

const delay = process.env.STARTUP_DELAY
console.log(`Sleeping for ${delay / 1000}s to let other services to boot up`)
setTimeout(() => {
  startServer()
}, delay)
