const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const modelUser = require("../models/user");
const modelPost = require("../models/post");
const modelComment = require("../models/comment");
const modelLike = require("../models/like");

//const { promisify } = require("util");
const util = require("util");
const promisify = util.promisify;

const catchAsync = require("../utils/catchAsync");

const mailService = require("../services/mailer");
const filterObject = require("../utils/filterObject");

const otp = require("../Templates/Mail/otp");
const resetPassword = require("../Templates/Mail/resetPassword");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_TOKEN);

// Register New User
exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObject(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password"
  );

  // check if a verified user with given email exists

  const existing_user = await modelUser.findOne({ email: email });

  if (existing_user && existing_user.verified) {
    // user with this email already exists, Please login
    return res.status(400).json({
      status: "error",
      message: "Email already in use, Please login.",
    });
  } else if (existing_user) {
    // if not verified than update prev one

    await modelUser.findOneAndUpdate({ email: email }, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });

    // generate an otp and send to email
    req.userId = existing_user._id;
    next();
  } else {
    // if user is not created before than create a new one
    const new_user = await modelUser.create(filteredBody);

    // generate an otp and send to email
    req.userId = new_user._id;
    next();
  }
});

exports.sendOTP = catchAsync(async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 Mins after otp is sent

  const user = await modelUser.findByIdAndUpdate(userId, {
    otp_expiry_time: otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log(new_otp);

  // TODO send mail
  mailService.sendEmail({
    from: "info@meshofmothers.ca",
    to: user.email,
    subject: "Verification OTP",
    html: otp(user.firstName, new_otp),
    attachments: [],
  });

  res.status(200).json({
    status: "success",
    message: "OTP Sent Successfully!",
  });
});

exports.verifyOTP = catchAsync(async (req, res, next) => {
  // verify otp and update user accordingly
  const { email, otp } = req.body;
  const user = await modelUser.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });

    return;
  }

  // OTP is correct

  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
  });
});

exports.signIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await modelUser.findOne({ email: email }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message: "Incorrect password",
    });

    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Signed in successfully",
    token,
    user_id: user._id,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  //  Getting token (JWT) and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      message: "You are not logged in! Please log in to get access.",
    });
  }

  try {
    // Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_TOKEN);

    // Check if user still exists
    const this_user = await modelUser.findById(decoded.userId);
    if (!this_user) {
      return res.status(401).json({
        message: "The user belonging to this token does no longer exist.",
      });
    }

    // Check if user changed password after the token was issued
    if (this_user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        message: "User recently changed password! Please sign in again.",
      });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = this_user;
    next();
  } catch (error) {
    // Handle JWT verification errors
    return res.status(401).json({
      message: "Invalid token. Please log in again.",
    });
  }
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user's email
  const user = await modelUser.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with this email address.",
    });
  }

  //  Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //  Send it to user's email
  try {
    const resetURL = `http://localhost:3000/new-password?token=${resetToken}`;

    console.log(resetURL);

    mailService.sendEmail({
      from: "info@meshofmothers.ca",
      to: user.email,
      subject: "Reset Password",
      html: resetPassword(user.firstName, resetURL),
      attachments: [],
    });

    res.status(200).json({
      status: "success",
      message: "Reset password link sent to your email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: "There was an error sending the email. Try again later!",
    });
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get the user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await modelUser.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // If token has not expired, and there is user, set the new password
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is Invalid or Expired",
    });

    return;
  }

  //  Update changedPasswordAt property for the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // TODO => send email to user about password change.

  //  Log the user in, send JWT
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password reset successful",
    token,
  });
});

exports.createPost = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "fail",
      errors: errors.array(),
    });
  }

  try {
    const { content } = req.body;

    const newPost = await modelPost.create({
      content,
      user: req.user._id,
    });

    res.status(201).json({
      status: "success",
      data: newPost,
      message: "Post created successfully",
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
});

exports.createComment = catchAsync(async (req, res, next) => {
  try {
    const { postId, content } = req.body;

    const newComment = await modelComment.create({
      content,
      user: req.user._id,
    });

    // Associate the comment with the post
    const post = await modelPost.findById(postId);
    post.comments.push(newComment._id);
    await post.save();

    res.status(201).json({
      status: "success",
      data: newComment,
      message: "Comment created successfully",
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
});

exports.likePost = catchAsync(async (req, res, next) => {
  try {
    const { postId } = req.body;

    // Check if the user has already liked the post
    const existingLike = await modelLike.findOne({
      user: req.user._id,
      post: postId,
    });

    if (existingLike) {
      return res.status(400).json({
        status: "fail",
        message: "User has already liked this post",
      });
    }

    const newLike = await modelLike.create({
      user: req.user._id,
    });

    // Associate the like with the post
    const post = await modelPost.findById(postId);
    post.likes.push(newLike._id);
    await post.save();

    res.status(201).json({
      status: "success",
      data: newLike,
      message: "Post liked successfully",
    });
  } catch (error) {
    console.error("Error liking the post:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
});
