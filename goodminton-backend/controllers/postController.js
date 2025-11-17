/**
 * @file controllers/postController.js
 * @description Controller for post-related business logic
 */
const Post = require("../models/Post");
const User = require("../models/User");

/**
 * Create a new post
 */
exports.createPost = async (req, res) => {
  try {
    const { title, description } = req.body;
    const authorId = req.user.userId; 

    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, error: "Title and description are required." });
    }

    const newPost = await Post.create({
      title,
      description,
      author: authorId,
    });

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

/**
 * Update a post (Owner only)
 */
exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId; 
    const { title, description } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to update this post.",
      });
    }

    if (title !== undefined) {
      post.title = title;
    }
    if (description !== undefined) {
      post.description = description;
    }

    await post.save();

    await post.populate("author", "email profile.displayName profile.avatar");

    res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: "Failed to update post." });
  }
};

/**
 * Delete a post (Owner only)
 */
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId; 

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to delete this post.",
      });
    }

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
