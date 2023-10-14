const modelUser = require("../models/user");
const filterObject = require("../utils/filterObject");
const catchAsync = require("../utils/catchAsync");
const FriendRequest = require("../models/friendRequest");

exports.updateUser = catchAsync(async (req, res, next) => {
  const { user } = req;

  const filteredBody = filterObject(
    req.body,
    "firstName",
    "lastName",
    "about",
    "avatar"
  );

  const updatedUser = await modelUser.findByIdAndUpdate(
    user._id,
    filteredBody,
    { new: true, validateModifiedOnly: true }
  );

  res.status(200).json({
    status: "success",
    data: updatedUser,
    message: "Profile updated successfully",
  });
});

exports.getProfile = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: req.user,
  });
});

exports.getUsers = catchAsync(async (req, res, next) => {
  // Fetch all users who are verified, selecting only their first name, last name, and unique ID.
  const all_users = await modelUser
    // .find({ verified: true }) // get verified users only
    .find() // get user (all: unverified as well)
    .select("firstName lastName _id");

  // Get the current user's data from the request.
  const this_user = req.user;

  // Filter out users who are already friends of the current user or the current user itself.
  const remaining_users = all_users.filter(
    (user) =>
      !this_user.friends.includes(user._id) &&
      user._id.toString() !== req.user._id.toString()
  );

  res.status(200).json({
    status: "success",
    data: remaining_users,
    message: "Users found successfully!",
  });
});

exports.getRequests = catchAsync(async (req, res, next) => {
  const requests = await FriendRequest.find({ recipient: req.user._id })
    .populate("sender")
    .select("_id firstName lastName");

  res.status(200).json({
    status: "success",
    data: requests,
    message: "Requests found successfully!",
  });
});

exports.getFriends = catchAsync(async (req, res, next) => {
  const this_user = await modelUser
    .findById(req.user._id)
    .populate("friends", "_id firstName lastName");
  res.status(200).json({
    status: "success",
    data: this_user.friends,
    message: "Friends found successfully!",
  });
});
