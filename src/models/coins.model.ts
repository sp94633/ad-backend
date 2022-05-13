import mongoose from 'mongoose';
import moment from "moment";

const Schema = mongoose.Schema;

export const CoinTransaction = mongoose.model('CoinTransaction', new Schema({
    userId : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenId : { type: Schema.Types.ObjectId, ref: 'Token', required: true },
    amount: { type: Number, required: true},
    status: {type: String, default: "A"},
    type: {type: String, enum: ['Credit', 'Debit'], required: true },
    transactionDate: {type: Date, default: moment.utc().toDate()},
    hashKey: {type: String, required: true},
    lastHashKey: {type: String, required: true},
    description: {type: String},
    isSystemGenerated: { type: String, default: false },
    systemCode: { type: String}
}))
CoinTransaction.createIndexes({ userId: 1 })
CoinTransaction.createIndexes({ userId: 1, type : 1 })


export const UserCoin = mongoose.model('UserCoin', new Schema({
    userId : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastTransactionId : { type: Schema.Types.ObjectId, ref: 'CoinTransaction', required: true },
    dateCreated: {type: Date, default:  moment.utc().toDate()},
    amount: { type: Number, required: true},
    oldAmount: { type: Number, required: true},
    status:  {type: String, default: "A"},
}))
CoinTransaction.createIndexes({ userId: 1, amount: 1 })



export enum CoinTransactionTypeEnum {
    "Credit" = "Credit",
    "Debit" = "Debit"
}

export enum SystemGeneratedTransactionCodesEnum {
    "Registered" = "Registered",
    "Affiliate" = "Affiliate",
    "DailyLogin" = "DailyLogin",
    "Like" = "Like",
    "Comment"= "Comment",
    "Reshare"="Reshare"
}