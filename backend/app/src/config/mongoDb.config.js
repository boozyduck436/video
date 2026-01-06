import mongoose from "mongoose";


const connectMongoDb= async ()=>{
    try{
        const connectionInstance =await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}?authSource=${process.env.AUTH_SOURCE}`)
        console.log( `\n mongoDB is connected !! ${connectionInstance.connection.host}`)
    }catch(error){
        console.error("MONGODB connection error",error);
        process.exit(1);
    }
}

export default connectMongoDb 