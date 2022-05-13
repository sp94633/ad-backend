import { Router } from 'express';
import { CoinTransaction, UserCoin } from '../../models/coins.model';
import { userAuthenticate } from '../../middlewares/userAuthenticate.middleware';
import { addTransaction, checkIfDailyLoginAvailable, handleDailyLogin } from './coin.helper';
import mongoose from 'mongoose';

import moment from 'moment';


export const coinRouter = Router();
// Only for testing purpose.. Should be commented in prod. Transactions to be added only after payment confirmation and not through API
coinRouter.post('/addTransaction',userAuthenticate, async (req, res) => {
    const userId = req.body.userId;
    const token = req.token;
    const amount = req.body.amount;
    const type = req.body.type;
    const description = req.body.description || '';
    const systemCode = req.body.systemCode || '';
    const transaction: any = await addTransaction(userId, token, amount, type, description, systemCode).catch(err => res.send(err))
    res.json({ status: true}).status(200)
})

coinRouter.get('/dailyLogin', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const token = req.token;
        const val = await handleDailyLogin(userId, token);
        res.send({status: val}).status(200)
    } catch (error) {
        res.send({err: error, status: false}).status(503)
    }
  
})

coinRouter.get('/checkIfDailyLoginAvailable', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const token = req.token;
        const val = await checkIfDailyLoginAvailable(userId);
        res.send({status: val}).status(200)
    } catch (error) {
        res.send({err: error, status: false}).status(503)
    }
  
})

coinRouter.get('/getUserCoin', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const val = await UserCoin.findOne({userId, status: 'A'})
        res.send({userCoin: val}).status(200)
    } catch (error) {
        res.send({err: error, status: false}).status(503)
    }
})

coinRouter.post('/getPastTransaction', userAuthenticate, async (req, res) => {
    const userId = req.user._id;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;


    const startOfStartDate = moment(startDate).startOf('day');
    const startOfEndDate = moment(endDate).endOf('day');
    // Can add pagination here later 
    const transactions = await CoinTransaction.aggregate([
        {
            $match : {
                userId: mongoose.Types.ObjectId(userId),
                $and: [
                    { transactionDate: { $gte: startOfStartDate.utc().toDate() }},
                    { transactionDate: { $lte: startOfEndDate.utc().toDate() } },
                ],
            }
        },
        {
            $project: {
                userId: 1,
                amount: 1,
                status: 1,
                type: 1,
                transactionDate: 1,
                description: 1,
                systemCode: 1
            }
        }
    ]).catch(err => res.send(err))
    const currentBalance = await UserCoin.find({userId})
    res.json({ transactions, currentBalance ,status: true}).status(200)

})