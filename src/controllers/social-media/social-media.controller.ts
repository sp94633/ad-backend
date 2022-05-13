import { Router } from 'express';
import { Posts } from '../../models/social-media/post.model';
import { PostComment } from '../../models/social-media/comment.model';
import { User } from '../../models/user.model';
import { ReportAbuse } from '../../models/social-media/reportabuse.model'
import { userAuthenticate } from '../../middlewares/userAuthenticate.middleware';

import mongoose from 'mongoose';

import moment from 'moment';
import { getMultipleSignedUrl, getS3SignedUrl } from '../file.controller';
import { UserFollowers } from '../../models/userFollowings';
import { addTransaction } from '../coin/coin.helper';
import { CoinTransactionTypeEnum, SystemGeneratedTransactionCodesEnum } from '../../models/coins.model';
import { followUser, getPostByPostId, getPostByPostList } from './social-media.helper';
import { PostLike } from '../../models/social-media/postLike.model';
import { addNotification } from '../user/user-helper';
import { NotificationActions } from '../../models/notification.model';
import { getConversationIdFromParticipants } from '../chat/chat-helper';
// const aws = require("aws");
// const AWS = require('aws-sdk');







export const socialmediaRouter = Router();
// Create a new post
socialmediaRouter.post('/post', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const description = req.body.description;
        const username = req.username;
        const imageVideoUrl = req.body.imageVideoUrl;
        const isGiveAway = req.body.isGiveAway;
        const isCommentsOff = req.body.isCommentsOff;
        const ts = moment().utc();
        const createdPost = await Posts.create({ description: description, by: { id: userId, name: username }, imageVideoUrl: imageVideoUrl, ts: ts, isGiveAway, isCommentsOff });
        const newPost = await getPostByPostId(createdPost._id, userId);

        if (createdPost)
            res.json({ status: true, newPost }).status(200);
        else
            res.json({ status: false }).status(400);

    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }

})

// Reshare a post
socialmediaRouter.post('/post-reshare', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const postId = req.body.postId;
        const description = req.body.description;
        const username = req.username;
        const ts = moment().utc();
        const resharedPost = await Posts.create({ description: description, by: { id: userId, name: username }, reshared_post_id: postId, reshared_by: { id: userId, name: username }, isReshared: true, isGiveAway: false, ts: ts });
        const updatedPost: any = await Posts.findOneAndUpdate({ _id: postId }, { $inc: { reshareCount: 1 } })
        const newPost = await getPostByPostId(resharedPost._id, userId);
        if(userId.toString() !== updatedPost.by.id.toString()) {
            addNotification(updatedPost.by.id, userId, NotificationActions.Share, 'Shared Post', resharedPost._id);
        }
        addTransaction(userId, req.token, Number(process.env.COIN_ON_RESHARE), CoinTransactionTypeEnum.Credit, `Reshared Post by ${req.username}`, SystemGeneratedTransactionCodesEnum.Reshare);

        if (resharedPost)
            res.json({ status: true, newPost }).status(200);
        else
            res.json({ status: false }).status(400);

    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }

})


// Update post
socialmediaRouter.put('/post', userAuthenticate, async (req, res) => {
    try {
        const postId = req.body.postId;
        const userId = req.user._id;
        const username = req.username;
        const isGiveAway = req.body.isGiveAway;
        const isCommentsOff = req.body.isCommentsOff;

        const description = req.body.description;
        const imageVideoUrl = req.body.imageVideoUrl;
        const update = await Posts.update({ _id: postId }, { description: description, by: { id: userId, name: username }, imageVideoUrl: imageVideoUrl, isGiveAway, isCommentsOff});
        const updatedPost = await getPostByPostId(postId, userId);
        if (update)
            res.json({ status: true, updatedPost }).status(200);
        else
            res.json({ status: false }).status(400);
    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }

})

socialmediaRouter.delete('/deletePost/:postId', userAuthenticate, async (req, res) => {
    try {
        const postId = req.params.postId;
        const json = {
            isRemoved: true,
            removedDate: moment().utc(),
            removedBy: req.user._id
        }
        const updatedPost = await Posts.updateOne({ _id: postId }, json);
        if (updatedPost)
            res.json({ status: true }).status(200);
        else
            res.json({ status: false }).status(400);

    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }

})


