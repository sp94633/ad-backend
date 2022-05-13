import { Token } from "../../models/token.model";
var bcrypt = require('bcryptjs');
import { Document } from 'mongoose';
import mongoose from 'mongoose';

const saltRounds = 10;
var jwt = require('jsonwebtoken');
import { mailer } from "../mailer.controller";
let ejs = require('ejs');
let path = require('path');
import { User } from '../../models/user.model';

import moment from "moment";
import { Notification } from "../../models/notification.model";

export const encryptPassword = (password: string) => {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, saltRounds, (err: any, hash: any) => {
            if (err) reject(err);
            resolve(hash);
        });
    })

}

export const _checkIfEmailExists = async (email: string) => {
    try {
        const user = await User.findOne({email: email});
        if (user) return user;
        return false;
    } catch (error) {
        console.error(error);
        throw error; 
    }   
}

export const checkPassword = (password: string, hash: string) => {
    return new Promise((resolve, reject) => {
        bcrypt.compare(password, hash, (err: any, result: any) => {
            if (err) reject(err);
            resolve(result);
        });
    });

}

export const generateToken = (user: Document, ip: string, deviceInfo: any): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        let tokenCreatedDate = new Date().toUTCString();
        let userObj: any = user.toObject();
        userObj.tokenCreatedDate = tokenCreatedDate;
        const token = jwt.sign(userObj, process.env.TOKEN_SECRET_KEY);
        await saveToken(token, ip, false, deviceInfo, user.toObject()._id, 'LoginToken')
        resolve(token)
    })
}

export const generateForgotPasswordToken = async (userId: string, ip: any, deviceInfo: any) => {
    try {
        const object = {
            userId,
            tokenCreatedDate:  moment.utc().toDate()
        }
        const tokenString = jwt.sign(object, process.env.PASSWORD_RESET_KEY);
        await saveToken(tokenString, ip, false, deviceInfo, userId, 'isForgotPasswordToken')

        return tokenString;
          
    } catch (error) {
        throw error;
        
    }
}

export const generateUserVerificationToken = async (userId: string) => {
    try {
        const object = {
            userId,
            tokenCreatedDate:  moment.utc().toDate()
        }
        const tokenString = jwt.sign(object, process.env.PASSWORD_RESET_KEY);
        let deviceInfo = {
            device: 'email',
            os: '',
            browser: '',
            browser_version: ''
        };
        await saveToken(tokenString, '', false, deviceInfo, userId, 'isEmailToken')

        return tokenString;
          
    } catch (error) {
        throw error;
        
    }
}

export const decodeForgotPasswordToken =  async (tokenString: string) => {
    return new Promise(async(resolve, reject) => {
        const token: any = await Token.findOne({tokenString, isActive: true, isForgotPasswordToken: true });
        if(token) {
            jwt.verify(tokenString, process.env.PASSWORD_RESET_KEY,  async (err: any, decoded: any) => {
                if (err) {
                    reject(err);
                } else {
                  await Token.updateOne({_id: token._id}, { isActive: false, lastUsedDate: new Date()  })
                  resolve(token.userId)
                }
            })
        } else {
            reject("Link Invalid or Expired")
        }
    })
        
}

export const saveToken = (tokenString: String, ip: String, isAPI: Boolean, device: any, userId: string, type: string) => {
    return new Promise(async (resolve, reject) => {
        const token = await Token.create({
            tokenString,
            userId,
            ip,
            deviceName: device.device || '',
            deviceOS: device.os || '',
            browser: device.browser || '',
            browserVersion: device.browser_version || '',
            isAPI,
            createdDate:  moment.utc().toDate().toUTCString(),
            isActive: true,
            isForgotPasswordToken: type === "isForgotPasswordToken" ? true : false,
            isEmailToken: type === "isEmailToken" ? true : false,
        }).catch(err => reject(err));
        resolve(token);
    })
}


export const sendVerficationLink = async (userId:any, userEmail: any,verificationToken:any) => {
    try {
        const verificationLink = `${process.env.BACKEND_APP_DOMAIN}/user/verify-account-email/${userId}/${verificationToken}?test=true`;
        const htmlBody = await ejs.renderFile( path.join(__dirname , '../../views/email-verification-template.ejs') , {url: verificationLink});
        // const htmlBody = `Verify your email. `
        await mailer(userEmail, process.env.email, 'Comic Aisle Verification Email', htmlBody);
    } catch (error) {
        throw error;
    }
}

export const sendForgotPasswordLink =async (userId:string, userEmail: string, tokenString: string) => {
    try {
        const verificationLink = `${process.env.FRONTEND_APP_DOMAIN}/auth/reset-password/${userId}/${tokenString}`;
        const htmlBody = await ejs.renderFile( path.join(__dirname , '../../views/forgot-password-template.ejs') , {url: verificationLink});
        await mailer(userEmail, process.env.email, 'Password Reset Email', htmlBody);
    } catch (error) {
        throw error;
    }
}

export const logoutUser = async (userId: any, tokenString: string) => {
    try {
        const updatedToken = await Token.findOneAndUpdate({tokenString}, {isActive: false})
        return updatedToken;
    } catch (error) {
        throw error;
    }
}

export const addNotification = async (to: string, from: string,notificationActions: string, message: string, actionId: string) => {
    try {
        const notificationObj = {
            to,
            from,
            action: notificationActions,
            createdDate:  moment.utc().toDate(),
            message,
            actionId: mongoose.Types.ObjectId(actionId)
        }
        const notification = await Notification.create(notificationObj);

    } catch (error) {
        throw error;
    }
}