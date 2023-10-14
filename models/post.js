const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User", // Reference to the User model for the user who created the post
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  media: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Media", // Reference to the Media model for associated media files
    },
  ],
  links: [
    {
      type: String, // URLs of links shared in the post
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
  likes: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User", // Reference to the User model for users who liked the post
    },
  ],
  comments: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Comment", // Reference to the Comment model for comments on the post
    },
  ],
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