//Read Post
socialmediaRouter.get('/post/:id', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;

        const postId = req.params.id;
        const postResult = await getPostByPostId(postId, userId)
        if (postResult)
            res.json({ status: true, post_result: postResult }).status(200);
        else
            res.json({ status: false }).status(400);
    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }
})

socialmediaRouter.get('/postByUser/:userId', userAuthenticate, async (req, res) => {
    const userId = req.params.userId;
    const postResult = await getPostByPostList({ isRemoved: false, "by.id": mongoose.Types.ObjectId(userId) }, userId)
    const userDetails = await User.findById(userId).select('-influencerAcceptanceDate -password -verificationToken -IsVerified -reference');
    const isFollowed = await UserFollowers.count({ user_id: userId, follower_id: req.user._id, isUnfollowed: false });
    const postCount = await Posts.count({ "by.id": mongoose.Types.ObjectId(userId), isRemoved: false});

    const participantsIds = [mongoose.Types.ObjectId(req.params.userId), req.user._id];
    const conversationId = (await getConversationIdFromParticipants(participantsIds))._id
    if (postResult)
        res.json({ status: true, post_result: postResult, userDetails, isFollowed, conversationId, postCount }).status(200);
    else
        res.json({ status: false }).status(400);
})
//Delete a post
socialmediaRouter.delete('/delete/:id', async (req, res) => {
    const postId = req.params.id;
    const deletedPost = await Posts.deleteOne({ _id: postId });
    if (deletedPost)
        res.json({ status: true }).status(200);
    else
        res.json({ status: false }).status(400);
})

// Get 1 last post from each follower
socialmediaRouter.get('/posts/:id', async (req, res) => {
    const userId = req.query.id;
    const followersID = await User.aggregate([

        {
            $match: { _id: userId }
        },
        {
            $project: { following: 1 }
        }

    ]).catch((err: any) => {

    });
    console.log("Followers ID :" + followersID);
    const postList = await Posts.find({ 'by.id': { $in: followersID } });
    if (postList)
        res.json({ status: true, posts: postList }).status(200);
    else
        res.json({ status: false }).status(400);

})


socialmediaRouter.get('/getfeed', userAuthenticate, async (req, res) => {
    // const userId = req.query.id;
    const userId = req.user._id;
    const limit = Number(req.query.limit) || null;
    const offset = Number(req.query.offset) || null;
    const postList = await getPostByPostList({ isRemoved: false }, userId, limit, offset)
    // const postList = await Posts.find({ isRemoved: false }).populate("by.id", '_id username profileImgUrl isInfluencer')
    //     // .populate('comments.by.id', '_id username profileImgUrl isInfluencer')
    //     .populate({
    //         path: 'reshared_post_id',
    //         populate: {
    //             path: 'by.id'
    //         }
    //     })

    //     .sort({ _id: -1 });
    if (postList)
        res.json({ status: true, posts: postList }).status(200);
    else
        res.json({ status: false }).status(400);

})

socialmediaRouter.get('/getGiveaway', userAuthenticate, async (req, res) => {
    // const userId = req.query.id;
    const userId = req.user._id;
    const limit = Number(req.query.limit) || null;
    const offset = Number(req.query.offset) || null;
    const postList = await getPostByPostList({ isRemoved: false, isGiveAway: true }, userId, limit, offset)
    // const postList = await Posts.find({ isRemoved: false }).populate("by.id", '_id username profileImgUrl isInfluencer')
    //     // .populate('comments.by.id', '_id username profileImgUrl isInfluencer')
    //     .populate({
    //         path: 'reshared_post_id',
    //         populate: {
    //             path: 'by.id'
    //         }
    //     })

    //     .sort({ _id: -1 });
    if (postList)
        res.json({ status: true, posts: postList }).status(200);
    else
        res.json({ status: false }).status(400);

})
socialmediaRouter.get('/searchUser/:searchString', userAuthenticate, async (req, res) => {
    const userId = req.user._id;

    const searchString = req.params.searchString.toLowerCase();
    const userList = await User.find({
        $and: [
            { $or: [{ name: { $regex: '.*' + searchString + '.*' } }, { username: { $regex: '.*' + searchString + '.*' } }] },
            { _id: { $not: { $eq: mongoose.Types.ObjectId(userId) } } },
            {
                IsVerified: true
            }
        ],
    })
        .select({ _id: 1, name: 1, username: 1, profileImgUrl: 1 })
    if (userList)
        res.json({ status: true, userList: userList }).status(200);
    else
        res.json({ status: false }).status(400);

})

