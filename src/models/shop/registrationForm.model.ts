import mongoose, { Model } from 'mongoose';
const Schema = mongoose.Schema;

export const SellerRegistrationForm = mongoose.model('SellerRegistrationForm', new Schema({

    identityDocument: {type: String},
    selfieDocument: {type: String},
    currentStep: {type: Number},
    category: [{ type: String }],
    isAcceptedTerms: { type: Boolean },
    createdDate: {type: Date},
    lastUpdatedDate: {type: Date},
    currentStatus: {type: String},
    qaResponse: { type: Schema.Types.Mixed },
    userId: { type: Schema.Types.ObjectId, ref: 'User' , required: true},

}))
SellerRegistrationForm.createIndexes({ userId: 1 })