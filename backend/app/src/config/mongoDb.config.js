import mongoose from 'mongoose'

const connectMongoDb = async () => {
  try {
    await mongoose.connect(
      `${process.env.MONGODB_URI}/${process.env.DB_NAME}?authSource=${process.env.AUTH_SOURCE}`
    )
  } catch (error) {
    console.error('MONGODB connection error', error)
    process.exit(1)
  }
}

export default connectMongoDb
