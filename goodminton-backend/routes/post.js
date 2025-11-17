/**
 * @file routes/post.js
 * @description API routes for posts
 */
const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const { authenticateToken } = require("../middleware/auth"); // 引入认证中间件

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post("/", authenticateToken, postController.createPost);

// @route   GET /api/posts
// @desc    Get list of all posts
// @access  Public 
router.get("/", postController.getAllPosts);

// @route   GET /api/posts/:id
// @desc    Get details for a single post
// @access  Public
router.get("/:id", postController.getPostById);

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private 
router.put("/:id", authenticateToken, postController.updatePost);

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private 
router.delete("/:id", authenticateToken, postController.deletePost);

module.exports = router;
