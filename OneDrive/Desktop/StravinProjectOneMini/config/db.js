import mongoose  from "mongoose"
const  connectToDb = async()=>{
        try{
            mongoose.connect(process.env.MONGO_URI)
            console.log(`Connected to Databse (StarvinDB)...`)
        }catch(error){
console.log("Mongo db connection Issues..")
        }
}
   

export default connectToDb