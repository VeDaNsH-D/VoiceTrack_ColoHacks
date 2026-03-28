const express = require("express");
const { getAuthStatus, signup, login, getBusinessDetails } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/status", getAuthStatus);
router.get("/business", getBusinessDetails);
router.post("/signup", signup);
router.post("/login", login);

module.exports = router;