// Like a post
socialmediaRouter.post('/likeUnlikeToogle', userAuthenticate, async (req, res) => {
    try {
        const postId = req.body.postId;
        const userId = req.user._id;
        const username = req.username;
        const token = req.token;

        const post = await Posts.findById(postId);
        if (post) {
            const postObj: any = post.toObject();
            const postUserId = postObj.by.id.toString();
            const likeAmount = Number(process.env.COIN_ON_LIKE);

            const isLikedPost = await PostLike.findOne({ userId, postId, isUnliked: false })
            if (isLikedPost) { // already liked and we will unlike it now
                await isLikedPost.update({ isUnliked: true, unlikedDate: moment().utc() });
                await post.updateOne({ $inc: { likesCount: -1 } });
                addTransaction(postUserId, token, likeAmount, CoinTransactionTypeEnum.Debit, `Unlike On Post by ${req.username}`, SystemGeneratedTransactionCodesEnum.Like);

            } else { // new like
                await PostLike.create({ userId, postId, ts: moment().utc() });
                await post.updateOne({ $inc: { likesCount: 1 } });
                addTransaction(postUserId, token, likeAmount, CoinTransactionTypeEnum.Credit, `Like On Post by ${req.username}`, SystemGeneratedTransactionCodesEnum.Like);
               if(postUserId !== userId.toString()) {
                   addNotification(postUserId, userId, NotificationActions.Like, 'Liked on post', postId);
               }

            }
            res.json({ status: true, like: !!!isLikedPost }).status(200);

        } else {
            throw "Invalid Post Id";
        }
    } catch (error) {
        res.json({ status: false, message: error }).status(400);
    }

    // const by = { id: userId, name: username, ts: moment().utc() };


    // //const isLiked = Posts.find({likes:{}})
    // // const like = await Posts.updateOne({ _id: postId }, { $push: { likes: by } })
    // const post = await Posts.findOneAndUpdate({ _id: postId }, { $push: {likes: by} })
    // if (post) {
    //     const postObj: any = post.toObject();
    //     const postUserId = postObj.by.id.toString();
    //     const likeAmount = Number(process.env.COIN_ON_LIKE);
    //     addTransaction(postUserId, req.token,likeAmount , 'Credit', `Like On Post by ${req.username}` , SystemGeneratedTransactionCodesEnum.Like);
    //     res.json({ status: true }).status(200);
    // }
    // else
    //     res.json({ status: false }).status(400);
})



// Like a post /// To be coded
socialmediaRouter.post('/unlike', userAuthenticate, async (req, res) => {
    const postId = req.body.postId;
    const userId = req.user._id;
    const username = req.username;
    const by = { id: userId, name: username, ts: moment().utc() };
    //const isLiked = Posts.find({likes:{}})
    const like = await Posts.updateOne({ _id: postId }, { $pop: { likes: by } })
    if (like) {
        const likeAmount = Number(process.env.COIN_ON_LIKE);
        addTransaction(userId, req.token, likeAmount, 'Credit', `Unliked Post ${postId}`, SystemGeneratedTransactionCodesEnum.Like);
        res.json({ status: true }).status(200);
    }
    else
        res.json({ status: false }).status(400);
})

// Comment on post

socialmediaRouter.post('/commentByPostId', userAuthenticate, async (req, res) => {
    try {
        const postId = req.body.postId;
        const offset = req.body.offset || 0;
        const comments = await PostComment.find({ postId: postId, isRemoved: false }).sort('desc').skip(offset).limit(5).populate("by", '_id username profileImgUrl isInfluencer');
        // const commentsCount = await PostComment.count({postId: postId});

        res.json({ status: true, comments, }).status(200);

    } catch (error) {
        res.json({ status: false, error }).status(400);

    }


})

