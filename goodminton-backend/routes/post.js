/**
 * @file routes/post.js
 * @description 帖子相关的API路由 (API routes for posts)
 * @update (Current) 新增 评论 (Comment) 相关路由
 */
const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const { authenticateToken } = require("../middleware/auth");

// --- 帖子 (Post) 路由 ---

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


// --- 评论 (Comment) 路由 ---

// @route   POST /api/posts/:id/comments
// @desc    为帖子添加评论 (Add a comment to a post)
// @access  Private
// 注意：这里的 :id 是帖子的 ID (The :id here is the Post ID)
router.post("/:id/comments", authenticateToken, postController.addComment);

// @route   GET /api/posts/:id/comments
// @desc    获取帖子的所有评论 (Get all comments for a post)
// @access  Public
// 注意：这里的 :id 是帖子的 ID (The :id here is the Post ID)
router.get("/:id/comments", postController.getPostComments);

// @route   DELETE /api/posts/:id/comments/:commentId
// @desc    删除评论 (Delete a comment)
// @access  Private (Author only)
// 注意：这里的 :id 是帖子的 ID，:commentId 是评论的 ID
router.delete("/:id/comments/:commentId", authenticateToken, postController.deleteComment);

module.exports = router;