/**
 * @file routes/post.js
 * @description 帖子相关的API路由 (API routes for posts)
 * @update (Current) 新增 评论 (Comment) 和 点赞 (Like) 相关路由
 */
const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const { authenticateToken } = require("../middleware/auth");

// --- 帖子 (Post) CRUD 路由 ---

// @route   POST /api/posts
// @desc    创建一个新帖子
router.post("/", authenticateToken, postController.createPost);

// @route   GET /api/posts
// @desc    获取所有帖子的列表
router.get("/", postController.getAllPosts);

// @route   GET /api/posts/:id
// @desc    获取单个帖子的详情
router.get("/:id", postController.getPostById);

// @route   PUT /api/posts/:id
// @desc    更新一个帖子 (仅限作者)
router.put("/:id", authenticateToken, postController.updatePost);

// @route   DELETE /api/posts/:id
// @desc    删除一个帖子 (仅限作者)
router.delete("/:id", authenticateToken, postController.deletePost);

// --- 帖子点赞 (Post Like) 路由 ---

// @route   POST /api/posts/:id/like
// @desc    点赞/取消点赞帖子 (Toggle like status for a post)
// @access  Private
router.post("/:id/like", authenticateToken, postController.toggleLikePost);

// @route   POST /api/posts/:id/unlike
// @desc    取消点赞帖子 (Explicit unlike endpoint)
// @access  Private
router.post("/:id/unlike", authenticateToken, postController.unlikePost);

// --- 评论 (Comment) 路由 ---

// @route   POST /api/posts/:id/comments
// @desc    为帖子添加评论
// @access  Private
router.post("/:id/comments", authenticateToken, postController.addComment);

// @route   GET /api/posts/:id/comments
// @desc    获取帖子的所有评论
// @access  Public
router.get("/:id/comments", postController.getPostComments);

// @route   DELETE /api/posts/:id/comments/:commentId
// @desc    删除评论
// @access  Private (Author only)
router.delete(
  "/:id/comments/:commentId",
  authenticateToken,
  postController.deleteComment
);

// @route   POST /api/posts/:postId/comments/:commentId/like
// @desc    点赞/取消点赞评论 (Toggle like status for a comment)
// @access  Private
router.post(
  "/:postId/comments/:commentId/like",
  authenticateToken,
  postController.toggleLikeComment
);

module.exports = router;
