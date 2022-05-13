import express from 'express';
import { coinRouter } from './controllers/coin/coin.controller';
import { userRouter } from './controllers/user/user.controller';
import { chatRouter } from './controllers/chat/chat.controller';
import { socialmediaRouter } from './controllers/social-media/social-media.controller';
import { shopRouter } from './controllers/shop/shop.controller';

declare global{
    namespace Express {
        interface Request {
            user: {
                _id: string
            },
            token: string,
            username: string
        }
    }
}

export function routerConfig(app: express.Application) {


    app.use('/user', userRouter);
    app.use('/coin', coinRouter);
    app.use('/social', socialmediaRouter);
    app.use('/chat',chatRouter);
    app.use('/shop',shopRouter);

}

