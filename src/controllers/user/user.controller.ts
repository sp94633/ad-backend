import { Router } from 'express';
import { User } from '../../models/user.model';
import mongoose from 'mongoose';

import { userAuthenticate } from '../../middlewares/userAuthenticate.middleware'
import { checkPassword, decodeForgotPasswordToken, encryptPassword, generateForgotPasswordToken, generateToken, generateUserVerificationToken, logoutUser, sendForgotPasswordLink, sendVerficationLink, _checkIfEmailExists } from './user-helper';
import { addCoinOnRegistration } from '../coin/coin.helper';

import { CoinTransaction } from '../../models/coins.model';
import moment from 'moment';
import { getS3SignedUrl } from '../file.controller';
import { Token } from '../../models/token.model';
import { Notification } from '../../models/notification.model';
import { followUser } from '../social-media/social-media.helper';


const { nanoid, customAlphabet } = require("nanoid");



export const userRouter = Router();

/**
 * Un Authorised Access to user details. Please remove this api
 */

userRouter.get('/userDetails', async (req, res) => {
    try {
        let users = await User.aggregate([
            {
                $lookup: {
                    from: 'usercoins',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'coinDetails'
                }
            },
            {
                $unwind: "$coinDetails"
            },
            {
                $project: {
                    _id: 1,
                    "isInfluencer": 1,
                    "isSeller": 1,
                    "IsVerified": 1,
                    "preferredLanguage": 1,
                    "profileImgUrl": 1,
                    "name": 1,
                    "email": 1,
                    "username": 1,
                    "countryCode": 1,
                    "reference": 1,
                    "VerificationDate": 1,
                    "referredUsers": 1,
                    "coins": "$coinDetails.amount",
                    "followersCount": 1,
                    "followingCount": 1,
                    "description": 1

                }
            }

        ]);

        res.send(users).status(200)
    } catch (error) {
        res.send({ err: "Not Found" }).status(404)

    }
})
/**
 * Un Authorised Access to user details. Please remove this api
 */
userRouter.get('/getAllTransactions', async (req, res) => {
    const transactions = await CoinTransaction.aggregate([
        {
            $project: {
                userId: 1,
                amount: 1,
                status: 1,
                type: 1,
                transactionDate: 1,
                description: 1,
                systemCode: 1,
                hashKey: 1
            }
        }
    ]).catch((err: any) => res.send(err))
    res.send(transactions).status(200)

})

userRouter.get('/user-profile/:userId', userAuthenticate, async (req, res) => {
    const userId = req.user._id;
    try {
        let user: any = await User.aggregate([
            {
                $match: { _id: mongoose.Types.ObjectId(userId) }
            },
            {
                $lookup: {
                    from: 'usercoins',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'coinDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    "isInfluencer": 1,
                    "isSeller": 1,
                    "IsVerified": 1,
                    "preferredLanguage": 1,
                    "name": 1,
                    "email": 1,
                    "countryCode": 1,
                    "username": 1,
                    "coinDetails": 1,
                    "reference": 1,
                    "referredUsers": 1,
                    "profileImgUrl": 1,
                    "followersCount": 1,
                    "followingCount": 1,
                    "description": 1
                }
            }

        ])
        delete user.password;
        delete user.verificationToken;
        delete user.VerificationDate;
        delete user.influencerAcceptanceDate;
        res.send(user).status(200)
    } catch (err) {
        res.send({ err: "User not found" }).status(404)
    }

})

