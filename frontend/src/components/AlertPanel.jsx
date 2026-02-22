import React, { useState } from 'react';
import { api } from '../services/api';

const AlertCard = ({ alert, onResolve, onForceActive, onSelect, selectedId, advisories = [], activeRole }) => {
    const isSelected = selectedId === alert.id;
    const [expanded, setExpanded] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [forcing, setForcing] = useState(false);
    const timeSince = Math.floor((Date.now() - alert.created_at) / 60000); // Minutes

    const handleResolve = async (e) => {
        e.stopPropagation();
        setResolving(true);
        try {
            await onResolve(alert.id);
        } catch (error) {
            console.error(error);
        } finally {
            setResolving(false);
        }
    };

    const isResolved = alert.status === 'resolved';

    // if (isResolved) return null; // REMOVED: User wants them to visible and green

    return (
        <div
            onClick={() => onSelect(alert.id)}
            className={`cursor-pointer rounded-lg p-4 mb-4 shadow-lg backdrop-blur-sm transition-all duration-300 group relative border ${isSelected ? 'ring-2 ring-blue-500 border-blue-400 scale-[1.02]' : ''} ${isResolved ? 'bg-green-950/40 border-green-500/50 hover:bg-green-900/40' : 'bg-red-950/40 border-red-500/50 hover:bg-red-900/40'
                }`}>

            {/* Resolve Button - Only show if NOT resolved */}
            {/* Commander Bypass: Force Active - Only for 50% to 70% confidence */}
            {!isResolved && activeRole === 'commander' && alert.confidence >= 50 && alert.confidence <= 70 && (
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        setForcing(true);
                        await onForceActive(alert.id);
                        setForcing(false);
                    }}
                    disabled={forcing}
                    className="absolute top-2 right-32 bg-orange-600 hover:bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded shadow transition-all border border-orange-400/50"
                >
                    {forcing ? 'FORCING...' : 'FORCE ACTIVE'}
                </button>
            )}

            {/* Resolve Button - Only show if NOT resolved and role is NOT viewer */}
            {!isResolved && activeRole !== 'viewer' && (
                <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="absolute top-2 right-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                    {resolving ? 'RESOLVING...' : 'MARK RESOLVED'}
                </button>
            )}

            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                    <span className="relative flex h-3 w-3">
                        {!isResolved && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${isResolved ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </span>
                    <h3 className={`font-bold tracking-wide text-sm ${isResolved ? 'text-green-100' : 'text-red-100'}`}>
                        {isResolved ? 'INCIDENT RESOLVED' : (alert.type ? `${alert.type.toUpperCase()} DETECTED` : 'CRITICAL INCIDENT')}
                    </h3>
                </div>
                <span className={`text-xs font-mono border px-1 rounded mr-8 ${isResolved ? 'text-green-300 border-green-800 bg-green-900/50' : 'text-red-300 border-red-800 bg-red-900/50'
                    }`}>
                    T+{timeSince}m
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className={`text-xs uppercase font-semibold ${isResolved ? 'text-green-400' : 'text-red-400'}`}>Severity</p>
                    <p className="text-3xl font-black text-white">{alert.severity}<span className={`text-lg font-normal ${isResolved ? 'text-green-400' : 'text-red-400'}`}>/10</span></p>
                </div>
                <div>
                    <p className={`text-xs uppercase font-semibold ${isResolved ? 'text-green-400' : 'text-red-400'}`}>Confidence</p>
                    <p className="text-3xl font-black text-white">{alert.confidence}<span className={`text-lg font-normal ${isResolved ? 'text-green-400' : 'text-red-400'}`}>%</span></p>
                </div>
            </div>

            {/* ETA Indicator */}
            {!isResolved && alert.eta_minutes && (
                <div className="mb-4 py-2 px-3 bg-blue-500/10 border border-blue-500/30 rounded flex items-center justify-between">
                    <div className="flex items-center text-blue-300">
                        <svg className="w-4 h-4 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-wider">Estimated Stabilization</span>
                    </div>
                    <span className="text-sm font-black text-blue-100">{alert.eta_minutes} <span className="text-[10px] font-normal opacity-70">MIN</span></span>
                </div>
            )}

            <div className={`text-xs mb-3 flex items-center ${isResolved ? 'text-green-200' : 'text-red-200'}`}>
                <svg className={`w-4 h-4 mr-1 ${isResolved ? 'text-green-400' : 'text-red-400'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                AI-verified multi-source incident
            </div>

            {/* Public Advisory Box */}
            {advisories.length > 0 && (
                <div className="mb-4 p-3 bg-amber-500/10 border-l-4 border-amber-500 rounded-r shadow-inner">
                    <div className="flex items-center space-x-2 text-amber-400 mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">Public Advisory Active</span>
                    </div>
                    {advisories.map((advisory, idx) => (
                        <p key={idx} className="text-xs text-amber-100 font-medium leading-relaxed">
                            {advisory.message}
                        </p>
                    ))}
                    <div className="mt-2 flex space-x-3 text-[9px] text-amber-500 font-bold uppercase tracking-tighter">
                        <span>📡 BROADCAST: {advisories[0].channels}</span>
                    </div>
                </div>
            )}

            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full text-center text-xs border-t pt-2 transition-colors flex justify-center items-center ${isResolved ? 'text-green-400 border-green-800/50 hover:text-white' : 'text-red-400 border-red-800/50 hover:text-white'
                    }`}
            >
                {expanded ? 'Hide Analysis' : 'Why this alert?'}
                <svg className={`w-3 h-3 ml-1 transform transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            {expanded && (
                <div className="mt-3 text-[11px] text-slate-300 space-y-3 bg-black/30 p-3 rounded border border-white/5">
                    {alert.verification ? (
                        <>
                            <div className="flex items-center justify-between text-blue-400 font-bold uppercase tracking-wider mb-1">
                                <span>Trust Indicators</span>
                                <span className="text-[10px] bg-blue-500/20 px-1 rounded">DEEP ANALYSIS</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 p-1.5 rounded">
                                    <p className="text-[9px] text-slate-500 uppercase">Sources</p>
                                    <p className="text-white font-mono text-xs">{alert.verification.source_diversity} Independent</p>
                                </div>
                                <div className="bg-white/5 p-1.5 rounded">
                                    <p className="text-[9px] text-slate-500 uppercase">Urgency Agreement</p>
                                    <p className="text-white font-mono text-xs">{alert.verification.urgency_consistency}%</p>
                                </div>
                                <div className="bg-white/5 p-1.5 rounded">
                                    <p className="text-[9px] text-slate-500 uppercase">Data Freshness</p>
                                    <p className="text-white font-mono text-xs">{alert.verification.recency_factor}%</p>
                                </div>
                                <div className="bg-white/5 p-1.5 rounded">
                                    <p className="text-[9px] text-slate-500 uppercase">Network State</p>
                                    <p className={`font-mono text-xs ${alert.verification.offline_penalty ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {alert.verification.offline_penalty ? 'OFFLINE MESH' : 'SAT LINK'}
                                    </p>
                                </div>
                            </div>

                            {alert.verification.breakdown && (
                                <div className="mt-1">
                                    <div className="flex justify-between text-[8px] text-slate-500 mb-1 font-bold uppercase tracking-widest">
                                        <span>Trust Breakdown</span>
                                        <span>{alert.confidence}%</span>
                                    </div>
                                    <div className="flex h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div style={{ width: `${alert.verification.breakdown.diversity}%` }} className="bg-blue-600"></div>
                                        <div style={{ width: `${alert.verification.breakdown.consistency}%` }} className="bg-indigo-600"></div>
                                        <div style={{ width: `${alert.verification.breakdown.freshness}%` }} className="bg-cyan-600"></div>
                                    </div>
                                </div>
                            )}

                            <p className="italic text-slate-400 leading-tight pt-1 border-t border-white/5">
                                "{alert.verification.verification_summary}"
                            </p>
                        </>
                    ) : (
                        <div className="flex items-center space-x-2 text-slate-500 italic">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse"></div>
                            <span>Verification data pending...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AlertPanel = ({ events, onResolve, onForceActive, onSelect, selectedId, advisories = {}, activeRole }) => {
    // Show high severity events. If resolved, they stay (but turn green by AlertCard logic).
    // We remove the strict status filter because we want to see resolved items.
    // However, maybe we limits resolved items? For now user said "alerts in red box should be converted into green box".
    // This implies existing items stay.
    // Only show active high severity alerts with >= 50% confidence in the top panel
    const alerts = events.filter(e => e.severity >= 7 && e.confidence >= 50 && e.status === 'active');

    if (alerts.length === 0) return null;

    return (
        <div className="mb-6">
            {alerts.map(alert => (
                <AlertCard
                    key={alert.id}
                    alert={alert}
                    onResolve={onResolve}
                    onForceActive={onForceActive}
                    onSelect={onSelect}
                    selectedId={selectedId}
                    advisories={advisories[alert.id] || []}
                    activeRole={activeRole}
                />
            ))}
        </div>
    );
};

export default AlertPanel;
