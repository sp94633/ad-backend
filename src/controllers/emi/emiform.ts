import {Router} from 'express';
import {EmiForm} from '../../models/emi-form';

const formRouter = Router();

formRouter.post('/form',async(formData:any)=>{
    const form_data = formData;
    try {
        let formPosted = EmiForm.create(formData);
    } catch(error) {

    }
})