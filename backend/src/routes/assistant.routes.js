const express = require("express");
const { queryAssistant } = require("../controllers/assistant.controller");

const router = express.Router();

router.post("/query", queryAssistant);

module.exports = router;
