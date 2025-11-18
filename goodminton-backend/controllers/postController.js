/**
 * @file controllers/postController.js
 * @description 帖子相关的业务逻辑控制器 (Controller for post-related business logic)
 * @update (11/18/2025) 新增 updatePost 和 deletePost 功能 (Added updatePost and deletePost functionality)
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
    await newPost.populate("author", "profile.displayName profile.avatar");

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
      .populate("author", "profile.displayName profile.avatar") // 填充作者的昵称和头像
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
      "profile.displayName profile.avatar"
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

/**
 * --- (新增) ---
 * 更新一个帖子 (仅限作者)
 * Update a post (Author only)
 */
exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, description } = req.body;
    const userId = req.user.userId;

    // 1. 查找帖子
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    // 2. 验证是否为作者
    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "User not authorized to edit this post." });
    }

    // 3. 验证数据
    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, error: "Title and description are required." });
    }

    // 4. 更新帖子
    post.title = title;
    post.description = description;
    await post.save();

    // 填充作者信息以便返回
    await post.populate("author", "profile.displayName profile.avatar");

    res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ success: false, error: "Failed to update post." });
  }
};

/**
 * --- (新增) ---
 * 删除一个帖子 (仅限作者)
 * Delete a post (Author only)
 */
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    // 1. 查找帖子
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    // 2. 验证是否为作者
    if (post.author.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "User not authorized to delete this post." });
    }

    // 3. 删除帖子
    await Post.findByIdAndDelete(postId);

    res.status(200).json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ success: false, error: "Failed to delete post." });
  }
};