import mongoose, { Model, SchemaType } from 'mongoose';
import { User } from './user.model';
const Schema = mongoose.Schema;

export const UserFollowers = mongoose.model('UserFollowers', new Schema({
    user_id: { type: mongoose.Types.ObjectId, ref: User },
    follower_id: { type: mongoose.Types.ObjectId, ref: User },
    createdDate:  { type: Date },
    isUnfollowed: {type: Boolean, default: false},
    unfollowedDate:  { type: Date },


}))

UserFollowers.createIndexes({ _id: 1,  user_id: 1,follower_id: 1 })