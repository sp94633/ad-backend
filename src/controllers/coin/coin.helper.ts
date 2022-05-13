import mongoose from 'mongoose';

import { Token } from "../../models/token.model";

import { CoinTransaction, CoinTransactionTypeEnum, SystemGeneratedTransactionCodesEnum, UserCoin } from "../../models/coins.model"
import { User } from "../../models/user.model";
import moment from "moment";
var bcrypt = require('bcryptjs');
const saltRounds = 10;

export const addCoinOnRegistration = async (userId: string, referenceKey: string, token: string, description: string) => {
    try {
        const amount = Number(process.env.COIN_ON_REGISTRATION);
        const transaction = await addTransaction(userId, token, amount, 'Credit', description, SystemGeneratedTransactionCodesEnum.Registered);
        if(referenceKey) {
        User.findOne({reference: referenceKey}).then((user:any) => {
            const affiliateUser = user.toObject();
            const affiliateAmount = Number(process.env.COIN_ON_AFFILIATE);
            const affiliateDescription = 'Referrer Used'
            addTransaction(affiliateUser._id, token, affiliateAmount, 'Credit', affiliateDescription, SystemGeneratedTransactionCodesEnum.Affiliate);
            user.referredUsers.push(userId)
            user.save()
        })
        }
        return transaction;
    } catch (error) {
        throw error;
    }
}

export const addTransaction = async (userId: string, token: string, amount: number, transactionType: string, description: string, systemCode: string = null) => {

    try {
        let lastHashKey;

        const lastTransaction: any = await CoinTransaction.findOne({ userId: userId }).sort({_id: -1});
        if (!lastTransaction) {
            lastHashKey = userId;
        } else {
            let lastTransactionObj = lastTransaction;
            lastHashKey = lastTransactionObj.hashKey;
        }

        const tokenObj = await Token.findOne({ tokenString: token });
        // console.log({tokenObj})
        if(tokenObj) {
            const obj: any = {
                _id: mongoose.Types.ObjectId(),
                userId: mongoose.Types.ObjectId(userId),
                tokenId: tokenObj._id,
                amount: amount,
                type: transactionType,
                lastHashKey: lastHashKey,
                description: description,
                isSystemGenerated: systemCode ? true : false,
                systemCode: systemCode || null,
                transactionDate: moment().utc()
            }
            obj.hashKey = await _createTransactionHash(obj).catch(err => { throw (err) });
    
            await handleTransaction(obj);
            return true;
        } else {
            console.log("Invalid token")
            throw 'invalid token'
        }

    } catch (e) {
        throw e;
    }
}


const _createTransactionHash = (obj: any) => {
    return new Promise((resolve, reject) => {
        bcrypt.hash(JSON.stringify(obj), saltRounds, (err: any, hash: any) => {
            if (err) reject(err);
            resolve(hash);
        });
    })
}

const handleTransaction = async (transactionObj: any) => {
    // Mongo Session to be added later
    // const session = await CoinTransaction.startSession();
    // session.startTransaction();
    try {
        const coinTransaction: any = await CoinTransaction.create(transactionObj).catch(err => { throw (err) });

        const userCoinDoc: any = await UserCoin.findOne({ userId: transactionObj.userId });
        let userCoin;
        if (!userCoinDoc) {
            userCoin = {
                lastTransactionId: coinTransaction._id,
                amount: coinTransaction.amount,
                oldAmount: 0,
                userId: coinTransaction.userId
            };
            await UserCoin.create(userCoin).catch(err => { 
                handleCoinUpdateError(coinTransaction._id);
                throw err;
             });
        } else {
            let newAmount;
            const oldAmount = userCoinDoc.amount;
            if (coinTransaction.type === CoinTransactionTypeEnum.Credit) {
                newAmount = oldAmount + coinTransaction.amount;
            }
            else if (coinTransaction.type === CoinTransactionTypeEnum.Debit) {
                newAmount = oldAmount - coinTransaction.amount;
            }
            userCoinDoc.lastTransactionId = coinTransaction._id,
                userCoinDoc.amount = newAmount,
                userCoinDoc.oldAmount = oldAmount
            userCoin = userCoinDoc;
            const newUserCoin: any = await UserCoin.updateOne({_id: userCoinDoc._id}, userCoin).catch(err => { 
                handleCoinUpdateError(coinTransaction._id);
                throw err;
             });
        }
        
        // await session.commitTransaction();
        // session.endSession();
    } catch (error) {
        // await session.abortTransaction();
        // session.endSession();
        console.log(error)
        throw error;
    }

}


export const handleDailyLogin = async (userId: any, token: string) => {
    try {
        // check if daily  limit done
        if(await checkIfDailyLoginAvailable(userId)) {
            const amount = Number(process.env.COIN_ON_DAILY_LOGIN) || 0;
            const result = await addTransaction(userId, token, amount, CoinTransactionTypeEnum.Credit, `Daily Bonus Added`, SystemGeneratedTransactionCodesEnum.DailyLogin )
            if(result) {
                return true;
            } else {
                throw 'Something went Wrong.'
            }
        }
         else {
           throw 'Daily Bonus Already Added.'
        }

    } catch (error) {
        console.error(error);
        throw error;
    }
}

export const checkIfDailyLoginAvailable = async (userId: any) => {
    const startDay = moment().startOf('day').utc()
    const endDay = moment().endOf('day').utc()
    const currentTransactions = await CoinTransaction.aggregate([
        {
            $match: {
                userId: (userId),
                $and: [
                    { transactionDate: { $gte: startDay.toDate() } },
                    { transactionDate: { $lte: endDay.toDate() } },
                ],
                systemCode: SystemGeneratedTransactionCodesEnum.DailyLogin
            }
        }
    ]);
    if (currentTransactions && currentTransactions.length > 0) {
        return false;
    } else {
        return true;
    }
}

const handleCoinUpdateError = async (transactionId: string) =>{
    const update = await CoinTransaction.updateOne({_id: transactionId}, { status: 'D' })
}

interface ITransactionObj {
    _id: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    tokenId: any,
    amount: number,
    type: string,
    lastHashKey: string,
}