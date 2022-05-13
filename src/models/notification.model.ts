import mongoose, { Model } from 'mongoose';
import { User } from './user.model';
const Schema = mongoose.Schema;

export enum NotificationActions {
    "Like" = "Like",
    "Comment" = "Comment",
    "Share" = "Share",
    "Followed" = "Followed"
}



export const Notification = mongoose.model('Notification', new Schema({

    to: { type: mongoose.Types.ObjectId, ref: User },
    from: { type: mongoose.Types.ObjectId, ref: User },
    action: { type: String, enum: NotificationActions, require: true },
    createdDate:  { type: Date },
    message: { type: String },
    actionId: { type: mongoose.Types.ObjectId },
    isRead: { type: Boolean, default: false },
    readDate: { type: Date }

}))

Notification.createIndexes({ to: 1, isRead: 1 })


