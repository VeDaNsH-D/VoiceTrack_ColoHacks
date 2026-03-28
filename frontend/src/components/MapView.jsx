import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

function getWeight(point) {
    const salesCount = Math.max(1, toSafeNumber(point?.salesCount, 1));
    const salesAmount = Math.max(0, toSafeNumber(point?.salesAmount, 0));
    return salesCount + salesAmount / 400;
}

function getMarkerPalette(weight) {
    if (weight < 4) {
        return {
            core: "#3b82f6",
            glow: "#60a5fa",
            level: "low",
        };
    }

    if (weight < 9) {
        return {
            core: "#f97316",
            glow: "#fb923c",
            level: "medium",
        };
    }

    return {
        core: "#ef4444",
        glow: "#f87171",
        level: "high",
    };
}

function buildTooltipLabel(point) {
    const label = String(point?.label || point?.topItem || "Demand hotspot");
    const salesAmount = Math.round(Math.max(0, toSafeNumber(point?.salesAmount, 0)));
    return `${label} - Rs${salesAmount} sales`;
}

export function MapView({ points = [], onMapClick, selectedPoint }) {
    const [hoveredKey, setHoveredKey] = useState(null);
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
                .map((point, index) => {
                    const weight = getWeight(point);
                    const palette = getMarkerPalette(weight);
                    const baseRadius = weight < 4 ? 4 : weight < 9 ? 8 : 12;
                    const key = `${Number(point.lat).toFixed(6)}-${Number(point.lng).toFixed(6)}-${index}`;

                    return {
                        key,
                        lat: Number(point.lat),
                        lng: Number(point.lng),
                        weight,
                        baseRadius,
                        palette,
                        label: buildTooltipLabel(point),
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

                {plottedPoints.map((point) => {
                    const isHovered = hoveredKey === point.key;
                    const coreRadius = isHovered ? point.baseRadius + 1.5 : point.baseRadius;
                    const glowRadius = isHovered ? point.baseRadius * 2.3 : point.baseRadius * 2;

                    return (
                        <React.Fragment key={point.key}>
                            <CircleMarker
                                center={[point.lat, point.lng]}
                                radius={glowRadius}
                                pathOptions={{
                                    color: point.palette.glow,
                                    weight: 0,
                                    fillColor: point.palette.glow,
                                    fillOpacity: 0.16,
                                }}
                            />

                            <CircleMarker
                                center={[point.lat, point.lng]}
                                radius={coreRadius}
                                eventHandlers={{
                                    mouseover: () => setHoveredKey(point.key),
                                    mouseout: () => setHoveredKey(null),
                                    click: () => {
                                        if (typeof onMapClick === "function") {
                                            onMapClick({ lat: point.lat, lng: point.lng });
                                        }
                                    },
                                }}
                                pathOptions={{
                                    color: "#ffffff",
                                    weight: 1,
                                    fillColor: point.palette.core,
                                    fillOpacity: isHovered ? 0.95 : 0.8,
                                }}
                            >
                                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                                    <div className="text-xs font-medium text-slate-700">{point.label}</div>
                                </Tooltip>
                            </CircleMarker>
                        </React.Fragment>
                    );
                })}

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
