import dotenv from 'dotenv'
import { app } from './app.js'
import connectMongoDb from './config/mongoDb.config.js'
import prisma from './config/postgres.config.js'
import { s3Client } from './config/s3.config.js'
import { HeadBucketCommand } from '@aws-sdk/client-s3'
import { sleep } from './utils/sleep.js'

dotenv.config({ path: '../../.env', quiet: true }) // '../../.env' is relative to process.cwd(), not this file

const PORT = Number(process.env.PORT) || 8000
const STARTUP_INITIAL_DELAY = Number(process.env.STARTUP_INITIAL_DELAY) || 10000
const STARTUP_RETRY_DELAY = Number(process.env.STARTUP_RETRY_DELAY) || 5000
const STARTUP_MAX_RETRIES = Number(process.env.STARTUP_MAX_RETRIES) || 3

const connectDependencies = async () => {
  try {
    await connectMongoDb()
    console.log('MongoDB Connected')

    await prisma.$connect()
    console.log('Postgres (Prisma) Connected')

    await s3Client.send(new HeadBucketCommand({ Bucket: process.env.STORAGE_BUCKET }))
    console.log('MinIO (S3) Connected')

    return true
  } catch (error) {
    console.error('Startup Error:', error)
    await prisma.$disconnect()
    return false
  }
}

let dependenciesReady = false

const startServer = async () => {
  try {
    for (let attempt = 1; attempt <= STARTUP_MAX_RETRIES; attempt++) {
      const delay = attempt === 1 ? STARTUP_INITIAL_DELAY : STARTUP_RETRY_DELAY
      console.log(
        `attempt ${attempt}/${STARTUP_MAX_RETRIES} : Sleeping for ${delay / 1000}s to let other services to boot up`
      )
      await sleep(delay)
      console.log(`attempt ${attempt}/${STARTUP_MAX_RETRIES} : connecting dependencies `)
      dependenciesReady = await connectDependencies()
      if (dependenciesReady) break
    }

    if (!dependenciesReady) {
      console.error(
        `Unable to connect to required services after ${STARTUP_MAX_RETRIES} attempts. Shutting down.`
      )
      process.exit(1)
    }

    app.listen(PORT, () => {
      console.log(`server is running on ${PORT}`)
    })
  } catch (error) {
    console.error('Startup Error:', error)
  }
}

await startServer()
