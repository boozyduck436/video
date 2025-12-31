import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const { username } = req.params;

  // TODO: Get the channel stats like

    //  total no. of subscribers,

    //  total no. of videos,
    //  sum of video views,
    //  sum of likes of all videos 
    
    // total no. of tweets
    // sum of likes of all tweets

  if (!username) {
    throw new ApiError(400, "malformed request, username is required ");
  }

  const stats = await User.aggregate([
    {
      $match: { username },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "owner",
        localField: "_id",
        as: "videos",
      },
    },
    {
      $lookup: {
        from: "likes",
        let: { videoIds: "$videos._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$postId", "$$videoIds"] },
                  { $eq: ["$mediaType", "Video"] }
                ]
              }
            }
          }
        ],

        as: "videosLikes",
      }
    },
    {
      $lookup: {
        from: "tweets",
        foreignField: "owner",
        localField: "_id",
        as: "tweets",
      },
    },

    {
        $lookup: {
          from: "likes",
          let: { tweetId: "$tweets._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$postId", "$$tweetId"] },
                    { $eq: ["$mediaType", "Tweet"] }
                  ]
                }
              }
            }
          ],
  
          as: "tweetsLikes",
        }
    },
    {
        $lookup:{
            from: "subscriptions",
            foreignField: "channel",
            localField: "_id",
            as:"subscribers"// to get no. of subscriber of channel
        }
    },
    {
        $lookup:{
            from: "subscriptions",
            foreignField: "subscriber",
            localField: "_id",
            as:"subscribedTo"// to get no. of channel owner subcription
        }
    },

    {
        $addFields:{
            subscribersCount:{$size:"$subscribers"},
            subscriptionCount:{$size:"$subscribedTo"},
            videoCount:{$size:"$videos"},
            totalViews:{$sum:"$videos.view"},
            totalVideoLikes:{$size:"$videosLikes"},
            TweetsCount:{$size:"$tweets"},
            totalTweetsLike:{$size:"$tweetsLikes"}
        }
    },
    {
        $project:{
            _id:1,
            username:1,
            email:1,
            fullName:1,
            avatar:1,
            coverImage:1,
            createdAt:1,
            updatedAt:1,
            subscribersCount:1,
            subscriptionCount:1,
            videoCount:1,
            totalViews:1,
            totalVideoLikes:1,
            TweetsCount:1,
            totalTweetsLike:1,
        }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "user stats are fetched succesfully"));
});

export { getChannelStats };
