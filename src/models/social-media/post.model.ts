
import mongoose, { Model } from 'mongoose';
import { User } from '../user.model';
const Schema = mongoose.Schema;

export const Posts = mongoose.model('Posts', new Schema({

    by: {id:{type: mongoose.Types.ObjectId, ref: User}, name: {type:String} },
    circles: [ {type:String} ],
    type: {type:String},
    ts: {type:Date},
    isAbusePost:{type:Boolean,default:false},
    imageVideoUrl:[{type:String}],
    description: {type:String} ,
    isRemoved: {type: Boolean, default:false},
    removedDate: {type: Date},
    removedBy: {type:mongoose.Types.ObjectId, ref: User},
    isReshared:{type:Boolean, default: false},
    
    reshareCount: {type: Number, default: 0},
    likesCount: {type: Number, default: 0},
    commentsCount: {type: Number, default: 0},
  
    reshared_post_id:{type:mongoose.Types.ObjectId, ref: 'Posts'},
    reshared_by:{id:{type: mongoose.Types.ObjectId, ref: User}, name: {type:String} },
    isGiveAway: { type: Boolean, defaul : false},
    isCommentsOff : { type: Boolean, defaul : false}
    // comments: [
    //    {  
    //      by: { id:{type:mongoose.Types.ObjectId, ref: User}, name: {type:String} },
    //      ts: {type:Date},
    //      text: {type:String},
    //      hasChildren:{type:Boolean,default:false},
    //      parent :{id:{type:mongoose.Types.ObjectId}, name: {type:String} }
    //    }]

}))
