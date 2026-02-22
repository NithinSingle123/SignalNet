import React, { useMemo } from 'react';

const SocialFeed = ({ signals = [] }) => {
    // Keywords to highlight
    const keywords = ["flood", "urgent", "help", "rescue", "fire", "danger"];

    // Highlight keywords in text
    const highlightText = (text) => {
        if (!text) return "";
        let parts = [text];

        keywords.forEach(keyword => {
            const newParts = [];
            parts.forEach(part => {
                if (typeof part !== 'string') {
                    newParts.push(part);
                    return;
                }
                const regex = new RegExp(`(${keyword})`, 'gi');
                const splitPart = part.split(regex);
                splitPart.forEach((subPart, i) => {
                    if (subPart.toLowerCase() === keyword.toLowerCase()) {
                        newParts.push(<span key={`${keyword}-${i}`} className="text-red-400 font-bold bg-red-400/10 px-0.5 rounded uppercase text-[10px]">{subPart}</span>);
                    } else {
                        newParts.push(subPart);
                    }
                });
            });
            parts = newParts;
        });

        return parts;
    };

    const sortedSignals = useMemo(() => {
        return [...signals]
            .filter(s => s.metadata && s.metadata.text)
            .sort((a, b) => {
                // Primary: Recency, Secondary: Urgency
                if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
                return b.urgency - a.urgency;
            });
    }, [signals]);

    if (sortedSignals.length === 0) {
        return (
            <div className="text-[10px] text-slate-500 italic p-2 bg-slate-900/50 rounded border border-slate-800">
                No verified social intelligence for this cluster...
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1 mt-2">
            <div className="flex items-center space-x-1 mb-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Social Intel</h4>
            </div>

            {sortedSignals.map((signal, idx) => (
                <div
                    key={signal.id}
                    className="p-2 bg-slate-900/80 border border-slate-700/50 rounded text-[11px] leading-tight animate-in fade-in slide-in-from-left-2 duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-mono text-slate-500">@{signal.source}</span>
                        <span className={`text-[8px] px-1 rounded font-bold ${signal.urgency >= 8 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            U-{signal.urgency}
                        </span>
                    </div>
                    <p className="text-slate-200">
                        {highlightText(signal.metadata.text)}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default SocialFeed;
