/**
 * @file controllers/postController.js
 * @description 帖子相关的业务逻辑控制器 (Controller for post-related business logic)
 * @update (Current) 新增 评论 (Comment) 相关功能
 */
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment"); // 引入新的 Comment 模型

/**
 * 创建一个新帖子
 * Create a new post
 */
exports.createPost = async (req, res) => {
  try {
    const { title, description } = req.body;
    const authorId = req.user.userId;

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
      "profile.displayName profile.avatar"
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
 * 删除一个帖子 (仅限作者)
 * Delete a post (Author only)
 */
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

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
    // 同时也删除该帖子下的所有评论 (Also delete all comments for this post)
    await Comment.deleteMany({ post: postId });

    res.status(200).json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ success: false, error: "Failed to delete post." });
  }
};

// --- 评论相关功能 (Comment Related Functions) ---

/**
 * 为帖子添加评论
 * Add a comment to a post
 */
exports.addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    const authorId = req.user.userId;

    // 1. 检查帖子是否存在
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    // 2. 验证内容
    if (!content) {
      return res.status(400).json({ success: false, error: "Comment content is required." });
    }

    // 3. 创建评论
    const newComment = await Comment.create({
      content,
      post: postId,
      author: authorId
    });

    // 4. 填充作者信息以便返回
    await newComment.populate("author", "profile.displayName profile.avatar");

    res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: newComment
    });

  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ success: false, error: "Failed to add comment." });
  }
};

/**
 * 获取某个帖子的所有评论
 * Get all comments for a specific post
 */
exports.getPostComments = async (req, res) => {
  try {
    const postId = req.params.id;

    // 检查帖子是否存在 (可选，但推荐)
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
       return res.status(404).json({ success: false, error: "Post not found." });
    }

    // 查找评论，按时间正序排列（最早的在上面）
    const comments = await Comment.find({ post: postId })
      .populate("author", "profile.displayName profile.avatar")
      .sort({ createdAt: 1 }); // 1 for ascending (oldest first), -1 for newest first

    res.status(200).json({
      success: true,
      count: comments.length,
      comments
    });

  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch comments." });
  }
};

/**
 * 删除评论 (仅限评论作者)
 * Delete a comment (Author only)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params; // 路由参数通常是 /posts/:id/comments/:commentId
    const userId = req.user.userId;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, error: "Comment not found." });
    }

    // 验证评论是否属于该帖子 (安全检查)
    if (comment.post.toString() !== postId) {
        return res.status(400).json({ success: false, error: "Comment does not belong to this post." });
    }

    // 验证权限：只有评论作者可以删除 (未来也可以允许帖子作者删除)
    if (comment.author.toString() !== userId) {
      return res.status(403).json({ success: false, error: "User not authorized to delete this comment." });
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully."
    });

  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ success: false, error: "Failed to delete comment." });
  }
};