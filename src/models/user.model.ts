import mongoose, { Model, SchemaType } from 'mongoose';
const Schema = mongoose.Schema;

export const User = mongoose.model('User', new Schema({
    name: { type: String, required: true },
    email: { type: String, 
            trim: true,
            lowercase: true,
            unique: true,
            required: true,
            validate: [(email: string) => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)
            , 'Please fill a valid email address'],
            match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
        },
    description: {type: String},
    gender: {type: String},
    username: {type: String, unique: true, required: true},
    occupation: {type: String},
    mobileNo: { type: String },
    countryCode: {type: String},
    createdDate:  { type: Date },
    isInfluencer: {type: Boolean, default: false},
    influencerAcceptanceDate: {type: Date},
    isSeller: {type: String, default: false},
    password: { type: String, required: true},
    verificationToken: {type: String},
    IsVerified: { type: Boolean, default: false },
    preferredLanguage: { type: String, default: "en" },
    reference: { type: String },
    VerificationDate: { type: Date },
    profileImgUrl: {type: String},
    profileCoverImgUrl : {type: String},
    refernceIdUsed: {type: String},
    followersCount: {type: Number, default: 0},
    followingCount:{type: Number, default: 0},
    referredUsers: [{ type: mongoose.Types.ObjectId }]
}));
User.createIndexes({ _id: 1 })



export const EmailFailed = mongoose.model('EmailFailed', new Schema({
    from: String,
    to: String,
    subject: String,
    html: String,
}))