const express = require("express");
const authController = require("../controllers/auth");
const postController = require("../controllers/post");

const router = express.Router();

// Post Routes
router.post("/posts", authController.protect, postController.createPost);
//router.get("/posts", authController.protect, postController.getPosts);
router.get("/posts", postController.getPosts);
router.get(
  "/posts/user/:userId",
  authController.protect,
  postController.getSingleUserPosts
);
router.get("/posts/:id", authController.protect, postController.updatePost);
router.put("/posts/:id", authController.protect, postController.updatePost);

// Comment Routes
router.post(
  "/posts/:postId/comments",
  authController.protect,
  postController.createComment
);
router.put(
  "/posts/:postId/comments/:commentId",
  authController.protect,
  postController.updateComment
);
router.delete(
  "/posts/:postId/comments/:commentId",
  authController.protect,
  postController.deleteComment
);

// Like Routes
router.post(
  "/posts/:postId/likes",
  authController.protect,
  postController.createLike
);
router.delete(
  "/posts/:postId/likes/:likeId",
  authController.protect,
  postController.deleteLike
);

module.exports = router;
