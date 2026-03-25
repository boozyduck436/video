import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import mongoose from 'mongoose'
import prisma from '../config/postgres.config.js'
import { s3Client } from '../config/s3.config.js'
import { HeadBucketCommand } from '@aws-sdk/client-s3'

const liveness = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, 'server is healthy'))
})

const readiness = asyncHandler(async (req, res) => {
  let mongodbConnected
  try {
    await mongoose.connection.db.admin().ping()
    mongodbConnected = true
  } catch {
    mongodbConnected = false
  }

  let postgresConnected
  try {
    await prisma.$queryRaw`SELECT 1`
    postgresConnected = true
  } catch {
    postgresConnected = false
  }

  let s3connected
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: process.env.STORAGE_BUCKET }))
    s3connected = true
  } catch {
    s3connected = false
  }

  const healthy = mongodbConnected && postgresConnected && s3connected

  let statusCode
  let message

  if (healthy) {
    statusCode = 200
    message = 'Success'
  } else {
    statusCode = 503
    message = 'Error'
  }

  const response = {
    status: healthy ? 'pass' : 'fail',
    detail: {
      mongodb: mongodbConnected ? 'up' : 'down',
      postgres: postgresConnected ? 'up' : 'down',
      s3: s3connected ? 'up' : 'down',
    },
  }

  return res.status(statusCode).json(new ApiResponse(statusCode, response, message))
})

export { liveness, readiness }
