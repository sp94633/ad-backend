
const nodemailer = require("nodemailer");
import { EmailFailed } from "../models/user.model";
import { key } from "../comicaisle-gmail-key";
const mailgun = require("mailgun-js");
const AWS = require('aws-sdk');
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;



// export const mailer = (to: string, from: string, subject: string, body: string) => {
//     return new Promise((resolve, reject) => {
//         var transporter = nodemailer.createTransport({
//             // host: 'mail.comicaisle.com',
//             port: 465,
//             name: "gmail.com",
//             secure: true,
//             // secure: true,
//             service: 'gmail',
//             host: 'smtp.gmail.com',
//             auth: {
//               type: "OAuth2",
//               user: process.env.email,
//               // pass :  process.env.password,
//               serviceClient: key.client_id,
//               privateKey: key.private_key
//             },
//           });
    
//           var mailOptions = {
//             from: from,
//             to: to,
//             subject: subject,
//             html: body,
//           };
         
//           transporter.sendMail(mailOptions, function (error: any, success: any) {
//             if (error) {
//                 // reject('Something went wrong while sending you email....')
//                 EmailFailed.create(mailOptions);
//             }
//             resolve(true)
//           });
//     })
    
// }

export const mailer = (to: string, from: string, subject: string, body: string) => {
  return new Promise((resolve, reject) => {

    const mg = mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});
    const data = {
      from: 'no-reply@comicaisle.org',
      to: to,
      subject: subject,
      html: body
    };
    mg.messages().send(data, function (error: any, body: any) {
      console.log(body);
      if(error) {
        reject(error)
      }
      resolve(body)
    });
  })
}

//Amazon SES email

// export const mailer = (to: string, from: string, subject: string, body: string) => {
//   return new Promise((resolve, reject) => {

//     require('dotenv').config();
//     const SESConfig = {
//       'apiVersion':'2010-12-01',
//       'accessKeyId':process.env.AWS_SES_ACCESS_KEY_ID,
//       'secretAccessKey':process.env.AWS_SES_SECRET_ACCESS_KEY,
//       'region':process.env.AWS_SES_REGION,
//     }

//     let params = {
//       Destination: {
//         /* required */
//         ToAddresses: [to]
//       },
//       Message: {
//         /* required */
//         Body: {
//           /* required */
//           Html: {
//             Charset: "UTF-8",
//             Data: body
    
//           },
      
//         },
//         Subject: {
//           Charset: 'UTF-8',
//           Data: subject
//         }
//       },
//       Source: from,

//       ReplyToAddresses: [from, /* more items */ ],
//     }

//     new AWS.SES(SESConfig).sendEmail(params).promise().then((res:any)=>{
//       console.log(res);
//       resolve(body);
//     }).catch((error:any)=>{
//       reject(error);
//     })

//   })
// }