userRouter.post('/register', async (req: any, res) => {
    const userInput = req.body.user;
    const hostname = req.hostname;
    const deviceInfo = req.body.deviceInfo;
    let user: any = await _checkIfEmailExists(userInput.email);
    if (!user) {
        try {
            if (!userInput.password) {
                throw 'Password Required';
            }
            userInput.password = await encryptPassword(userInput.password).catch(err => res.send(err));
            userInput.createdDate = moment().utc();
            userInput.profileImgUrl = 'https://www.gravatar.com/avatar/' + userInput.password + '?d=retro&s=200';
            // const randomId = nanoid(30);
            // userInput.verificationToken = randomId;
            const user: any = await User.create(userInput);
            let resUser = user.toJSON();
            delete resUser.password;
            delete resUser.verificationToken;
            delete resUser.refernceIdUsed;
            const token = await generateToken(user, req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress, deviceInfo);

            const userVerificationToken = await generateUserVerificationToken(resUser._id.toString());
            await user.updateOne({ verificationToken: userVerificationToken }).exec()
            sendVerficationLink(resUser._id.toString(), resUser.email, userVerificationToken);

            res.json({ status: true }).status(200)
        } catch (e) {
            res.send({ err: e, status: false }).status(503);
        }

    } else {
        if (!user.toJSON().IsVerified) {
            let resUser = user.toJSON();
            delete resUser.password;
            delete resUser.verificationToken;
            delete resUser.refernceIdUsed;
            sendVerficationLink(resUser._id.toString(), resUser.email, user.verificationToken);
            res.json({ status: true }).status(200)
        } else {
            res.send({ err: 'Email Id Already Present', status: false }).status(401);
        }
    }
})

userRouter.get('/resendVerificationLink/:emailId', async (req, res) => {
    try {
        const emailId = req.params.emailId;
        const user: any = await User.findOne({ email: emailId }).catch(err => { throw err });
        if (!user) {
            throw `No Email with ${emailId} found. Please register`;
        }
        const verificationToken = user.verificationToken;
        const userId = user._id;
        const userEmail = user.email;
        await sendVerficationLink(userId, userEmail, verificationToken).catch(err => { throw err });
        res.json({ status: true }).status(200)
    } catch (error) {
        res.json({ error, status: false }).status(503)
    }
})

userRouter.get('/verify-account-plain-html', async (req, res) => {
    // res.render('email-verify-success-plain');
    res.render('email-verify-failed-plain', { errorMessage: "Token invalid or expired!" });

})
userRouter.get('/verify-account/:userId/:verificationToken', async (req, res) => {
    try {
        const userId = req.params.userId;
        const verify = req.params.verificationToken;
        const user: any = await User.findById(userId);
        if (user.verificationToken === verify && (!user.IsVerified)) {
            user.IsVerified = true;
            user.VerificationDate = new Date();
            await User.findByIdAndUpdate(userId, user);
            const userObjId = user._id.toString();
            const refernceIdUsed = user.refernceIdUsed ? user.refernceIdUsed.toString() : null;
            const token = verify;

            await addCoinOnRegistration(userObjId, refernceIdUsed, token, 'Registration Bonus').catch(e => {
                console.log("Invalid Token")
                throw new Error('invalid verification token')
            });
            const url = `${process.env.FRONTEND_APP_DOMAIN}/auth/email-verification-success`
            res.render('email-verify-success-plain');
            // res.send({status: true}).status(200)
        } else {
            if (user.verificationToken !== verify) {
                throw 'InvalidToken'
            } else {
                throw 'AlreadyVerified'
            }
        }
    } catch (err) {
        // const url = `${process.env.FRONTEND_APP_DOMAIN}/auth/email-verification-failed?err=${err}`
        if (err === "InvalidToken") {
            res.render('email-verify-failed-plain', { errorMessage: "Token invalid or expired!" });
        }
        else if (err === "AlreadyVerified") {
            res.render('email-verify-failed-plain', { errorMessage: "User Already Verified!" });
        }
        else {
            res.render('email-verify-failed-plain', { errorMessage: "Email Verification Failed" });
        }

    }
})
userRouter.get('/verify-account-email/:userId/:verificationToken', async (req, res) => {
    try {
        const userId = req.params.userId;
        const verify = req.params.verificationToken;
        const user: any = await User.findById(userId);
        if (user.verificationToken === verify && (!user.IsVerified)) {
            user.IsVerified = true;
            user.VerificationDate = new Date();
            await User.findByIdAndUpdate(userId, user);
            const userObjId = user._id.toString();
            const refernceIdUsed = user.refernceIdUsed ? user.refernceIdUsed.toString() : null;
            const token = verify;

            await addCoinOnRegistration(userObjId, refernceIdUsed, token, 'Registration Bonus').catch(e => {
                console.log("Invalid Token")
                throw new Error('invalid verification token')
            });
            followUser('6278ab99680f7e6262edf72f', userObjId)
            const url = `${process.env.FRONTEND_APP_DOMAIN}/auth/email-verification-success`
            res.render('email-verify-success-plain');
            // res.send({status: true}).status(200)
        } else {
            if (user.verificationToken !== verify) {
                throw 'Invalid Verification Token'
            } else {
                throw 'User Already Verified'
            }
        }
    } catch (err) {
        // const url = `${process.env.FRONTEND_APP_DOMAIN}/auth/email-verification-failed?err=${err}`
        res.render('email-verify-failed-plain', { errorMessage: err });
    }
})

