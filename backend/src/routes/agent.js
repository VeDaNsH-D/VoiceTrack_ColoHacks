const express = require("express");
const { postAgent } = require("../controllers/agentController");

const router = express.Router();

router.post("/", postAgent);

module.exports = router;
