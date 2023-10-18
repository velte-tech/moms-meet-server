const express = require("express");
const authController = require("../controllers/auth");
const postController = require("../controllers/post");

const router = express.Router();

// Post Routes
router.post("/", authController.protect, postController.createPost);
//router.get("/posts", authController.protect, postController.getPosts);
router.get("/", postController.getPosts);
router.get(
  "/user/:userId",
  authController.protect,
  postController.getSingleUserPosts
);
router.get("/:id", authController.protect, postController.updatePost);
router.put("/:id", authController.protect, postController.updatePost);

// Comment Routes
router.post(
  "/:postId/comments",
  authController.protect,
  postController.createComment
);
router.put(
  "/:postId/comments/:commentId",
  authController.protect,
  postController.updateComment
);
router.delete(
  "/:postId/comments/:commentId",
  authController.protect,
  postController.deleteComment
);

// Like Routes
router.post(
  "/:postId/likes",
  authController.protect,
  postController.createLike
);
router.delete(
  "/:postId/likes/:likeId",
  authController.protect,
  postController.deleteLike
);

module.exports = router;
