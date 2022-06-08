import mongoose, { Model } from 'mongoose';
const Schema = mongoose.Schema;

export const EmiForm = mongoose.model('EmiForm', new Schema({

    emi_amount: { type: String , required: true},
    userId: { type: Schema.Types.ObjectId, ref: 'User' , required: true},
    address_line_1: { type: String , required: true},
    address_line_2: { type: String },
    createdDate: { type: Date },
    lastUpdatedAt: { type: Date },
    adhar_no:{type:Number},
    pan_no:{type:String},
   // relation_1 :{type: Schema.Types.ObjectId, ref: 'User' , required: true}
   relations :[{type:String},{type:String},{type:Number}]
    

}))
