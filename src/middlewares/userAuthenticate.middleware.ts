import { Token } from "../models/token.model";

const jwt = require('jsonwebtoken');

export function userAuthenticate(req: any, res: any, next: () => void) {
    var tokenString = req.header('x-auth');
    jwt.verify(tokenString, process.env.TOKEN_SECRET_KEY, function (err: any, decoded: any) {
        if (err) {
            //console.log(err);
            res.status(401).send({ message: 'Unauthorized Access. Please Login Again', status: false });
        }
        else {
             updateToken(tokenString).then(token => {
                const tokenObj: any = token.toObject();
                req.user = tokenObj.userId;
                req.username = decoded.username;
                req.token = tokenObj.tokenString;
                next()
            })
            .catch(err => {
                res.status(401).send({ message: 'Unauthorized Access. Please Login Again', status: false });
            })
            
           
        }
    });
};

const updateToken =  (tokenString: string) => {
    // Implement TOKEN Expiration here if needed
    return Token.findOneAndUpdate({ tokenString, isActive: true }, { lastUsedDate: new Date() })
}