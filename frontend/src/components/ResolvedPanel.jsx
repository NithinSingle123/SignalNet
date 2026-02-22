import React, { useState } from 'react';

const ResolvedPanel = ({ events, onSelect, selectedId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const resolvedEvents = events.filter(e => e.status === 'resolved');

    if (resolvedEvents.length === 0) return null;

    return (
        <div className="mt-6 border-t border-slate-700 pt-6">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full mb-4 px-2 hover:bg-slate-800/50 rounded py-1 transition-colors group"
            >
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest group-hover:text-green-400 transition-colors">
                        Resolved History ({resolvedEvents.length})
                    </h2>
                </div>
                <svg
                    className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isExpanded && (
                <div className="space-y-3 px-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {resolvedEvents.map(event => (
                        <div
                            key={event.id}
                            onClick={() => onSelect(event.id)}
                            className={`cursor-pointer group relative p-3 rounded bg-green-950/20 border border-green-900/40 hover:bg-green-900/30 hover:border-green-500/30 transition-all duration-300 ${selectedId === event.id ? 'ring-1 ring-green-500 bg-green-900/40' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-tighter">
                                    {event.type || 'UNKNOWN'} • RESOLVED
                                </span>
                                <span className="text-[9px] font-mono text-slate-500">
                                    {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="text-[10px] text-slate-400 font-mono">
                                    {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                                </div>
                                <div className="text-xs font-bold text-slate-200">
                                    SEV {event.severity}
                                </div>
                            </div>

                            {/* Hover details */}
                            <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded pointer-events-none"></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResolvedPanel;
