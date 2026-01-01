import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema= new Schema(
    {
        video:{
            type:String, //cloud url
            required:true
        },
        thumbnail:{
            type:String, //cloud url
            required:true
        },
        title:{
            type:String,
            required:true
        },
        description:{
            type:String,
            required:true
        },
        duration:{
            type:Number, // from cloud
            //required:true // commented for now as cloud service is not connected 
        },
        view:{
            type:Number,
            default:0
        },
        isPublished:{
            type: Boolean,
            default: true
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref:"User",
            required:true    
        }
    },   
    {
        timestamps:true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video=mongoose.model("Video",videoSchema)