socialmediaRouter.post('/comment', userAuthenticate, async (req, res) => {
    const userId = req.user._id;
    const username = req.username;
    const postId = req.body.postId;

    const comment = req.body.comment;

    let commentObj = {
        ts: moment().utc(),
        by: userId,
        text: comment
    }

    let addComment = await PostComment.create({ postId: postId, by: commentObj.by, ts: commentObj.ts, text: commentObj.text });

    if (addComment) {
        const commentAmount = Number(process.env.COIN_ON_COMMENT);
        const commentObj: any = addComment.toObject();
        const postUserId = commentObj.by.toString();

        const comment = await PostComment.find({ _id: commentObj._id }).populate("by", '_id username profileImgUrl isInfluencer')
        await Posts.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } })
        const postObject: any = await Posts.findOne({_id : postId});
        const postCreatedBy = postObject.by.id;
        addTransaction(postCreatedBy, req.token, commentAmount, 'Credit', `Comment On Post by ${req.username}`, SystemGeneratedTransactionCodesEnum.Comment);
       if(postCreatedBy.toString() !== postUserId) {
           addNotification(postCreatedBy, postUserId, NotificationActions.Comment, 'Comment On Post', postId);
       }


        res.json({ status: true, comment }).status(200);
    }
    else
        res.json({ status: false }).status(400);

})

//Edit Comment

socialmediaRouter.put('/comment/:id', userAuthenticate, async (req, res) => {
    const userId = req.user._id;
    const commentId = req.body.commentId;
    const username = req.username;
    const postId = req.body.postId;
    const isNewComment = true;
    // req.body.isNew ||
    const comment = req.body.comment;


    let addComment = await PostComment.updateOne({ _id: commentId, by: userId }, { text: comment });
    if (addComment) {
        const commentAmount = Number(process.env.COIN_ON_COMMENT);

        // addTransaction(userId, req.token,commentAmount , 'Credit', `Commented on Post ${postId}` , SystemGeneratedTransactionCodesEnum.Comment);

        res.json({ status: true }).status(200);
    }
    else
        res.json({ status: false }).status(400);

})

//Delete a comment
socialmediaRouter.post('/deleteComment', userAuthenticate, async (req, res) => {
    const userId = req.user._id;
    const username = req.username;
    const postId = req.body.postId;
    const commentId = req.body.commentId;
    let addComment = await PostComment.updateOne({ _id: commentId, by: userId }, { isRemoved: true, removedDate: moment().utc() });

    if (addComment) {
        const commentAmount = Number(process.env.COIN_ON_COMMENT);
        await Posts.updateOne({ _id: postId }, { $inc: { commentsCount: -1 } })

        addTransaction(userId, req.token, commentAmount, CoinTransactionTypeEnum.Debit, `Deleted Comment on Post ${postId}`, SystemGeneratedTransactionCodesEnum.Comment);

        res.json({ status: true }).status(200);
    }
    else
        res.json({ status: false }).status(400);

})



//Report a post as abuse


// Follow User
socialmediaRouter.get('/checkIfUserFollowed/:id', userAuthenticate, async (req, res) => {
    try {
        const userId = req.params.id;
        const loggedInUserId = req.user._id;
    
        const isFollowed = await UserFollowers.count({
            user_id: userId,
            follower_id: loggedInUserId,
            isUnfollowed: false,
        })
        res.json({ status: true, isFollowed }).status(200);

    } catch (error) {
        res.json({ status: false }).status(400);
        
    }
   

})
socialmediaRouter.post('/follow/:id', userAuthenticate, async (req, res) => {
    try {
        const userId = req.params.id;
        const loggedInUserId = req.user._id;

        const follow = await followUser(userId, loggedInUserId);
        res.json({ status: true }).status(200);
        // const json = {
        //     user_id: userId,
        //     follower_id: loggedInUserId,
        //     createdDate: moment().utc(),
        // }
        // const isFollowed = await UserFollowers.count({
        //     user_id: userId,
        //     follower_id: loggedInUserId,
        //     isUnfollowed: false,
        // })
        // if (!isFollowed) {
        //     const follow = await UserFollowers.create(json);
        //     await User.updateOne({ _id: userId }, { $inc: { followersCount: 1 } });
        //     await User.updateOne({ _id: loggedInUserId }, { $inc: { followingCount: 1 } });

        //     addNotification(userId, loggedInUserId, NotificationActions.Followed, 'Followed you', loggedInUserId);

        //     if (follow) {
        //         res.json({ status: true }).status(200);
        //     }
        //     else {
        //         res.json({ status: false }).status(400);
        //     }
        // } else {
        //     res.json({ status: false, error: 'Already Followed' }).status(400);

        // }
    } catch (error) {
        res.send({ status: false, message: error })
    }
})

