
import mongoose, { Model } from 'mongoose';
import { User } from '../user.model';
import { Posts } from './post.model';
const Schema = mongoose.Schema;

export const PostLike = mongoose.model('PostLike', new Schema({
        userId: {type:mongoose.Types.ObjectId, ref: User },
        postId:{type:mongoose.Types.ObjectId,ref:Posts},
        ts: {type:Date},
        isUnliked: {type: Boolean, default:false},
        unlikedDate: {type: Date},     

    
}))
PostLike.createIndexes({ userId: 1, postId: 1, isUnliked: 1 })
