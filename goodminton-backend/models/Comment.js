/**
 * @file models/Comment.js
 * @description 评论数据模型 (Mongoose schema for Comments), 新增点赞功能
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema(
  {
    // 评论内容 (Content of the comment)
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: 1000, // 限制评论长度
    },
    // 评论所属的帖子 (The post this comment belongs to)
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true, // 添加索引以加快查询速度
    },
    // 评论的作者 (The author of the comment)
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 新增：点赞用户列表 (List of users who liked the comment)
    likes: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

module.exports = mongoose.model("Comment", commentSchema);