const express = require("express");
const {
	getInsights,
	getSuggestions,
	getForecast,
	getAnomalies,
} = require("../controllers/insights.controller");

const router = express.Router();

router.get("/", getInsights);
router.get("/suggestions", getSuggestions);
router.get("/forecast", getForecast);
router.get("/anomalies", getAnomalies);

module.exports = router;
