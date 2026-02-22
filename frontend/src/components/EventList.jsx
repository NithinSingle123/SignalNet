import React from 'react';

const EventList = ({ events, onResolve, onForceActive, onSelect, selectedId, activeRole }) => {
    // User requested removed from Active Events tab if resolved.
    const activeEvents = events.filter(e => e.status !== 'resolved');

    return (
        <div className="bg-slate-800/80 rounded-lg p-6 shadow-xl border border-slate-700 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-600 pb-2">Active Events</h2>

            {activeEvents.length === 0 ? (
                <p className="text-slate-400">No active events detected.</p>
            ) : (
                <div className="space-y-4">
                    {activeEvents.map(event => (
                        <div
                            key={event.id}
                            onClick={() => onSelect(event.id)}
                            className={`cursor-pointer p-4 rounded-lg border transition-all relative group ${selectedId === event.id ? 'ring-2 ring-blue-500 border-blue-400' : ''
                                } ${event.severity >= 7 ? 'bg-red-900/20 border-red-500/50' :
                                    event.severity >= 4 ? 'bg-orange-900/20 border-orange-500/50' :
                                        'bg-yellow-900/20 border-yellow-500/50'
                                }`}>

                            {/* Actions Overlay */}
                            <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {activeRole === 'commander' && event.confidence >= 50 && event.confidence <= 70 && (
                                    <button
                                        onClick={() => onForceActive(event.id)}
                                        className="bg-orange-600 hover:bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow"
                                    >
                                        FORCE ACTIVE
                                    </button>
                                )}
                                {activeRole !== 'viewer' && (
                                    <button
                                        onClick={() => onResolve(event.id)}
                                        className="bg-green-600 hover:bg-green-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow"
                                    >
                                        RESOLVE
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 ${event.severity >= 7 ? 'bg-red-600 text-white' :
                                        event.severity >= 4 ? 'bg-orange-600 text-white' :
                                            'bg-yellow-600 text-black'
                                        }`}>
                                        {`SEVERITY ${event.severity}`}
                                    </span>
                                    <p className="text-slate-300 text-sm">
                                        Lat: {event.latitude.toFixed(4)}, Lon: {event.longitude.toFixed(4)}
                                    </p>
                                    {event.eta_minutes && (
                                        <div className="mt-2 flex items-center text-[10px] text-blue-400 font-bold uppercase tracking-tighter">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                                            Stabilization: {event.eta_minutes}m
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-tighter">
                                        Phase: <span className="text-blue-400">{event.lifecycle_phase || 'Detection'}</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white">{event.confidence}%</div>
                                    <div className="text-xs text-slate-400">confidence</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EventList;
