import mongoose, { Model } from 'mongoose';
const Schema = mongoose.Schema;

export const Token = mongoose.model('Token', new Schema({
    tokenString: { type: String , required: true},
    userId: { type: Schema.Types.ObjectId, ref: 'User' , required: true},
    ip: { type: String },
    deviceName: { type: String },
    deviceOS: { type: String },
    browser: {type: String},
    browserVersion: {type: String},
    isAPI: { type: String },
    createdDate: {type: Date},
    lastUsedDate: {type: Date},
    isActive: { type: Boolean, default: true},
    isForgotPasswordToken: {type: Boolean},
    isEmailToken: {type: Boolean}
}));
Token.createIndexes({ userId: 1})
Token.createIndexes({ tokenString: 1})

Token.createIndexes({ deviceOS: 1,deviceName: 1, browser: 1})