// Unfollow User

socialmediaRouter.put('/unfollow/:id', userAuthenticate, async (req, res) => {
    try {
        const userId = req.params.id;
        const loggedInUserId = req.user._id;
        const query = {
            user_id: userId,
            follower_id: loggedInUserId,
            isUnfollowed: false
        }
        const follow = await UserFollowers.updateOne(query, { isUnfollowed: true, unfollowedDate: moment().utc() })
        await User.updateOne({ _id: userId }, { $inc: { followersCount: -1 } });
        await User.updateOne({ _id: loggedInUserId }, { $inc: { followingCount: -1 } });
        if (follow) {
            res.json({ status: true }).status(200);
        }
        else {
            res.json({ status: false }).status(400);
        }
    } catch (error) {
        res.send({ status: false, message: "unfollow Failed" })
    }
})

// Get Followers and Following
socialmediaRouter.get('/followers-following', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const followersCount = await UserFollowers.count({ user_id: userId, isUnfollowed: false });
        const followingCount = await UserFollowers.count({ follower_id: userId, isUnfollowed: false });

        res.json({ status: true, followersCount, followingCount }).status(200)
    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }
})
socialmediaRouter.get('/followers/:userId', userAuthenticate, async (req, res) => {
    try {
        const userId = req.params.userId;
        const skip = Number(req.query.offset) || 0;
        const limit = Number(req.query.limit) || 10

        const followers = await UserFollowers.find({ user_id: userId, isUnfollowed: false })
            .skip(skip)
            .limit(limit)
            .populate("follower_id", '_id username profileImgUrl isInfluencer name');


        res.json({ status: true, followers }).status(200)
    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }
})
socialmediaRouter.get('/followings/:userId', userAuthenticate, async (req, res) => {
    try {
        const userId = req.params.userId;
        const skip = Number(req.query.offset) || 0;
        const limit = Number(req.query.limit) || 10


        const followings = await UserFollowers.find({ follower_id: userId, isUnfollowed: false })
            .skip(skip)
            .limit(limit)
            .populate("user_id", '_id username profileImgUrl isInfluencer name')
        res.json({ status: true, followings }).status(200)
    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }
})


//Follow user
// socialmediaRouter.post('/follow/:id', userAuthenticate, async (req, res) => {
//     const userId = req.params.id;
//     const loggedInUserId = req.user._id;
//     const followUser = await User.updateOne({ _id: userId }, { $push: { following: userId } })
//     if (followUser)
//         res.json({ status: true }).status(200);
//     else
//         res.json({ status: false }).status(400);
// })
// //Unfollow user
// socialmediaRouter.post('/unfollow/:id', userAuthenticate, async (req, res) => {
//     const userId = req.params.id;
//     const unfollowUser = await User.update({ _id: userId }, { $pop: { following: userId } })
//     if (unfollowUser)
//         res.json({ status: true }).status(200);
//     else
//         res.json({ status: false }).status(400);
// })

// // Get followers
// socialmediaRouter.get('/followers', userAuthenticate, async (req, res) => {
//     const userId = req.query.userId;
//     const followersID = await User.find({ _id: userId }, { followers: 1 });
//     const followersDetails = await User.find({ _id: { $in: followersID } });
//     if (followersDetails)
//         res.json({ status: true, followers: followersDetails }).status(200);
//     else
//         res.json({ status: false }).status(400);

// })

// //List of followers and following
// socialmediaRouter.get('/followers-following', userAuthenticate, async (req, res) => {
//     const userId = req.body.userId;

