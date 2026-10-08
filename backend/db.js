import mongoose from "mongoose";
import dotenv from "dotenv"
import colors from "colors"

dotenv.config()

export const connectDb = async (req, res) => {
    try {
         const connect = await mongoose.connect(process.env.MONGO_URI)
         if(connect){
        console.log('MongoDB Connected Successfully, Build it big, Build real!!!'.green.bold);
         } else{
            console.log("an error occurred wile connecting to the database")
         }
    } catch (error) {
        console.log(error)

    }
   

}