import dotenv from 'dotenv';
import connectMongoDb from "./config/mongoDb.config.js";
import { app } from './app.js';

dotenv.config({ path: './.env' })


connectMongoDb()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`server is running on ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("mongo DB connection failed !!!",err)
})