userRouter.post('/login', async (req: any, res) => {
    const userEmail = req.body.email;
    const userPassword = req.body.password;
    const deviceInfo = req.body.deviceInfo;


    User.findOne({
        $or: [
            {email: userEmail},
            {username: userEmail}
        ]
        
    }, async (err: any, user: any) => {
        if (err) res.send({ err: 'Email Id Or Username not found.', status: false }).status(503);
        else if (user && user.IsVerified === false) res.send({ err: 'Please Verify your Email Address. ', isVerifiedEmailErr: true, status: false }).status(503);
        else if (user && await checkPassword(userPassword, user.get('password'))) {
            const token = await generateToken(user, req.clientIp, deviceInfo);
            let resUser = user.toJSON();
            delete resUser.password;
            delete resUser.verificationToken;
            delete resUser.refernceIdUsed;

            res.json({ token, user: resUser }).status(200)
        } else {
            res.send({ err: 'Email Id/Username or Password incorrect', status: false }).status(401)
        }
    })

});

userRouter.post('/logout', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const tokenString = req.token;
        await logoutUser(userId, tokenString);
        res.json({ status: true }).status(200)
    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})

userRouter.post('/updatePassword', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const newPassword = req.body.newPassword;
        const oldPassword = req.body.oldPassword;

        const userObj = await User.findById(userId).catch(err => { throw (err) });
        if (userObj && await checkPassword(oldPassword, userObj.get('password'))) {
            let password = await encryptPassword(newPassword).catch(err => { throw (err) });
            await User.findOneAndUpdate({ _id: userId }, { password: password })
        } else {
            res.send({ err: "Invalid Password", status: false }).status(503)
        }

        res.json({ status: true }).status(200)
    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})
