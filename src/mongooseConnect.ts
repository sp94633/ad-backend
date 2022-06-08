import mongoose from 'mongoose';

export function connectMongoose() {

    try {
        let dev_db_url = process.env.MONGO_CONNECTION_STRING;
        const mongoDB = process.env.MONGODB_URI || dev_db_url;
        mongoose.connect(mongoDB, { useNewUrlParser: true });
        mongoose.Promise = global.Promise;
        const db = mongoose.connection;
        db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    } catch(error) {
        console.log("Error occured while connecting to database :"+error);
    }

  
}