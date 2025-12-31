import mongoose,{Schema} from "mongoose";

const subscriptionSchema= new Schema(
    {
        subscriber:{ // one who(user,viewer,consumer) is subscribing channel
            type:Schema.Types.ObjectId,
            ref:"User",
            require:true
        },
        channel:{ //one who(channel owner user,creater,producer) get subscribe by user
            type:Schema.Types.ObjectId,
            ref:"User",
            require:true
        }

    },
    {
        timestamps: true
    }
)

export const Subscription=mongoose.model("Subscription",subscriptionSchema)