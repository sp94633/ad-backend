
import mongoose, { Model } from 'mongoose';
import { User } from '../user.model';
import { Posts } from './post.model';
const Schema = mongoose.Schema;

export const PostComment = mongoose.model('PostComment', new Schema({
        by: {type:mongoose.Types.ObjectId, ref: User},
        postId:{type:mongoose.Types.ObjectId,ref:Posts},
        ts: {type:Date},
        text: {type:String},
        // hasChildren:{type:Boolean,default:false},
        // parent :{id:{type:mongoose.Types.ObjectId}, name: {type:String},
        isRemoved: {type: Boolean, default:false},
        removedDate: {type: Date},      
    
}))
