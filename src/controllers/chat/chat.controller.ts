import { Router } from 'express';
import { Posts } from '../../models/social-media/post.model';
// import {Comment} from '../../models/social-media/comment.model';
import { User } from '../../models/user.model';
import { Chat, UserChatMessages, UserConversation } from '../../models/social-media/chat.model';
import { ReportAbuse } from '../../models/social-media/reportabuse.model'
import { userAuthenticate } from '../../middlewares/userAuthenticate.middleware';
import moment from 'moment';
import mongoose, { mongo, Mongoose } from 'mongoose';
import { getConversationIdFromParticipants } from './chat-helper';
import { UserFollowers } from '../../models/userFollowings';

export const chatRouter = Router();

//This router is for chat post
chatRouter.get('/chat', async (req, res) => {
    try {
        console.log("Inside chat....");
        // const userId = req.user._id;
        const chatObj = JSON.parse(req.query.chatObj as string);
        chatObj.ts = moment().utc().toDate()

        const senderId = chatObj.sender;
        const recieverIds = chatObj.participants.map((x: any) => mongoose.Types.ObjectId(x.user));
        recieverIds.push(mongoose.Types.ObjectId(senderId));
        // const username = req.username;

        // console.log("chatObj :" + chatObj);
        // const chatSaved = await Chat.create((chatObj));
        // if (chatSaved)
        //     res.json({ status: true, chatSaved }).status(200);
        // else
        //     res.json({ status: false }).status(400);

        //checking if conversation already present
        let conversation = await UserConversation.findOne({ participants: { $all: recieverIds } });
        if(!conversation) {
            conversation = await UserConversation.create({ 
                participants: recieverIds
             });
        }
        // saving chat
        const message = chatObj.messages[0].message;
        const repliedTo = chatObj.repliedTo;
        const userMessageObj = await UserChatMessages.create({
            conversationId: conversation._id,
            ts: moment().utc().toDate(),
            message: message,
            sentBy: senderId,
            repliedTo: repliedTo
        })

        res.json({ status: true, userMessageObj }).status(200);
    } catch (error) {
        //Response send to 
        res.send({ status: false, message: "Request Failed " + error });
        // console.log(()
    }

})

chatRouter.get('/chatsByUserId',userAuthenticate, async (req, res) => {
    try {

        const userId = req.user._id;
      
        const chatList = await UserConversation.aggregate([
            {
                $match: {
                    participants: mongoose.Types.ObjectId(userId)
                }
            },
            { 
                $lookup : {
                    from: "userchatmessages",
                    as: "lastMessage",
                    let: { "id": "$_id" },
                    localField: '_id',
                    foreignField: 'conversationId',
                    pipeline: [
                        { "$sort": { "ts": -1 } },
                        { "$limit": 1 }
                    ]
                }
            },
            {
                $unwind: '$lastMessage'
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participants',
                    pipeline: [
                        { $project : { username: 1, profileImgUrl: 1, isInfluencer: 1 } }
                    ]
                }
            },
            {
                $sort: {
                    "lastMessage.ts": -1
                }
            }
        ])
        if (chatList)
            res.json({ status: true, chatList }).status(200);
        else
            res.json({ status: false }).status(400);

    } catch (error) {
        res.send({ status: false, message: "Request Failed " + error });
    }

})
// userAuthenticate
chatRouter.get('/getChatsByConversationId/:conversationId',userAuthenticate, async (req, res) => {
    try {

        // const userId = req.user._id;
        const conversationId = req.params.conversationId;
        // const chatList = await UserChatMessages.find({ conversationId })
        // .sort({_id: -1})
        const chatList = await UserChatMessages.aggregate([
            {
                $match: {
                    conversationId: mongoose.Types.ObjectId(conversationId)
                }
            },
            {
                $lookup: {
                    from: 'userchatmessages',
                    localField: 'repliedTo',
                    foreignField: '_id',
                    as: 'repliedToMessage',
                }
            },
            {
                $unwind: {
                    path: "$repliedToMessage",
                    preserveNullAndEmptyArrays: true
                  }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts"} },
                    messages: { $push: "$$ROOT" },
                    
                }
            },
            
            {
                $sort: {
                  _id: -1
                }  
              },
           
        ])
        const conversation = await UserConversation.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId(conversationId)
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participants',
                    pipeline: [
                        { $project : { username: 1, profileImgUrl: 1, isInfluencer: 1 } }
                    ]
                }
            }
        ])
        let conversationObj;
        if(conversation) {
            conversationObj = conversation[0]
        }
        
        if (chatList)
            res.json({ status: true, chatList, conversationObj }).status(200);
        else
            res.json({ status: false }).status(400);
    } catch (error) {
        res.send({ status: false, message: "Request Failed " + error });

    }

})


chatRouter.post('/getConversationIdByParticipants',userAuthenticate, async (req, res) => {
    try {
        const participants = req.body.participants;
        const participantsIds = participants.map((x: any) => mongoose.Types.ObjectId(x));

        let conversation = await getConversationIdFromParticipants(participantsIds)

        res.json({ status: true, conversation }).status(200);

    } catch (error) {
        res.send({ status: false, message: "Request Failed " + error });

    }

})

chatRouter.get('/getParticipantsByConversationId/:conversationId',userAuthenticate, async (req, res) => {
    try {
        const conversationId = req.params.conversationId;


        let conversation = await UserConversation.findOne({ _id: conversationId }).populate('participants', 'username profileImgUrl isInfluencer');


        res.json({ status: true, conversation }).status(200);

    } catch (error) {
        res.send({ status: false, message: "Request Failed " + error });

    }

})

chatRouter.get('/searchUser/:searchString', userAuthenticate, async (req, res) => {
    const userId = req.user._id;
    const skip = Number(req.query.offset) || 0;
    const limit = Number(req.query.limit) || 10
    const searchString = req.params.searchString;
    const userFollowingIds = (await UserFollowers.find({follower_id: userId, isUnfollowed: false})).map((x: any) => mongoose.Types.ObjectId(x.user_id));

    const userList = await User.find({ 
            $and: [
                { $or: [{ name: { $regex: '.*' + searchString + '.*' } }, { username: { $regex: '.*' + searchString + '.*' } }]  },
                { _id: { $not: {$eq: mongoose.Types.ObjectId(userId)} } },
                { _id: { $in: userFollowingIds}}
            ],
        })
        .skip(skip)
        .limit(limit)

        .select({ _id: 1, name: 1, username: 1, profileImgUrl: 1 })
    if (userList)
        res.json({ status: true, userList: userList }).status(200);
    else
        res.json({ status: false }).status(400);

})
