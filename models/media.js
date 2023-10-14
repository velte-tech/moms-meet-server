const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User", // Reference to the User model for the user who uploaded the media
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  caption: {
    type: String, // Caption for the media (optional)
  },
  description: {
    type: String, // Description for the media (optional)
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
});

const Media = mongoose.model("Media", mediaSchema);

module.exports = Media;
