import mongoose, { Model } from 'mongoose';
const Schema = mongoose.Schema;

export const Files = mongoose.model('Files', new Schema({

    fileName: { type: String , required: true},
    filePath: { type: String , required: true},
    fileType: { type: String },
    createdDate: { type: Date },
    lastUpdatedAt: { type: Date },
    status: { type: String, status: 'A' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' , required: true},

}))
