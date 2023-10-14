const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User", // Reference to the User model for the user who posted the comment
    required: true,
  },
  post: {
    type: mongoose.Schema.ObjectId,
    ref: "Post", // Reference to the Post model for the post the comment belongs to
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  likes: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User", // Reference to the User model for users who liked the comment
    },
  ],
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
