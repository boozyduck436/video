import mongoose,{Schema, Types} from "mongoose";

const commentSchema= new Schema(
    {
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User",
            require:true
        },
        mediaType:{
            type:String,
            enum:["Video","Tweet","Comment"],
            required:true
        },
        postId:{
            type:Schema.Types.ObjectId,
            refpath:"mediaType",
            require:true
        },
        content:{
            type:String,
            require:true
        }
    },
    {timestamps:true}
)

export const Comment= mongoose.model("Comment",commentSchema)