
import mongoose, { Model } from 'mongoose';
import { User } from '../user.model';
import { Posts } from './post.model';
const Schema = mongoose.Schema;

export const Chat = mongoose.model('Chat', new Schema({
    sender : {
        type : mongoose.Schema.Types.ObjectId,
        ref : User
    },
    ts: {type: Date},
    messages : [
        {
            message : String,
            meta : [
                {
                    user : {
                        type : mongoose.Schema.Types.ObjectId,
                        ref : User
                    },
                    delivered : Boolean,
                    read : Boolean
                }
            ]
        }
    ],
    is_group_message : { type : Boolean, default : false },
    participants : [
        {
            user :  {
                type : mongoose.Schema.Types.ObjectId,
                ref : User
            },
            delivered : Boolean,
            read : Boolean,
            last_seen : Date
        }
    ]
}))

export const UserConversation = mongoose.model('UserConversation', new Schema({
    participants: [{ type: mongoose.Types.ObjectId, ref: User }]
}))

export const UserChatMessages = mongoose.model('UserChatMessage', new Schema({
    conversationId: { type: mongoose.Types.ObjectId, ref: UserConversation },
    ts: { type: Date },
    message: { type: String },
    sentBy: { type: mongoose.Types.ObjectId, ref: User },
    repliedTo: { type: mongoose.Types.ObjectId},
}))



/**
 * --- conversationId
 * --- ts
 * --- message
 * --- sentby
 * 
 * 
 * Conversation
 * --- participants : [],
 * --- _id
 */

