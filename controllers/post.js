const modelPost = require("../models/post");
const modelComment = require("../models/comment");
const modelLike = require("../models/like");
const catchAsync = require("../utils/catchAsync");

const { body, validationResult } = require("express-validator");
const sanitizeHtml = require("sanitize-html");

exports.createPost = [
  body("content")
    .notEmpty()
    .withMessage("Content is required for the post")
    .isLength({ max: 1000 })
    .withMessage("Post content cannot exceed 1000 characters"),

  catchAsync(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "fail",
        errors: errors.array(),
      });
    }

    const { body, user } = req;

    // Trim content to a maximum of 1000 characters
    const trimmedContent = body.content.trim().substring(0, 1000);

    // Sanitize HTML content to prevent XSS attacks
    const sanitizedContent = sanitizeHtml(trimmedContent, {
      allowedTags: [], // Allow no tags
      allowedAttributes: {}, // Allow no attributes
    });

    // Create new post
    const newPost = await modelPost.create({
      content: sanitizedContent,
      user: user._id,
      fullContent: body.content, // Store the full content separately if needed
    });

    res.status(201).json({
      status: "success",
      data: newPost,
      message: "Post created successfully",
    });
  }),
];

// exports.createPost = catchAsync(async (req, res, next) => {
//   const { body, user } = req;

//   // Validate content presence and length
//   if (!body.content || body.content.trim().length === 0) {
//     return res.status(400).json({
//       status: "fail",
//       message: "Content is required for the post",
//     });
//   }

//   // Trim content to a maximum of 1000 characters
//   const trimmedContent = body.content.trim().substring(0, 1000);

//   // Sanitize HTML content to prevent XSS attacks
//   const sanitizedContent = sanitizeHtml(trimmedContent, {
//     allowedTags: [], // Allow no tags
//     allowedAttributes: {}, // Allow no attributes
//   });

//   // Create new post
//   const newPost = await modelPost.create({
//     content: sanitizedContent,
//     user: user._id,
//     fullContent: body.content, // Store the full content separately if needed
//   });

//   res.status(201).json({
//     status: "success",
//     data: newPost,
//     message: "Post created successfully",
//   });
// });

exports.getPosts = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const totalPosts = await modelPost.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);

    const posts = await modelPost
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "firstName lastName -_id");

    res.status(200).json({
      status: "success",
      data: {
        posts,
        totalPosts,
        totalPages,
        currentPage: page,
      },
      message: "Posts found successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

exports.updatePost = catchAsync(async (req, res, next) => {
  const { body, params, user } = req;
  const postId = params.id;

  const post = await modelPost.findOne({ _id: postId, user: user._id });

  if (!post) {
    return res.status(404).json({
      status: "fail",
      message: "Post not found or user is not authorized to update this post",
    });
  }

  if (!body.content) {
    return res.status(400).json({
      status: "fail",
      message: "Content is required for the post update",
    });
  }

  const updatedPost = await modelPost.findOneAndUpdate(
    { _id: postId, user: user._id },
    { content: body.content },
    { new: true }
  );

  if (!updatedPost) {
    return res.status(404).json({
      status: "fail",
      message: "Post not found or user is not authorized to update this post",
    });
  }

  res.status(200).json({
    status: "success",
    data: updatedPost,
    message: "Post updated successfully",
  });
});

exports.createComment = catchAsync(async (req, res, next) => {
  const { body, user } = req;
  const postId = req.params.postId;

  const newComment = await modelComment.create({
    content: body.content,
    user: user._id,
    post: postId,
  });

  res.status(201).json({
    status: "success",
    data: newComment,
    message: "Comment created successfully",
  });
});

exports.updateComment = catchAsync(async (req, res, next) => {
  const { body } = req;
  const commentId = req.params.commentId;

  const updatedComment = await modelComment.findByIdAndUpdate(
    commentId,
    { content: body.content },
    { new: true }
  );

  if (!updatedComment) {
    return res.status(404).json({
      status: "fail",
      message: "Comment not found",
    });
  }

  res.status(200).json({
    status: "success",
    data: updatedComment,
    message: "Comment updated successfully",
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const commentId = req.params.commentId;

  const deletedComment = await modelComment.findByIdAndDelete(commentId);

  if (!deletedComment) {
    return res.status(404).json({
      status: "fail",
      message: "Comment not found",
    });
  }

  res.status(200).json({
    status: "success",
    message: "Comment deleted successfully",
  });
});

exports.createLike = catchAsync(async (req, res, next) => {
  const { user } = req;
  const postId = req.params.postId;

  const newLike = await modelLike.create({
    user: user._id,
    post: postId,
  });

  res.status(201).json({
    status: "success",
    data: newLike,
    message: "Like added successfully",
  });
});

exports.deleteLike = catchAsync(async (req, res, next) => {
  const { user } = req;
  const postId = req.params.postId;

  const deletedLike = await modelLike.findOneAndDelete({
    user: user._id,
    post: postId,
  });

  if (!deletedLike) {
    return res.status(404).json({
      status: "fail",
      message: "Like not found",
    });
  }

  res.status(200).json({
    status: "success",
    message: "Like removed successfully",
  });
});
