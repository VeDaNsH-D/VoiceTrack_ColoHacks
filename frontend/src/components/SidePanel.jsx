import React from "react";

function NumberRow({ label, value }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-800">{value}</span>
        </div>
    );
}

export function SidePanel({ loading, error, insights, selectedPoint }) {
    return (
        <aside className="h-[calc(100vh-72px)] w-full overflow-y-auto rounded-xl bg-white p-4 shadow-md">
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">📍 Area</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    {insights?.areaName || "Click on map"}
                </h3>
                {selectedPoint ? (
                    <p className="mt-2 text-xs text-slate-500">
                        {selectedPoint.lat}, {selectedPoint.lng}
                    </p>
                ) : (
                    <p className="mt-2 text-xs text-slate-500">Select a hotspot to load insights.</p>
                )}
            </div>

            {loading && (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 shadow-md animate-pulse">
                    Loading area insights...
                </div>
            )}

            {error && !loading && (
                <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 shadow-md">{error}</div>
            )}

            {!loading && !error && !insights && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 shadow-md">
                    No data selected yet. Click anywhere on the map to view area demand intelligence.
                </div>
            )}

            {!loading && !error && insights && (
                <div className="space-y-4">
                    <section className="rounded-xl p-4 shadow-md transition hover:shadow-lg">
                        <h4 className="text-sm font-semibold text-slate-900">🔥 Top items</h4>
                        <div className="mt-3 space-y-2">
                            {(insights.topItems || []).length === 0 && (
                                <p className="text-sm text-slate-500">No top items found for this area.</p>
                            )}
                            {(insights.topItems || []).map((item) => (
                                <div
                                    key={item.item}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-teal-300"
                                >
                                    <p className="text-sm font-medium text-slate-800">{item.item}</p>
                                    <p className="text-xs text-slate-500">
                                        Count {item.count} • Qty {Math.round(item.quantity)} • ₹{Math.round(item.salesAmount)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl p-4 shadow-md transition hover:shadow-lg">
                        <h4 className="text-sm font-semibold text-slate-900">📊 Category breakdown</h4>
                        <div className="mt-3 space-y-2">
                            {(insights.categories || []).length === 0 && (
                                <p className="text-sm text-slate-500">No category data available.</p>
                            )}
                            {(insights.categories || []).map((category) => (
                                <NumberRow
                                    key={category.category}
                                    label={category.category}
                                    value={`₹${Math.round(category.salesAmount)} (${category.count})`}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl p-4 shadow-md transition hover:shadow-lg">
                        <h4 className="text-sm font-semibold text-slate-900">📈 Category trends (5d vs previous 5d)</h4>
                        <div className="mt-3 space-y-2">
                            {(insights.trends || []).length === 0 && (
                                <p className="text-sm text-slate-500">No trend data available.</p>
                            )}
                            {(insights.trends || []).slice(0, 6).map((trend) => (
                                <div key={trend.category} className="rounded-lg bg-slate-50 px-3 py-2">
                                    <p className="text-sm font-medium text-slate-800">{trend.category}</p>
                                    <p className="text-xs text-slate-500">
                                        {trend.trend.toUpperCase()} • {trend.changePct}% • ₹{Math.round(trend.previousSales)} → ₹
                                        {Math.round(trend.recentSales)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl p-4 shadow-md transition hover:shadow-lg">
                        <h4 className="text-sm font-semibold text-slate-900">🤖 AI suggestions</h4>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            {(insights.recommendations || []).length === 0 && (
                                <li className="text-slate-500">No recommendations yet.</li>
                            )}
                            {(insights.recommendations || []).map((tip, index) => (
                                <li key={`${tip}-${index}`} className="rounded-lg bg-teal-50 px-3 py-2">
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            )}
        </aside>
    );
}
