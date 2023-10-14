const router = require("express").Router();

const authRoute = require("./auth");
const userRoute = require("./user");
const postRoute = require("./post");

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/post", postRoute);

module.exports = router;
