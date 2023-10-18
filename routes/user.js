const router = require("express").Router();

const userController = require("../controllers/user");
const authController = require("../controllers/auth");

router.patch("/update-user", authController.protect, userController.updateUser);

router.get("/profile", authController.protect, userController.getProfile);

router.get("/users", authController.protect, userController.getUsers);
router.get("/requests", authController.protect, userController.getRequests);
router.get("/friends", authController.protect, userController.getFriends);

module.exports = router;
