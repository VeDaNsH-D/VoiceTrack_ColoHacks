import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { MapView } from "./MapView";
import { SidePanel } from "./SidePanel";

const API_BASE = (
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_BACKEND_URL?.trim() ||
    "http://localhost:5001"
).replace(/\/$/, "");

function densifyHeatmapPoints(points, targetCount = 120) {
    if (!Array.isArray(points) || points.length === 0) {
        return [];
    }

    if (points.length >= targetCount) {
        return points;
    }

    const multiplier = Math.ceil(targetCount / points.length);
    const baseSpread = points.length <= 5 ? 0.008 : points.length <= 15 ? 0.0045 : 0.0022;
    const expanded = [];

    points.forEach((point, pointIndex) => {
        const baseLat = Number(point.lat);
        const baseLng = Number(point.lng);
        const baseWeight = Math.max(1, Number(point.weight) || 1);

        for (let i = 0; i < multiplier; i += 1) {
            const angle = i * 2.399963 + pointIndex * 0.47;
            const radialProgress = Math.sqrt((i + 1) / Math.max(1, multiplier));
            const ring = baseSpread * radialProgress;
            const wave = (((pointIndex + 1) * (i + 1)) % 9 - 4) * 0.00008;

            expanded.push({
                lat: Number((baseLat + Math.cos(angle) * ring + wave).toFixed(6)),
                lng: Number((baseLng + Math.sin(angle) * ring - wave).toFixed(6)),
                weight: Number((baseWeight * (0.9 - radialProgress * 0.45)).toFixed(2)),
            });
        }
    });

    return expanded.slice(0, targetCount);
}

export function LocalDemandMapDashboard() {
    const [points, setPoints] = useState([]);
    const [insights, setInsights] = useState(null);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [loadingMap, setLoadingMap] = useState(false);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [error, setError] = useState("");

    const loadMapPoints = useCallback(async () => {
        try {
            setLoadingMap(true);
            setError("");

            const response = await axios.get(`${API_BASE}/api/map-points`);
            const payload = response?.data?.data || response?.data || {};
            const rows = Array.isArray(payload.points) ? payload.points : [];

            const nextPoints = rows
                .filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
                .map((point) => ({
                    lat: Number(point.lat),
                    lng: Number(point.lng),
                    weight: Number(point.weight) || 1,
                }));

            const pointsToRender = densifyHeatmapPoints(nextPoints);
            setPoints(pointsToRender);

            if (nextPoints.length > 0 && nextPoints.length < 100) {
                console.info(`[LocalDemandMapDashboard] Rendering enhanced heatmap from ${nextPoints.length} source points.`);
            }
        } catch (_) {
            setError("Unable to load map points.");
        } finally {
            setLoadingMap(false);
        }
    }, []);

    useEffect(() => {
        void loadMapPoints();
    }, [loadMapPoints]);

    const handleMapClick = useCallback(async ({ lat, lng }) => {
        setSelectedPoint({ lat, lng });
        setLoadingInsights(true);
        setError("");

        try {
            const response = await axios.get(`${API_BASE}/api/area-insights`, {
                params: { lat, lng },
            });

            const payload = response?.data?.data || response?.data || {};
            setInsights(payload);
        } catch (_) {
            setError("Failed to load area insights.");
            setInsights(null);
        } finally {
            setLoadingInsights(false);
        }
    }, []);

    return (
        <div className="h-screen bg-slate-100 p-4">
            <div className="mb-3 rounded-xl bg-white px-5 py-3 shadow-md">
                <h1 className="text-xl font-semibold text-slate-900">Local Demand Intelligence Map</h1>
                <p className="text-sm text-slate-500">
                    Click any hotspot on the map to get top items, category trends, and AI recommendations.
                </p>
            </div>

            <div className="grid h-[calc(100vh-120px)] grid-cols-10 gap-4">
                <div className="col-span-7 rounded-xl bg-white p-2 shadow-md">
                    {loadingMap ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            Loading transaction density map...
                        </div>
                    ) : (
                        <MapView
                            points={points}
                            onMapClick={handleMapClick}
                            selectedPoint={selectedPoint}
                        />
                    )}
                </div>

                <div className="col-span-3">
                    <SidePanel
                        loading={loadingInsights}
                        error={error}
                        insights={insights}
                        selectedPoint={selectedPoint}
                    />
                </div>
            </div>
        </div>
    );
}