const express = require("express");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { getAreaInsights } = require("../services/areaInsights.service");

const router = express.Router();

router.get("/area-insights", async (req, res) => {
    try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        const radiusKm = Number(req.query.radiusKm || 2);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return sendError(res, "lat and lng query params are required numbers", 400, {
                code: "INVALID_COORDINATES",
            });
        }

        const data = await getAreaInsights({ lat, lng, radiusKm });

        return sendSuccess(
            res,
            {
                topItems: data.topItems,
                categories: data.categories,
                trends: data.trends,
                recommendations: data.recommendations,
                areaName: data.areaName,
                transactionCount: data.transactionCount,
            },
            "Area insights fetched"
        );
    } catch (error) {
        return sendError(res, "Failed to fetch area insights", 500, {
            code: "AREA_INSIGHTS_FAILED",
            details: error?.message || "unknown_error",
        });
    }
});

module.exports = router;
