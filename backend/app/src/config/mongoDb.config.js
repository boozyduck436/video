import mongoose from 'mongoose'

const connectMongoDb = async () => {
  await mongoose.connect(
    `${process.env.MONGODB_URI}/${process.env.DB_NAME}?authSource=${process.env.AUTH_SOURCE}`,
    { serverSelectionTimeoutMS: 5000 }
  )
}

export default connectMongoDb
