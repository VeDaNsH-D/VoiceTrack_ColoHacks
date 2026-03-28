const express = require("express");
const { getAuthStatus } = require("../controllers/auth.controller");
const { signup, login } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/status", getAuthStatus);
router.post("/signup", signup);
router.post("/login", login);

module.exports = router;
