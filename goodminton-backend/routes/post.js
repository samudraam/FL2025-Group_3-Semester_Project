/**
 * @file routes/post.js
 * @description 帖子相关的API路由 (API routes for posts)
 */
const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const { authenticateToken } = require("../middleware/auth"); // 引入认证中间件

// @route   POST /api/posts
// @desc    创建一个新帖子 (Create a new post)
// @access  Private (需要登录)
router.post("/", authenticateToken, postController.createPost);

// @route   GET /api/posts
// @desc    获取所有帖子的列表 (Get list of all posts)
// @access  Public (公开)
router.get("/", postController.getAllPosts);

// @route   GET /api/posts/:id
// @desc    获取单个帖子的详情 (Get details for a single post)
// @access  Public (公开)
router.get("/:id", postController.getPostById);

// --- (新增) ---
// @route   PUT /api/posts/:id
// @desc    更新一个帖子 (Update a post)
// @access  Private (仅限作者)
router.put("/:id", authenticateToken, postController.updatePost);

// --- (新增) ---
// @route   DELETE /api/posts/:id
// @desc    删除一个帖子 (Delete a post)
// @access  Private (仅限作者)
router.delete("/:id", authenticateToken, postController.deletePost);

module.exports = router;
