import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const DEFAULT_CENTER = [19.076, 72.8777];

function toSafeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(event) {
            if (typeof onMapClick !== "function") {
                return;
            }

            onMapClick({
                lat: Number(event.latlng.lat.toFixed(6)),
                lng: Number(event.latlng.lng.toFixed(6)),
            });
        },
    });

    return null;
}

function MapRecenter({ center }) {
    const map = useMap();

    useEffect(() => {
        if (!Array.isArray(center) || center.length !== 2) {
            return;
        }

        map.setView(center, Math.max(13, map.getZoom()), { animate: true });
    }, [center, map]);

    return null;
}

function HeatmapLayer({ points }) {
    const map = useMap();
    const heatLayerRef = useRef(null);

    const safePoints = useMemo(
        () =>
            Array.isArray(points)
                ? points.filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
                : [],
        [points]
    );

    const heatWeights = useMemo(() => {
        const values = safePoints.map((point) => {
            const weightedValue = Math.max(0, toSafeNumber(point?.weight, 0));
            const fallbackValue = Math.max(0, toSafeNumber(point?.salesAmount, 0));
            return weightedValue > 0 ? weightedValue : fallbackValue > 0 ? fallbackValue : 1;
        });

        if (!values.length) {
            return { min: 0, max: 1, span: 1 };
        }

        const min = Math.min(...values);
        const max = Math.max(...values);
        return { min, max, span: Math.max(1, max - min) };
    }, [safePoints]);

    const layerOptions = useMemo(() => {
        const pointCount = safePoints.length;

        if (pointCount <= 25) {
            return { radius: 70, blur: 46, maxZoom: 17, minOpacity: 0.5 };
        }

        if (pointCount <= 80) {
            return { radius: 58, blur: 40, maxZoom: 17, minOpacity: 0.42 };
        }

        return { radius: 45, blur: 32, maxZoom: 17, minOpacity: 0.32 };
    }, [safePoints.length]);

    useEffect(() => {
        if (!map) {
            return;
        }

        const leafletGlobal = typeof window !== "undefined" ? window.L : null;
        const leafletApi = leafletGlobal?.heatLayer ? leafletGlobal : L;

        if (typeof leafletApi?.heatLayer !== "function") {
            console.warn("[HeatmapLayer] leaflet.heat is not available. Skipping heatmap render.");
            return;
        }

        if (!safePoints.length) {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
            return;
        }

        const heatData = safePoints.map((point) => {
            const weightedValue = Math.max(0, toSafeNumber(point?.weight, 0));
            const fallbackValue = Math.max(0, toSafeNumber(point?.salesAmount, 0));
            const sourceWeight = weightedValue > 0 ? weightedValue : fallbackValue > 0 ? fallbackValue : 1;
            const normalized = Math.min(1, Math.max(0, (sourceWeight - heatWeights.min) / heatWeights.span));
            const intensity = Math.min(1, Math.max(0.5, 0.5 + normalized * 0.5));

            return [point.lat, point.lng, intensity];
        });

        if (!heatLayerRef.current) {
            heatLayerRef.current = leafletApi.heatLayer(heatData, {
                radius: layerOptions.radius,
                blur: layerOptions.blur,
                maxZoom: layerOptions.maxZoom,
                minOpacity: layerOptions.minOpacity,
                gradient: {
                    0.15: "#60a5fa",
                    0.35: "#22c55e",
                    0.55: "#facc15",
                    0.78: "#f97316",
                    1.0: "#ef4444",
                },
            }).addTo(map);
            return;
        }

        requestAnimationFrame(() => {
            if (heatLayerRef.current) {
                heatLayerRef.current.setLatLngs(heatData);
                heatLayerRef.current.redraw();
            }
        });
    }, [heatWeights.min, heatWeights.span, layerOptions.blur, layerOptions.maxZoom, layerOptions.minOpacity, layerOptions.radius, map, safePoints]);

    useEffect(() => {
        return () => {
            if (heatLayerRef.current) {
                map.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
        };
    }, [map]);

    return null;
}

function getWeight(point) {
    const directWeight = Math.max(0, toSafeNumber(point?.weight, 0));
    if (directWeight > 0) {
        return directWeight;
    }

    const salesCount = Math.max(1, toSafeNumber(point?.salesCount, 1));
    const salesAmount = Math.max(0, toSafeNumber(point?.salesAmount, 0));
    return salesCount + salesAmount / 400;
}

export function MapView({ points = [], onMapClick, selectedPoint }) {
    const [userLocation, setUserLocation] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [errorLocation, setErrorLocation] = useState(null);
    const [recenterTarget, setRecenterTarget] = useState(null);

    const requestUserLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setErrorLocation("Geolocation not supported. Showing default area.");
            setLoadingLocation(false);
            return;
        }

        setLoadingLocation(true);
        setErrorLocation(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const nextLocation = {
                    lat: Number(position.coords.latitude.toFixed(6)),
                    lng: Number(position.coords.longitude.toFixed(6)),
                };

                setUserLocation(nextLocation);
                setRecenterTarget([nextLocation.lat, nextLocation.lng]);
                setLoadingLocation(false);
            },
            (error) => {
                if (error?.code === 1) {
                    setErrorLocation("Location access denied. Showing default area.");
                } else if (error?.code === 2) {
                    setErrorLocation("Location unavailable. Showing default area.");
                } else if (error?.code === 3) {
                    setErrorLocation("Location request timed out. Showing default area.");
                } else {
                    setErrorLocation("Could not fetch location. Showing default area.");
                }

                setLoadingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 120000,
            }
        );
    }, []);

    useEffect(() => {
        requestUserLocation();
    }, [requestUserLocation]);

    const plottedPoints = useMemo(
        () =>
            points
                .filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
                .map((point) => {
                    const weight = getWeight(point);

                    return {
                        lat: Number(point.lat),
                        lng: Number(point.lng),
                        weight,
                        salesAmount: Math.max(0, toSafeNumber(point?.salesAmount, 0)),
                    };
                }),
        [points]
    );

    return (
        <div className="relative h-[calc(100vh-72px)] w-full overflow-hidden rounded-xl">
            <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-xl border border-white/70 bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Demand Legend</p>
                <div className="mt-2 space-y-1 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> 🔥 High
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> 🟠 Medium
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> 🔵 Low
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={requestUserLocation}
                disabled={loadingLocation}
                className="absolute right-3 top-28 z-[500] rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-md transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
                {loadingLocation ? "📍 Locating..." : "📍 Use My Location"}
            </button>

            {loadingLocation && (
                <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-md">
                    📍 Getting your location...
                </div>
            )}

            {errorLocation && !loadingLocation && (
                <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-xl border border-orange-200 bg-orange-50/95 px-3 py-2 text-xs font-medium text-orange-700 shadow-md">
                    {errorLocation}
                </div>
            )}

            <MapContainer
                center={DEFAULT_CENTER}
                zoom={12}
                className="h-full w-full"
                scrollWheelZoom
            >
                {recenterTarget && <MapRecenter center={recenterTarget} />}

                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler onMapClick={onMapClick} />

                <HeatmapLayer points={plottedPoints} />

                {selectedPoint && Number.isFinite(selectedPoint?.lat) && Number.isFinite(selectedPoint?.lng) && (
                    <>
                        <CircleMarker
                            center={[selectedPoint.lat, selectedPoint.lng]}
                            radius={18}
                            pathOptions={{ color: "#f97316", weight: 0, fillColor: "#f97316", fillOpacity: 0.14 }}
                        />
                        <CircleMarker
                            center={[selectedPoint.lat, selectedPoint.lng]}
                            radius={10}
                            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#f97316", fillOpacity: 0.95 }}
                        />
                    </>
                )}

                {userLocation && Number.isFinite(userLocation?.lat) && Number.isFinite(userLocation?.lng) && (
                    <>
                        <CircleMarker
                            center={[userLocation.lat, userLocation.lng]}
                            radius={18}
                            pathOptions={{ color: "#3b82f6", weight: 0, fillColor: "#60a5fa", fillOpacity: 0.2 }}
                        />
                        <CircleMarker
                            center={[userLocation.lat, userLocation.lng]}
                            radius={9}
                            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 0.95 }}
                        >
                            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                                <div className="text-xs font-medium text-slate-700">You are here</div>
                            </Tooltip>
                        </CircleMarker>
                    </>
                )}
            </MapContainer>
        </div>
    );
}