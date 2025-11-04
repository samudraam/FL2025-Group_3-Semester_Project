/**
 * @file controllers/postController.js
 * @description 帖子相关的业务逻辑控制器 (Controller for post-related business logic)
 */
const Post = require("../models/Post");
const User = require("../models/User");

/**
 * 创建一个新帖子
 * Create a new post
 */
exports.createPost = async (req, res) => {
  try {
    const { title, description } = req.body;
    const authorId = req.user.userId; // 从 auth 中间件获取

    // 基础验证
    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, error: "Title and description are required." });
    }

    // 创建帖子
    const newPost = await Post.create({
      title,
      description,
      author: authorId,
    });

    // 填充作者信息以便立即返回给前端
    await newPost.populate(
      "author",
      "email profile.displayName profile.avatar"
    );

    res.status(201).json({
      success: true,
      message: "Post created successfully.",
      post: newPost,
    });
  } catch (error) {
    console.error("Create post error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: "Failed to create post." });
  }
};

/**
 * 获取所有帖子 (公开)
 * Get all posts (Public)
 */
exports.getAllPosts = async (req, res) => {
  try {
    // 查找所有帖子，按最新创建的排序
    const posts = await Post.find()
      .populate("author", "email profile.displayName profile.avatar") // 填充作者的昵称和头像
      .sort({ createdAt: -1 }) // 按创建时间降序
      .limit(50); // 限制最近的50条

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("Get all posts error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch posts." });
  }
};

/**
 * 获取单个帖子的详情 (公开)
 * Get details for a single post (Public)
 */
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId).populate(
      "author",
      "email profile.displayName profile.avatar"
    );

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("Get post by ID error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch post." });
  }
};
