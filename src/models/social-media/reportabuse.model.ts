
import mongoose, { Model } from 'mongoose';
import { Posts } from './post.model';
import { User } from '../user.model';
const Schema = mongoose.Schema;

export const ReportAbuse = mongoose.model('ReportAbuse', new Schema({

    by: {id:{type: mongoose.Types.ObjectId, ref: User}, name: {type:String} },
    ts: {type:Date},
    post_id:{type:mongoose.Types.ObjectId,ref:Posts},
    user_notes:{type:String},
    isActive:{type:Boolean}

}))
