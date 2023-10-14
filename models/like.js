const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User", // Reference to the User model for the user who liked the post or comment
    required: true,
  },
  post: {
    type: mongoose.Schema.ObjectId,
    ref: "Post", // Reference to the Post model for the liked post (optional)
  },
  comment: {
    type: mongoose.Schema.ObjectId,
    ref: "Comment", // Reference to the Comment model for the liked comment (optional)
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const Like = mongoose.model("Like", likeSchema);

module.exports = Like;
