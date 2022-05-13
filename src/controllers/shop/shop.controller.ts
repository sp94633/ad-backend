import { Router } from 'express';
import mongoose from 'mongoose';
import moment from 'moment';
import { userAuthenticate } from '../../middlewares/userAuthenticate.middleware';
import { SellerRegistrationForm } from '../../models/shop/registrationForm.model';

export const shopRouter = Router();

shopRouter.get('/getRegistrationStatus', userAuthenticate,  async (req, res) => {
    try {
        const userId = req.user._id;
        const userValue = await SellerRegistrationForm.findOne({ userId: userId });
        res.send({status: true, userValue})

    } catch (error) {
        res.send({status: false, message: error})  
    }
})

shopRouter.post('/saveRegistrationForm', userAuthenticate, async (req, res) => {
    try {
        const data = req.body.data;
        const userId = req.user._id;
        const date = moment().utc().toDate();
        if(data.currentStep === 5) {
            data.currentStatus = 'Form Submitted'
        }
        const userValue = await SellerRegistrationForm.findOne({ userId: userId });
        if (userValue) {
            const lastUpdatedDate = date;
            const update = await SellerRegistrationForm.updateOne({ _id: userValue._id }, data)
        } else {
            data.userId = userId;
            const val = await SellerRegistrationForm.create(data);
        }
        res.send({status: true, message: 'Registration Successful'})
    } catch (error) {
        res.send({status: false, message: error})

    }

})
