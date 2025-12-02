/**
 * @file controllers/postController.js
 * @description 帖子相关的业务逻辑控制器 (Controller for post-related business logic)
 * @update (Current) 新增 评论 (Comment) 和 点赞 (Like) 相关功能
 */
const mongoose = require("mongoose"); // 引入 mongoose 用于 ObjectId
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");

// --- 帖子 CRUD 功能 ---

/**
 * 创建一个新帖子
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

    const newPost = await Post.create({ title, description, author: authorId });

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
    const posts = await Post.find()
      .populate("author", "profile.displayName profile.avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, posts });
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

    res.status(200).json({ success: true, post });
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }
    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "User not authorized to edit this post.",
      });
    }

    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, error: "Title and description are required." });
    }

    post.title = title;
    post.description = description;
    await post.save();
    await post.populate("author", "profile.displayName profile.avatar");

    res
      .status(200)
      .json({ success: true, message: "Post updated successfully.", post });
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
    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "User not authorized to delete this post.",
      });
    }

    // 1. 删除帖子 (Delete the Post)
    await Post.findByIdAndDelete(postId);

    // 2. 同时也删除该帖子下的所有评论 (Delete all comments for this post)
    await Comment.deleteMany({ post: postId });

    res.status(200).json({
      success: true,
      message: "Post and associated comments deleted successfully.",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ success: false, error: "Failed to delete post." });
  }
};

// --- 点赞 (Like) 功能 ---

/**
 * 点赞/取消点赞帖子 (Toggle like status for a post)
 * @route   POST /api/posts/:id/like
 */
exports.toggleLikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const likes = post.likes || [];
    const hasLiked = likes.some((likeId) => likeId.equals(userIdObjectId));

    if (hasLiked) {
      // 取消点赞 (Unlike: Pull user ID from likes array)
      post.likes.pull(userIdObjectId);
    } else {
      // 点赞 (Like: Push user ID to likes array)
      post.likes.push(userIdObjectId);
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: hasLiked ? "Post unliked." : "Post liked.",
      liked: !hasLiked,
      likeCount: post.likes.length,
    });
  } catch (error) {
    console.error("Toggle like post error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to toggle like status on post." });
  }
};

/**
 * 取消点赞帖子 (Explicit unlike for a post)
 * @route   POST /api/posts/:id/unlike
 */
exports.unlikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const likes = post.likes || [];
    const hasLiked = likes.some((likeId) => likeId.equals(userIdObjectId));

    if (!hasLiked) {
      return res.status(200).json({
        success: true,
        message: "Post already unliked.",
        liked: false,
        likeCount: post.likes.length,
      });
    }

    post.likes.pull(userIdObjectId);
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post unliked.",
      liked: false,
      likeCount: post.likes.length,
    });
  } catch (error) {
    console.error("Unlike post error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to unlike post." });
  }
};

/**
 * 获取帖子的点赞用户列表
 * Get the list of users who liked a post
 * @route   GET /api/posts/:id/likes
 */
exports.getPostLikes = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId).populate({
      path: "likes",
      select: "profile.displayName profile.avatar email",
    });

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const likes =
      post.likes?.map((userDoc) => ({
        _id: userDoc._id,
        username:
          userDoc.profile?.displayName || userDoc.email || "Goodminton user",
        profile: {
          displayName:
            userDoc.profile?.displayName ||
            userDoc.email?.split("@")[0] ||
            "Player",
          avatar: userDoc.profile?.avatar || null,
        },
      })) ?? [];

    return res.status(200).json({ success: true, likes });
  } catch (error) {
    console.error("Get post likes error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch post likes." });
  }
};

// --- 评论 (Comment) 功能 ---

/**
 * 为帖子添加评论
 * Add a comment to a post
 */
exports.addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    const authorId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    if (!content) {
      return res
        .status(400)
        .json({ success: false, error: "Comment content is required." });
    }

    const newComment = await Comment.create({
      content,
      post: postId,
      author: authorId,
    });

    await newComment.populate(
      "author",
      "profile.displayName profile.avatar email"
    );

    res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: newComment,
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

    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const comments = await Comment.find({ post: postId })
      .populate("author", "profile.displayName profile.avatar email")
      .sort({ createdAt: 1 }); // 1 for ascending (oldest first)

    res.status(200).json({ success: true, count: comments.length, comments });
  } catch (error) {
    console.error("Get comments error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch comments." });
  }
};

/**
 * 删除评论 (仅限评论作者)
 * Delete a comment (Author only)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;
    const userId = req.user.userId;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, error: "Comment not found." });
    }
    if (comment.post.toString() !== postId) {
      return res.status(400).json({
        success: false,
        error: "Comment does not belong to this post.",
      });
    }

    // 验证权限：只有评论作者可以删除
    if (comment.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "User not authorized to delete this comment.",
      });
    }

    await Comment.findByIdAndDelete(commentId);

    res
      .status(200)
      .json({ success: true, message: "Comment deleted successfully." });
  } catch (error) {
    console.error("Delete comment error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete comment." });
  }
};

/**
 * 点赞/取消点赞评论 (Toggle like status for a comment)
 * @route   POST /api/posts/:postId/comments/:commentId/like
 */
exports.toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, error: "Comment not found." });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const likes = comment.likes || [];
    const hasLiked = likes.some((likeId) => likeId.equals(userIdObjectId));

    if (hasLiked) {
      // 取消点赞 (Unlike)
      comment.likes.pull(userIdObjectId);
    } else {
      // 点赞 (Like)
      comment.likes.push(userIdObjectId);
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: hasLiked ? "Comment unliked." : "Comment liked.",
      liked: !hasLiked,
      likeCount: comment.likes.length,
    });
  } catch (error) {
    console.error("Toggle like comment error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle like status on comment.",
    });
  }
};

/**
 * 取消点赞评论 (Explicit unlike for a comment)
 * @route   POST /api/posts/:postId/comments/:commentId/unlike
 */
exports.unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, error: "Comment not found." });
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const likes = comment.likes || [];
    const hasLiked = likes.some((likeId) => likeId.equals(userIdObjectId));

    if (!hasLiked) {
      return res.status(200).json({
        success: true,
        message: "Comment already unliked.",
        liked: false,
        likeCount: comment.likes.length,
      });
    }

    comment.likes.pull(userIdObjectId);
    await comment.save();

    res.status(200).json({
      success: true,
      message: "Comment unliked.",
      liked: false,
      likeCount: comment.likes.length,
    });
  } catch (error) {
    console.error("Unlike comment error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to unlike comment.",
    });
  }
};

/**
 * 获取评论的点赞用户列表
 * Get the list of users who liked a comment
 * @route   GET /api/posts/:postId/comments/:commentId/likes
 */
exports.getCommentLikes = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId).populate({
      path: "likes",
      select: "profile.displayName profile.avatar email",
    });

    if (!comment) {
      return res
        .status(404)
        .json({ success: false, error: "Comment not found." });
    }

    const likes =
      comment.likes?.map((userDoc) => ({
        _id: userDoc._id,
        username:
          userDoc.profile?.displayName || userDoc.email || "Goodminton user",
        profile: {
          displayName:
            userDoc.profile?.displayName ||
            userDoc.email?.split("@")[0] ||
            "Player",
          avatar: userDoc.profile?.avatar || null,
        },
      })) ?? [];

    return res.status(200).json({ success: true, likes });
  } catch (error) {
    console.error("Get comment likes error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch comment likes.",
    });
  }
};
