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
    // 关联的社群 (Linked community)
    community: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      default: null,
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
    // 位置 (Location, optional)
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    // 可见性 (Visibility scope)
    visibility: {
      type: String,
      enum: ["public", "community"],
      default: "public",
      index: true,
    },
    // 新增：点赞用户列表 (List of users who liked the post)
    likes: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    // postType: { type: String, enum: ['general', 'event', 'tournament'], default: 'general' },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

postSchema.index({ community: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
