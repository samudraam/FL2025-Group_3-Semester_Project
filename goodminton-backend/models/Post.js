/**
 * @file models/Post.js
 * @description 帖子数据模型 (Mongoose schema for Posts), 新增点赞功能
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    // 帖子的作者 (Author of the post)
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // 帖子标题 (Title of the post)
    title: {
      type: String,
      required: [true, "Title is required"], // 标题为必填项
      trim: true,
      maxlength: 150,
    },
    // 帖子形容/内容 (Description/content of the post)
    description: {
      type: String,
      required: [true, "Description is required"], // 内容为必填项
      trim: true,
      maxlength: 5000,
    },
    // 新增：点赞用户列表 (List of users who liked the post)
    likes: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    // postType: { type: String, enum: ['general', 'event', 'tournament'], default: 'general' },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

module.exports = mongoose.model("Post", postSchema);