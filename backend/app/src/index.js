import dotenv from 'dotenv'
import { app } from './app.js'
import connectMongoDb from './config/mongoDb.config.js'
import prisma from './config/postgres.config.js'
import { s3Client, s3PresignClient, stsClient } from './config/s3.config.js'
import { HeadBucketCommand } from '@aws-sdk/client-s3'
import { sleep } from './utils/sleep.js'
import mongoose from 'mongoose'

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
    console.error('Dependency connection error: ', error)
    return false
  }
}

let dependenciesReady = false
let server

const startServer = async () => {
  try {
    for (let attempt = 1; attempt <= STARTUP_MAX_RETRIES; attempt++) {
      const delay = attempt === 1 ? STARTUP_INITIAL_DELAY : STARTUP_RETRY_DELAY
      console.log(`attempt ${attempt}/${STARTUP_MAX_RETRIES} : Sleeping for ${delay / 1000}s`)
      await sleep(delay)
      console.log(`attempt ${attempt}/${STARTUP_MAX_RETRIES} : connecting dependencies `)
      dependenciesReady = await connectDependencies()
      if (dependenciesReady) break
    }

    if (!dependenciesReady) {
      console.error(
        `Unable to connect to services after ${STARTUP_MAX_RETRIES} attempts, Shutting down`
      )
      await gracefulShutdown('REQUIRED_SERVICES_UNAVAILABLE', 1)
    }

    server = app.listen(PORT, () => {
      console.log(`server is running on ${PORT}`)
    })
  } catch (error) {
    console.error('Server Startup Error:', error)
  }
}

let shuttingDown = false

const gracefulShutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`\nReceived ${signal}, Shutting down gracefully.`)

  try {
    if (server) {
      await new Promise((resolve, reject) =>
        server.close((error) => {
          if (error) return reject(error)
          resolve()
        })
      )
      console.log('Server closed, No longer accepting requests.')
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close()
      console.log('MongoDb connection closed')
    }

    await prisma.$disconnect()
    console.log('PostgreSQL(Prisma) connection closed')

    if (s3Client) {
      s3Client.destroy()
      console.log('S3 client destroyed')
    }
    if (s3PresignClient) {
      s3PresignClient.destroy()
      console.log('S3 presigned client destroyed')
    }
    if (stsClient) {
      stsClient.destroy()
      console.log('S3 STS client destroyed')
    }

    console.log('Graceful shutdown complete successfully')

    process.exit(exitCode)
  } catch (error) {
    console.error('error during graceful shutdown: ', error)
    process.exit(1)
  }
}

process.on('SIGINT', async () => await gracefulShutdown('SIGINT'))
process.on('SIGTERM', async () => await gracefulShutdown('SIGTERM'))

await startServer()
