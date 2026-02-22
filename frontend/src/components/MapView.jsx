import React, { useRef, useEffect, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Polygon,
    Polyline,
    Popup,
    Tooltip,
    useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import SocialFeed from './SocialFeed';
import {
    computeRadius,
    generatePolygonRing,
    computeArrow,
    computeVelocity,
    lerp,
} from '../utils/riskZoneUtils';
import { calculateHaversine } from '../utils/geoUtils';
import { getNearestInfra, getAllNearestInfra } from '../utils/infraUtils';
import infraData from '../data/infrastructure.json';

// ─── Leaflet default icon fix ─────────────────────────────────────────────────
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── CSS: pulsing polygon stroke ──────────────────────────────────────────────
const PULSE_STYLE = `
@keyframes riskPulse {
    0%   { stroke-opacity: 0.9; stroke-width: 3px; }
    50%  { stroke-opacity: 0.3; stroke-width: 6px; }
    100% { stroke-opacity: 0.9; stroke-width: 3px; }
}
.risk-zone-polygon { animation: riskPulse 2.4s ease-in-out infinite; }
`;

const InjectPulseCSS = () => {
    const injected = useRef(false);
    useEffect(() => {
        if (injected.current) return;
        const style = document.createElement('style');
        style.textContent = PULSE_STYLE;
        document.head.appendChild(style);
        injected.current = true;
    }, []);
    return null;
};

// ─── ChangeView ───────────────────────────────────────────────────────────────
const ChangeView = ({ center }) => {
    const map = useMap();
    map.setView(center);
    return null;
};

// ─── Velocity colour helper ───────────────────────────────────────────────────
function velocityColor(speedKmh) {
    if (speedKmh === null) return '#22c55e';   // green  – stationary
    if (speedKmh < 0.5) return '#22c55e';   // green
    if (speedKmh < 2) return '#eab308';   // yellow
    return '#ef4444';                          // red    – fast
}

// ─── Trail segment colour gradient (slate → zone colour) ─────────────────────
function trailSegmentColor(idx, total, zoneColor) {
    // Linearly blend from '#64748b' (slate-500) to zoneColor
    const t = total <= 1 ? 1 : idx / (total - 1); // 0 = oldest, 1 = newest
    const parse = (hex) => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
    const lerp3 = (a, b, t) => Math.round(a + (b - a) * t);
    const [r1, g1, b1] = parse('#64748b');
    const [r2, g2, b2] = parse(zoneColor);
    return `rgb(${lerp3(r1, r2, t)},${lerp3(g1, g2, t)},${lerp3(b1, b2, t)})`;
}

// ─── ANIMATED RISK ZONE (severity ≥ 7) ───────────────────────────────────────
const AnimatedRiskZone = ({ event, centroidHistory = [], signals = [], onSelect }) => {
    const LERP_FACTOR = 0.04;
    const NUM_POLY_PTS = 36;

    const displayRef = useRef([event.latitude, event.longitude]);
    const [displayCenter, setDisplayCenter] = useState([event.latitude, event.longitude]);
    const targetRef = useRef([event.latitude, event.longitude]);

    // Keep internal history for drift arrow (independent of centroidHistory)
    const internalHistory = useRef([[event.latitude, event.longitude]]);

    useEffect(() => {
        const newTarget = [event.latitude, event.longitude];
        targetRef.current = newTarget;
        const last = internalHistory.current.at(-1);
        if (Math.abs(newTarget[0] - last[0]) + Math.abs(newTarget[1] - last[1]) > 0.0001) {
            internalHistory.current = [...internalHistory.current.slice(-4), newTarget];
        }
    }, [event.latitude, event.longitude]);

    // rAF lerp loop
    useEffect(() => {
        let rafId;
        const animate = () => {
            const [cLat, cLng] = displayRef.current;
            const [tLat, tLng] = targetRef.current;
            displayRef.current = [lerp(cLat, tLat, LERP_FACTOR), lerp(cLng, tLng, LERP_FACTOR)];
            setDisplayCenter([...displayRef.current]);
            rafId = requestAnimationFrame(animate);
        };
        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, []);

    // ── Geometry ─────────────────────────────────────────────────────────────
    const radius = computeRadius(event.signal_count, event.severity);
    const ring = generatePolygonRing(displayCenter, radius, NUM_POLY_PTS);

    const hist = internalHistory.current;
    const arrow = hist.length >= 2 ? computeArrow(hist[0], displayCenter, 4) : null;

    const color = event.severity >= 9 ? '#dc2626' : event.severity >= 7 ? '#ea580c' : '#eab308';

    // ── Centroid trail (from backend history) ─────────────────────────────────
    const trail = centroidHistory;     // [{latitude, longitude, recorded_at}]
    const velocity = computeVelocity(trail);
    const vSpeed = velocity?.speedKmh ?? null;
    const vColor = velocityColor(vSpeed);
    const numSegs = trail.length - 1;   // number of line segments

    const nearestHospitals = getNearestInfra(event.latitude, event.longitude, 'hospital');
    const nearestPolice = getNearestInfra(event.latitude, event.longitude, 'police');
    const nearestUnits = getNearestInfra(event.latitude, event.longitude, 'unit');

    const localSignals = signals.filter(s =>
        calculateHaversine(event.latitude, event.longitude, s.latitude, s.longitude) <= 0.5
    );

    return (
        <>
            {/* ── Fading trail polylines ─────────────────────────────────── */}
            {trail.length >= 2 && trail.slice(0, -1).map((pt, i) => {
                const next = trail[i + 1];
                const opacity = 0.08 + (i / numSegs) * 0.77;  // 0.08 (oldest) → 0.85 (newest)
                const segCol = trailSegmentColor(i, numSegs, color);
                return (
                    <Polyline
                        key={`trail-${event.id}-${i}`}
                        positions={[
                            [pt.latitude, pt.longitude],
                            [next.latitude, next.longitude],
                        ]}
                        pathOptions={{
                            color: segCol,
                            weight: 2 + (i / numSegs) * 2,   // 2px (oldest) → 4px (newest)
                            opacity,
                            dashArray: i < numSegs * 0.4 ? '3 5' : undefined,
                        }}
                    />
                );
            })}

            {/* ── Velocity dot at tail of trail ─────────────────────────── */}
            {trail.length >= 1 && (() => {
                const tip = trail[trail.length - 1];
                return (
                    <CircleMarker
                        center={[tip.latitude, tip.longitude]}
                        radius={6}
                        pathOptions={{
                            color: vColor,
                            fillColor: vColor,
                            fillOpacity: 0.9,
                            weight: 2,
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                            <div style={{
                                background: '#0f172a',
                                color: '#f1f5f9',
                                border: `1px solid ${vColor}`,
                                borderRadius: 6,
                                padding: '4px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                lineHeight: 1.4,
                            }}>
                                <div style={{ color: vColor, marginBottom: 2 }}>⚡ VELOCITY</div>
                                {velocity
                                    ? <>{velocity.label}</>
                                    : <span style={{ color: '#94a3b8' }}>Stationary</span>
                                }
                                {trail.length > 1 && (
                                    <div style={{ color: '#64748b', marginTop: 2, fontSize: 10 }}>
                                        {trail.length} centroid points
                                    </div>
                                )}
                            </div>
                        </Tooltip>
                    </CircleMarker>
                );
            })()}

            {/* ── Main pulsing polygon zone ──────────────────────────────── */}
            <Polygon
                positions={ring}
                pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.18,
                    weight: 3,
                    className: 'risk-zone-polygon',
                }}
            >
                <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                    <div className="text-xs font-bold px-2 py-1 rounded shadow-sm border bg-red-600 text-white border-red-400">
                        ⚠️ HIGH-RISK ZONE
                    </div>
                </Tooltip>
                <Popup eventHandlers={{
                    add: () => onSelect(event.id),
                    remove: () => onSelect(null)
                }}>
                    <div className="text-slate-100 min-w-[200px]">
                        <h3 className="font-bold text-sm uppercase text-slate-400 mb-2 border-b border-slate-700 pb-1">Incident Report</h3>

                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <div className="text-2xl font-black">{event.severity}/10</div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold">Severity</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold">{event.confidence}%</div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold">Confidence</div>
                            </div>
                        </div>

                        {/* Verification Section */}
                        {event.verification && (
                            <div className="mb-4">
                                <details className="group bg-blue-500/10 border border-blue-500/20 rounded overflow-hidden">
                                    <summary className="list-none cursor-pointer p-2 flex justify-between items-center hover:bg-blue-500/20 transition-colors">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Deep Verification</span>
                                        <svg className="w-3 h-3 text-blue-400 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </summary>
                                    <div className="p-2 pt-0 space-y-2 border-t border-blue-500/10 bg-black/20">
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div className="flex flex-col">
                                                <span className="text-slate-500 uppercase text-[8px]">Source Diversity</span>
                                                <span className="text-white font-mono">{event.verification.source_diversity} Sources</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-500 uppercase text-[8px]">Consensus</span>
                                                <span className="text-white font-mono">{event.verification.urgency_consistency}%</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-500 uppercase text-[8px]">Data Freshness</span>
                                                <span className="text-white font-mono">{event.verification.recency_factor}%</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-500 uppercase text-[8px]">Network State</span>
                                                <span className={`font-mono ${event.verification.offline_penalty ? 'text-yellow-400' : 'text-green-400'}`}>
                                                    {event.verification.offline_penalty ? 'OFFLINE MESH' : 'SAT LINK'}
                                                </span>
                                            </div>
                                        </div>

                                        {event.verification.breakdown && (
                                            <div className="border-t border-blue-500/10 pt-2">
                                                <div className="flex justify-between text-[8px] text-slate-400 mb-1">
                                                    <span>CONFIDENCE BREAKDOWN</span>
                                                    <span>{event.confidence}% TOTAL</span>
                                                </div>
                                                <div className="flex h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div style={{ width: `${event.verification.breakdown.diversity}%` }} className="bg-blue-500" title="Diversity"></div>
                                                    <div style={{ width: `${event.verification.breakdown.consistency}%` }} className="bg-indigo-500" title="Consistency"></div>
                                                    <div style={{ width: `${event.verification.breakdown.freshness}%` }} className="bg-cyan-500" title="Freshness"></div>
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-[9px] text-blue-300 italic leading-tight border-t border-blue-500/10 pt-2">
                                            "{event.verification.verification_summary}"
                                        </p>
                                    </div>
                                </details>
                            </div>
                        )}

                        {/* Infrastructure Section */}
                        <div className="space-y-3">
                            <div className="border-t border-slate-700 pt-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Nearest Medical</p>
                                {nearestHospitals.map((h, i) => (
                                    <div key={i} className="flex justify-between text-[10px] mb-0.5">
                                        <span className="text-slate-300 truncate mr-2">{h.name}</span>
                                        <span className="text-green-400 font-mono flex-shrink-0">{h.distance.toFixed(1)}km</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-slate-700 pt-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Nearest Police</p>
                                {nearestPolice.map((p, i) => (
                                    <div key={i} className="flex justify-between text-[10px] mb-0.5">
                                        <span className="text-slate-300 truncate mr-2">{p.name}</span>
                                        <span className="text-red-400 font-mono flex-shrink-0">{p.distance.toFixed(1)}km</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-slate-700 pt-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Nearest Response</p>
                                {nearestUnits.map((u, i) => (
                                    <div key={i} className="flex justify-between text-[10px] mb-0.5">
                                        <span className="text-slate-300 truncate mr-2">{u.name}</span>
                                        <span className="text-blue-400 font-mono flex-shrink-0">{u.distance.toFixed(1)}km</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <SocialFeed signals={localSignals} />

                        <div className="mt-4 pt-2 border-t border-slate-700 text-[10px] text-slate-500 flex justify-between">
                            <span>RADIUS: {Math.round(radius)}m</span>
                            <span className="uppercase">{event.status}</span>
                        </div>
                    </div>
                </Popup>
            </Polygon>

            {/* ── Drift arrow (from internal rAF history) ────────────────── */}
            {arrow && (
                <Polyline
                    positions={arrow.shaft}
                    pathOptions={{ color: '#f87171', weight: 2.5, opacity: 0.85, dashArray: '6 4' }}
                />
            )}
            {arrow && (
                <Polygon
                    positions={arrow.head}
                    pathOptions={{ color: '#f87171', fillColor: '#f87171', fillOpacity: 0.9, weight: 1 }}
                />
            )}
        </>
    );
};

// ─── Map Legend ───────────────────────────────────────────────────────────────
const MapLegend = () => (
    <div className="absolute bottom-6 right-6 z-[1000] bg-slate-900/90 p-4 rounded-lg border border-slate-700 shadow-2xl text-xs text-slate-200">
        <h4 className="font-bold mb-2 uppercase tracking-wider text-slate-400">Severity Levels</h4>
        <div className="flex items-center mb-1">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse"></span>
            <span>Critical (Immediate Action)</span>
        </div>
        <div className="flex items-center mb-1">
            <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
            <span>Warning (Monitor)</span>
        </div>
        <div className="flex items-center mb-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
            <span>Advisory</span>
        </div>
        <div className="flex items-center mb-3">
            <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            <span>Resolved</span>
        </div>
        <div className="border-t border-slate-700 pt-2 mb-2">
            <h4 className="font-bold mb-2 uppercase tracking-wider text-slate-400">Signal Sources</h4>
            <div className="flex items-center mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 opacity-50"></span>
                <span>Online (Social/Sensor)</span>
            </div>
            <div className="flex items-center mb-1">
                <span className="w-2 h-2 rounded-full border border-slate-400 border-dashed mr-2 opacity-60"></span>
                <span>Offline Mesh Signal</span>
            </div>
        </div>
        <div className="border-t border-slate-700 pt-2">
            <h4 className="font-bold mb-1 uppercase tracking-wider text-slate-400">Risk Zone</h4>
            <div className="flex items-center mb-1">
                <span className="w-3 h-2 mr-2 rounded-sm border-2 border-red-500 opacity-70"></span>
                <span>Dynamic zone (severity ≥ 7)</span>
            </div>
            <div className="flex items-center mb-1">
                <span className="mr-2 text-red-400 font-bold text-sm">→</span>
                <span>Drift direction</span>
            </div>
            <div className="flex items-center mb-1">
                <span className="w-3 h-0.5 bg-gradient-to-r from-slate-500 to-red-500 mr-2"></span>
                <span>Movement trail (fading)</span>
            </div>
            <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                <span>Velocity (slow→fast)</span>
            </div>
        </div>
    </div>
);

// ─── Main MapView ─────────────────────────────────────────────────────────────
const MapView = ({ events, signals = [], centroidTrails = {}, center, showHeatmap, activeRole, onSelect, selectedId }) => {
    const activeEvents = events.filter(e => e.status !== 'resolved');
    const highRisk = activeEvents.filter(e => e.severity >= 7);
    const lowRisk = activeEvents.filter(e => e.severity < 7);

    return (
        <div className="h-full w-full rounded-lg overflow-hidden border border-slate-700 shadow-2xl relative group">
            <div className="absolute top-4 right-4 z-[1000] bg-red-900/80 text-red-100 px-3 py-1 rounded-full text-xs font-bold border border-red-500 animate-pulse shadow-lg">
                LIVE INCIDENT MAP
            </div>

            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
                <InjectPulseCSS />
                <ChangeView center={center} />
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {/* Severity Heatmap Overlay */}
                {showHeatmap && events.map(e => (
                    <CircleMarker
                        key={`heatmap-${e.id}`}
                        center={[e.latitude, e.longitude]}
                        radius={100}
                        pathOptions={{
                            fillColor: e.severity >= 8 ? '#ef4444' : e.severity >= 5 ? '#f97316' : '#eab308',
                            fillOpacity: 0.1,
                            weight: 0,
                            stroke: false
                        }}
                    />
                ))}

                {/* Raw signal dots */}
                {signals.map(signal => {
                    const isOffline = signal.source === 'offline_mesh';
                    return (
                        <CircleMarker
                            key={signal.id}
                            center={[signal.latitude, signal.longitude]}
                            radius={3}
                            pathOptions={{
                                color: isOffline ? '#94a3b8' : '#60a5fa',
                                fillColor: isOffline ? '#cbd5e1' : '#93c5fd',
                                fillOpacity: 0.6,
                                weight: isOffline ? 1 : 0,
                                dashArray: isOffline ? '2, 3' : null,
                            }}
                        >
                            <Popup>
                                <div className="text-slate-900 text-xs">
                                    <strong>Source:</strong> {signal.source}<br />
                                    <strong>Urgency:</strong> {signal.urgency}
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}

                {/* Low-severity events — static CircleMarker */}
                {lowRisk.map(event => {
                    const color = event.severity >= 4 ? '#f97316' : '#eab308';
                    return (
                        <CircleMarker
                            key={event.id}
                            center={[event.latitude, event.longitude]}
                            radius={40}
                            pathOptions={{ color, fillColor: color, fillOpacity: 0.3, weight: 1 }}
                        >
                            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                                <div className="text-xs font-bold px-2 py-1 rounded shadow-sm border bg-white/90 text-slate-900 border-slate-300">
                                    EVENT DETECTED
                                </div>
                            </Tooltip>
                            <Popup eventHandlers={{
                                add: () => onSelect(event.id),
                                remove: () => onSelect(null)
                            }}>
                                <div className="text-slate-100 min-w-[200px]">
                                    <h3 className="font-bold text-sm uppercase text-slate-400 mb-2 border-b border-slate-700 pb-1">Incident Report</h3>

                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <div className="text-xl font-black">{event.severity}/10</div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Severity</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold">{event.confidence}%</div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Confidence</div>
                                        </div>
                                    </div>

                                    {/* Nearest Response for Low-Risk */}
                                    <div className="border-t border-slate-700 pt-2">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Response Proximity</p>
                                        {getAllNearestInfra(event.latitude, event.longitude, 1).map((infra, i) => (
                                            <div key={i} className="flex justify-between text-[10px] mb-0.5">
                                                <span className="text-slate-300 truncate mr-2">{infra.name}</span>
                                                <span className="text-cyan-400 font-mono flex-shrink-0">{infra.distance.toFixed(1)}km</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 pt-2 border-t border-slate-700 text-[10px] text-slate-500 uppercase">
                                        {event.status} detected by cluster
                                    </div>

                                    <SocialFeed signals={signals.filter(s =>
                                        calculateHaversine(event.latitude, event.longitude, s.latitude, s.longitude) <= 0.5
                                    )} />
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}

                {/* High-severity events — animated polygon + trail */}
                {highRisk.map(event => (
                    <AnimatedRiskZone
                        key={event.id}
                        event={event}
                        centroidHistory={centroidTrails[event.id] ?? []}
                        signals={signals}
                        onSelect={onSelect}
                    />
                ))}

                {/* Infrastructure Markers */}
                {infraData.map((infra, idx) => {
                    const selectedEvent = events.find(e => e.id === selectedId);
                    const nearestInfra = selectedEvent
                        ? getAllNearestInfra(selectedEvent.latitude, selectedEvent.longitude, 3)
                        : [];

                    const isHighlighted = nearestInfra.some(ni => ni.name === infra.name);

                    const colorMap = {
                        hospital: '#22c55e', // green
                        police: '#ef4444',   // red
                        unit: '#3b82f6'      // blue
                    };

                    return (
                        <CircleMarker
                            key={`infra-${idx}`}
                            center={[infra.lat, infra.lon]}
                            radius={isHighlighted ? 8 : 4}
                            pathOptions={{
                                color: colorMap[infra.type],
                                fillColor: colorMap[infra.type],
                                fillOpacity: isHighlighted ? 0.8 : 0.4,
                                weight: isHighlighted ? 3 : 1,
                                className: isHighlighted ? 'animate-pulse' : ''
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                                <div className="text-[10px] font-bold px-1 rounded bg-slate-900 text-white border border-slate-700">
                                    {infra.name}
                                </div>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}

                <MapLegend />
            </MapContainer>
        </div>
    );
};

export default MapView;