//     res.json({ status: true }).status(200)
// })

//Get Signed URL to upload Images

// var API_USER = "";
// var API_SECRET = "";
// var SightengineClient = require ('./sightengine');

// socialmediaRouter.get('/signed-url-image/:fileName', userAuthenticate, async (req: any, res) => {
//     try {
//     const fileName = req.params.fileName;
//     const userId = req.user._id;
//     const signedUrl = getS3SignedUrl(`${userId}/post/${fileName}`);

//     var Sightengine = new SightengineClient(API_USER, API_SECRET);
//     Sightengine.checkNudityForURL(signedUrl, function(error:any, result:any) {
//     if(error)  {
//         res.json({ status: false, signedurl: "Has porn content" }).status(400);
//     } else {
//         res.json({ status: true, signedurl: signedUrl }).status(200);
//     }
//     });
//     } catch (error) {
//         res.send({ status: false, message: error })
//     }
// });

socialmediaRouter.get('/signed-url-image/:fileName', userAuthenticate, async (req: any, res) => {
    try {
        const fileName = req.params.fileName;
        const userId = req.user._id;
        const signedUrl = getS3SignedUrl(`${userId}/post/${fileName}`);
        if (signedUrl) {
            res.json({ status: true, signedurl: signedUrl }).status(200);
        } else {
            res.json({ status: false }).status(400);
        }

    } catch (error) {
        res.send({ status: false, message: error })
    }


});

socialmediaRouter.post('/multiple-signed-url-images/', userAuthenticate, async (req: any, res) => {
    try {
        const fileNames: string[] = req.body.fileNames;
        const userId = req.user._id;
        const paths = fileNames.map((x: string) => `${userId}/post/${x}`);
        const signedUrls = getMultipleSignedUrl(paths)

        res.json({ status: true, signedUrls: signedUrls }).status(200);
    } catch (error) {
        res.send({ status: false, message: error })
    }
});

// function getPresignUrlPromiseFunction(s3Params: any): Promise<string> {
//     return new Promise(async (resolve, reject) => {
//         try {
//            const url = s3.getSignedUrl('putObject', s3Params);
//            resolve(url)
//         } catch (error) {
//             return reject(error);
//         }
//     });
// }


//Report Abuse

socialmediaRouter.post('/report-abuse', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;

        const name = req.body.name;
        const post_id = req.body.postId;
        const user_notes = req.body.userNotes;

        const reportAbuse = await ReportAbuse.create({ by: { id: userId, name: name }, post_id: post_id, isActive: true, ts: new Date(), user_notes: user_notes });

        if (reportAbuse) {
            res.json({ status: true }).status(200)
        }

    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }
})

socialmediaRouter.get('/get-people-you-might-like', userAuthenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const users: any[] = [];

        const currentUserFollowing: any = await UserFollowers.find({ follower_id: userId });

        const currentUserFollowingIds = currentUserFollowing ? currentUserFollowing.map((x: any) => x.user_id) : [];
        currentUserFollowingIds.push(userId)
        const suggestedUsers = await User.aggregate([
            {
                $match: {
                    IsVerified: true,
                    _id: { $not: { $in : currentUserFollowingIds } }
                }
            },
            {
                $sort: {
                    followersCount: -1,
                    isInfluencer: -1
                }
            },
            {
                $project: {username:1, profileImgUrl:1, isInfluencer:1, name: 1}
            },
            {
                $limit: 5
            }
        ])

        res.json({ status: true, suggestedUsers }).status(200)

    } catch (error) {
        res.send({ status: false, message: "Request Failed" })
    }
})

socialmediaRouter.get('/get-trending-giveaways', userAuthenticate, async (req, res) => {
    try {
        const trendingGiveAways = await Posts.find({ isGiveAway: true, isReshared: false, isRemoved: false, imageVideoUrl: { $exists: true, $type: 'array', $ne: [] } })
        .sort({likesCount: -1, reshareCount: -1 })
        .limit(5)
        .populate('by.id', '_id username profileImgUrl isInfluencer name')
        res.json({ status: true, trendingGiveAways }).status(200)
    } catch (error) {
        res.send({ status: false, message:error})
        
    }
})