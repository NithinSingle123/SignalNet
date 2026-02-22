import React from 'react';

const TimelineSlider = ({ value, onChange, min, max }) => {
    // Format timestamp to readable time
    const formatTime = (ts) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col space-y-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 backdrop-blur-sm min-w-[200px]">
            <div className="flex justify-between items-center overflow-hidden">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Timeline Analysis</span>
                <span className="text-[10px] font-mono text-white bg-blue-600/20 px-1.5 rounded border border-blue-500/20">
                    {value === max ? 'REAL-TIME' : `${formatTime(value)}`}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
            />
            <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                <span>-6h History</span>
                <span>Present</span>
            </div>
        </div>
    );
};

export default TimelineSlider;
