import express from 'express';
import * as bodyParser from 'body-parser'
import cors from "cors";
import { routerConfig } from './routes';
import { connectMongoose } from './mongooseConnect';
const requestIp = require('request-ip');
var fs = require('fs');

const app = express();
const dotenv = require('dotenv');
dotenv.config();
app.use(bodyParser.urlencoded({
    extended: true,
  }));
var corsOptions = {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    exposedHeaders: ['x-auth', 'x-auth-admin']
};
//cors use in middleware 
app.use(cors(corsOptions));
app.set('trust proxy', true);
routerConfig(app);
app.use(requestIp.mw({ attributeName: 'clientIp' }))

//Mongoose Connect
connectMongoose();

// View Engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/', (req, res) => {
    console.log(process.env.API_URL);
    // res.send('Hello World')
    res.render('index')
});

var https = require('https');
var http = require('http');

var privateKey = fs.readFileSync('/etc/letsencrypt/live/protonode.ga/privkey.pem', 'utf8');
var certificate = fs.readFileSync('/etc/letsencrypt/live/protonode.ga/fullchain.pem', 'utf8');

var credentials = { key: privateKey, cert: certificate };


// var server = require('https').createServer(credentials, app);
// server.listen(12002, () =>
//     console.log('Example app listening on port 12002!')
// );

var server = require('http').createServer(app);
server.listen(12002, () =>
    console.log('Example app listening on port 12002!')
);