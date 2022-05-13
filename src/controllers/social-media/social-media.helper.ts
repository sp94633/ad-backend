import mongoose, { Mongoose } from 'mongoose';
import { Posts } from '../../models/social-media/post.model';

import { CoinTransaction, CoinTransactionTypeEnum, SystemGeneratedTransactionCodesEnum, UserCoin } from "../../models/coins.model"
import { User } from "../../models/user.model";
import moment from "moment";
import { UserFollowers } from '../../models/userFollowings';
import { addNotification } from '../user/user-helper';
import { NotificationActions } from '../../models/notification.model';


export const getFollwersId = async(ids:[]) => {

};


export const getPostByPostId = async(postId: mongoose.Types.ObjectId | string, currentUserId: string) => {
    // return Posts.findOne({ _id: postId })
    // .populate("by.id", '_id username profileImgUrl isInfluencer')
    // // .populate('comments.by.id', '_id username profileImgUrl isInfluencer')
    // .populate({
    //     path : 'reshared_post_id',
    //     populate : {
    //         path : 'by.id'
    //     }
    // })
    const _postId = (typeof postId === 'string') ? mongoose.Types.ObjectId(postId) : postId;
    const posts = await getPostByPostList({_id: _postId}, currentUserId);
    return posts.posts[0];
};

export const getPostByPostList = async(query: any, currentUserId: string, limit: any = null, offset: any = null) => {

    const aggregateArr: any = [
        {
            $match : query
        },
        {
            $sort: {
                _id: -1
            }
        },
        {
            $lookup: {
                "from": "postlikes",
                "localField": "_id",
                "foreignField": "postId",
                "as": "liked",
                pipeline: [
                   {
                    $match: {
                        userId: mongoose.Types.ObjectId(currentUserId),
                        isUnliked: false
                    },
                    
                   },
                   { $project : { ts: 1 } }

                ]
            }
        },
        {
            $lookup: {
                "from": "users",
                "localField": "by.id",
                "foreignField": "_id",
                "as": "postedBy",
                pipeline : [
                    { $project : { _id: 1, username: 1, profileImgUrl: 1, isInfluencer: 1 } }
                ]
              }
        },
        {
            $unwind: {
                path: "$postedBy",
                preserveNullAndEmptyArrays: true
              }
        },
        {
            $lookup: {
                "from": "posts",
                "localField": "reshared_post_id",
                "foreignField": "_id",
                "as": "resharedPost"
              }
        },
        {
            $unwind: {
                path: "$resharedPost",
                preserveNullAndEmptyArrays: true
              }
        },
        {
            $lookup: {
                from: "users",
                "localField": "resharedPost.by.id",
                "foreignField": "_id",
                "as": "resharedPost.postedBy",
                pipeline : [
                    { $project : { _id: 1, username: 1, profileImgUrl: 1, isInfluencer: 1 } }
                ]
              }
        },
        {
            $unwind: {
                path: "$resharedPost.postedBy",
                preserveNullAndEmptyArrays: true
              }
        },

    ];

    if(offset) {
        aggregateArr.push({
            $skip : offset
        })
    }
    if(limit) {
        aggregateArr.push({
            $limit : limit
        })
    }
   
    const posts = await Posts.aggregate(aggregateArr);
    const totalPostCount = await Posts.count(query)
    return {posts, totalPostCount};
    // return Posts.findOne({ _id: postId })
    // .populate("by.id", '_id username profileImgUrl isInfluencer')
    // // .populate('comments.by.id', '_id username profileImgUrl isInfluencer')
    // .populate({
    //     path : 'reshared_post_id',
    //     populate : {
    //         path : 'by.id'
    //     }
    // })
};

export const followUser = async (userId: any, followerId: any) => {
    try {
        const json = {
            user_id: userId,
            follower_id: followerId,
            createdDate: moment().utc(),
        }
        const isFollowed = await UserFollowers.count({
            user_id: userId,
            follower_id: followerId,
            isUnfollowed: false,
        })
    
        if(!isFollowed) {
            const follow = await UserFollowers.create(json);
            await User.updateOne({ _id: userId }, { $inc: { followersCount: 1 } });
            await User.updateOne({ _id: followerId }, { $inc: { followingCount: 1 } });
            addNotification(userId, followerId, NotificationActions.Followed, 'Followed you', followerId);
            return follow
        }
        else {
            throw 'Already Followed'
        }
    } catch (error) {
        throw error;
    }
    

}

