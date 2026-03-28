import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { MapView } from "./MapView";
import { SidePanel } from "./SidePanel";

const API_BASE = (
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_BACKEND_URL?.trim() ||
    "http://localhost:5001"
).replace(/\/$/, "");

export function LocalDemandMapDashboard() {
    const [points, setPoints] = useState([]);
    const [insights, setInsights] = useState(null);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [loadingMap, setLoadingMap] = useState(false);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [error, setError] = useState("");

    const loadTransactions = useCallback(async () => {
        try {
            setLoadingMap(true);
            setError("");

            const response = await axios.get(`${API_BASE}/api/transactions/history`, {
                params: { limit: 2000 },
            });

            const payload = response?.data?.data || response?.data || {};
            const rows = Array.isArray(payload.transactions) ? payload.transactions : [];

            const points = rows
                .filter((tx) => Number.isFinite(tx?.location?.lat) && Number.isFinite(tx?.location?.lng))
                .map((tx) => ({
                    lat: Number(tx.location.lat),
                    lng: Number(tx.location.lng),
                    salesCount: Array.isArray(tx.sales) ? tx.sales.length : 0,
                    salesAmount: Number(tx?.totals?.salesAmount || 0),
                    label: tx?.sales?.[0]?.item || "Mixed basket",
                }));

            setPoints(points);
        } catch (_) {
            setError("Unable to load map transactions.");
        } finally {
            setLoadingMap(false);
        }
    }, []);

    useEffect(() => {
        void loadTransactions();
    }, [loadTransactions]);

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