userRouter.post('/forgotPassword', async (req, res) => {
    try {
        const email = req.body.email;
        const deviceInfo = req.body.deviceInfo;

        const user: any = await User.findOne({ email: email }).catch(err => { throw (err) });
        if (user) {
            const userId = user._id.toString();
            const tokenString = await generateForgotPasswordToken(userId, req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress, deviceInfo);
            await sendForgotPasswordLink(userId, email, tokenString)
            res.json({ status: true }).status(200)
        } else {
            throw 'Email Not Found';
        }
    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})
userRouter.post('/resetPassword', async (req, res) => {
    try {
        const newPassword = req.body.password;
        const tokenString = req.body.tokenString;
        const userId = await decodeForgotPasswordToken(tokenString);
        let password = await encryptPassword(newPassword).catch(err => { throw (err) });
        await User.findOneAndUpdate({ _id: userId }, { password: password });
        res.json({ status: true }).status(200)
    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})


userRouter.put('/update-user', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const name = req.body.name;
        const countryCode = req.body.countryCode;
        const description = req.body.description;
        await User.findByIdAndUpdate(userId, { name, countryCode, description });
        const user: any = await User.aggregate([
            {
                $match: { _id: mongoose.Types.ObjectId(userId) }
            },
            {
                $lookup: {
                    from: 'usercoins',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'coinDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    "isInfluencer": 1,
                    "isSeller": 1,
                    "IsVerified": 1,
                    "preferredLanguage": 1,
                    "name": 1,
                    "email": 1,
                    "coinDetails": 1,
                    "reference": 1,
                    "referredUsers": 1,
                    "username": 1,
                    "countryCode": 1,
                    "profileImgUrl": 1,
                    "followersCount": 1,
                    "followingCount": 1,
                    "description": 1
                }
            }

        ])
        res.json(user)
    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})

userRouter.get('/getSignedUrlForProfilePicture/:fileName', userAuthenticate, async (req, res) => {
    try {

        const fileName = req.params.fileName;
        const userId = req.user._id;
        const signedUrl = getS3SignedUrl(`${userId}/profile/${fileName}`)
        res.json({ status: true, signedurl: signedUrl }).status(200);

    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})

userRouter.get('/getSignedUrlForProfileCover/:fileName', userAuthenticate, async (req, res) => {
    try {

        const fileName = req.params.fileName;
        const userId = req.user._id;
        const signedUrl = getS3SignedUrl(`${userId}/cover/${fileName}`)
        res.json({ status: true, signedurl: signedUrl }).status(200);

    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})

userRouter.get('/getSignedUrlForSeller/:fileName', userAuthenticate, async (req, res) => {
    try {

        const fileName = req.params.fileName;
        const userId = req.user._id;
        const signedUrl = getS3SignedUrl(`${userId}/seller/${fileName}`)
        res.json({ status: true, signedurl: signedUrl }).status(200);

    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})

userRouter.put('/updateProfileCover', userAuthenticate, async (req, res) => {
    try {

        const  profileCoverImgUrl = req.body.profileCoverUrl;
        const userId = req.user._id;
        const updatedUser = await User.findOneAndUpdate({_id: userId}, {profileCoverImgUrl})
        let resUser: any = updatedUser.toJSON();
        resUser.profileCoverImgUrl = profileCoverImgUrl;
        delete resUser.password;
        delete resUser.verificationToken;
        delete resUser.refernceIdUsed;

        res.json({ status: true, user: resUser}).status(200);

        

    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})

userRouter.put('/updateProfilePic', userAuthenticate, async (req, res) => {
    try {

        const  profileImgUrl = req.body.profilePicUrl;
        const userId = req.user._id;
        const updatedUser = await User.findOneAndUpdate({_id: userId}, {profileImgUrl})
        let resUser: any = updatedUser.toJSON();
        resUser.profileImgUrl = profileImgUrl;
        delete resUser.password;
        delete resUser.verificationToken;
        delete resUser.refernceIdUsed;

        res.json({ status: true, user: resUser}).status(200);

        

    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})

userRouter.get('/validate-username/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const user = await User.findOne({ username: username })
        if (user) {
            res.json({ message: "Username already Exists", status: false }).status(200)
        } else {
            res.json({ message: "", status: true }).status(200)

        }
    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})


userRouter.get('/make-influencer/:userid', async (req, res) => {
    try {
        const userId = req.params.userid;
        const reference = customAlphabet('1234567890abcdef', 6)();
        const user: any = await User.findByIdAndUpdate(userId, { isInfluencer: true, influencerAcceptanceDate: new Date(), reference })
        res.json({ userId: user._id, refernce: reference })
    } catch (error) {
        res.send({ err: error, status: false }).status(503)
    }
})

userRouter.get('/resendAllNonVerifiedEmails', async (req, res) => {
    try {
        const nonVerifiefUsers: any = await User.find({ IsVerified: false });
        const chunks = chunk(nonVerifiefUsers, 5);

        for (let i = 0; i < chunks.length; i++) {
            const chunck: any = chunks[i];
            let promiseArr = [];
            for (let j = 0; j < chunck.length; j++) {
                const user = chunck[j];
                const verificationToken = user.verificationToken;
                const userId = user._id;
                const userEmail = user.email;
                promiseArr.push(sendVerficationLink(userId, userEmail, verificationToken))
            }
            await Promise.all(promiseArr).catch(err => { });
        }
        res.send({ status: true, message: "Sending mails" })

    } catch (error) {
        res.send({ status: false, message: "Sending mails Failed" })

    }
})

userRouter.get('/resendVerificationEmailForInfluencer/:referenceId', async (req, res) => {
    try {
        const referenceId = req.params.referenceId;
        const users: any[] = await User.find({ refernceIdUsed: referenceId, IsVerified: false });
        for (const user of users) {
            const verificationToken = user.verificationToken;
            const userId = user._id;
            const userEmail = user.email;
            await sendVerficationLink(userId, userEmail, verificationToken).catch((err) => { });
        }
        res.send({ status: true, message: "Mails Sent" })

    } catch (error) {
        res.send(error)
    }
})

userRouter.get('/tokenVerificationForChat/:tokenString', async (req, res) => {
    try {
        const tokenString = req.params.tokenString;
        const tokenObj: any = await Token.findOne({ tokenString: tokenString, isActive: true }).populate('userId', 'username');
        if(tokenObj) {
            res.send({status: true, user : tokenObj})
            
        } else {
            res.send({status: false, error: 'Invalid User'})
        }

    } catch (error) {
        res.send({ status: false, error})   
    }
})


userRouter.get('/getUserNotifications', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        // const notifications = await Notification.find({ to: userId})
        // .sort({createdDate: -1}).populate("from", 'username profileImgUrl isInfluencer')
        // .limit(50);

        const notifications = await Notification.aggregate([
            {
                $match:  { to: userId}
            },
            {
                $sort : {createdDate: -1}
            },
            {
                $lookup : {
                    "from": "users",
                    "localField": "from",
                    "foreignField": "_id",
                    "as": "from",
                    pipeline : [
                        { $project : { _id: 1, username: 1, profileImgUrl: 1, isInfluencer: 1 } }
                    ]
                  }
                
            },
            
            {
                $lookup : {
                    "from": "posts",
                    "localField": "actionId",
                    "foreignField": "_id",
                    "as": "actions",
                    
                  }
            }
        ])
       
        if(notifications) {
            res.send({status: true, notifications })
        } else {
            res.send({status: true, notifications: []})

        }
    } catch (error) {
        res.send({ status: false, error})   
    }
})

userRouter.get('/getNotificationCount', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const notificationCount = await Notification.count({ isRead: false, to: userId});
        if(notificationCount) {
            res.send({status: true, notificationCount })
        } else {
            res.send({status: true, notificationCount: 0})

        }
    } catch (error) {
        res.send({ status: false, error})   
    }
})
userRouter.post('/markNotificationAsRead', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const notificationIds = req.body.notificationIds.map((x: string) => mongoose.Types.ObjectId(x));
        const notificationsUpdate = await Notification.updateMany({_id: {$in: notificationIds}}, { isRead: true, readDate: moment().utc().toDate() });
        if(notificationsUpdate) {
            res.send({status: true, notificationsUpdate })
        } else {
            throw 'not updated'
        }
    } catch (error) {
        res.send({ status: false, error})   
    }
})



function chunk(arr: any[], chunkSize: number) {
    if (chunkSize <= 0) throw "Invalid chunk size";
    let R = [];
    for (let i = 0, len = arr.length; i < len; i += chunkSize)
        R.push(arr.slice(i, i + chunkSize));
    return R;
}

export interface IDeviceInfo {
    deviceName: string,
    deviceOS: string
}