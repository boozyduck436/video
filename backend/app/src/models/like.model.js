import mongoose, { Schema } from 'mongoose'

const likeSchema = new Schema(
  {
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      require: true,
    },
    mediaType: {
      type: String,
      require: true,
      enum: ['Video', 'Tweet', 'Comment'],
    },
    postId: {
      type: Schema.Types.ObjectId,
      refpath: 'mediaType',
      require: true,
    },
  },
  { timestamps: true }
)

export const Like = mongoose.model('Like', likeSchema)
