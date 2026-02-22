import React from 'react';

const PROTOCOL_MAP = {
    fire: {
        critical: [
            "Evacuate Sector 4 - Immediate fire front approaching",
            "Deploy aerial suppression units (Airstrike 1 & 2)",
            "Seal main gas line at Central Hub",
            "Activate neighborhood sprinkler mesh"
        ],
        warning: [
            "Establish 500m perimeter around focus point",
            "Notify local fire stations for standby",
            "Monitor wind speed and humidity trends"
        ]
    },
    flood: {
        critical: [
            "Deploy rapid-response water rescue teams",
            "Open drainage spillways at Sector 7",
            "Order vertical evacuation for low-lying areas",
            "Dispatch emergency power backups to hospital"
        ],
        warning: [
            "Monitor water levels at sensor nodes B1-B5",
            "Alert residents of potential surge in 60 mins",
            "Standby sandbag deployment teams"
        ]
    },
    seismic: {
        critical: [
            "Trigger automatic subway/train emergency halt",
            "Alert rescue teams for structural collapse assessment",
            "Activate seismic alarm network (all sectors)",
            "Shut down power grid in epicenter proximity"
        ],
        warning: [
            "Inspect infrastructure integrity in Zone B",
            "Prepare for potential aftershocks",
            "Check integrity of high-rise stabilization systems"
        ]
    }
};

const RecommendedActions = ({ selectedEvent }) => {
    let actions = [
        "Maintain routine sensor health checks",
        "Analyze historical data patterns",
        "Standby for incoming signals"
    ];
    let colors = "border-slate-700 bg-slate-800/50";
    let title = "Global Monitoring Protocol";
    let subTitle = "Scanning for anomalies...";

    if (selectedEvent) {
        const type = (selectedEvent.type || 'fire').toLowerCase();
        const severity = selectedEvent.severity;
        const protocol = PROTOCOL_MAP[type] || PROTOCOL_MAP.fire;

        title = `${type.toUpperCase()} RESPONSE PROTOCOL`;
        subTitle = `Incident ID: ${selectedEvent.id.slice(0, 8)}`;

        if (severity >= 7) {
            actions = protocol.critical;
            colors = "border-red-500/50 bg-red-900/10";
        } else {
            actions = protocol.warning;
            colors = "border-orange-500/50 bg-orange-900/10";
        }
    }

    return (
        <div className={`rounded-lg border ${colors} p-4 mt-4 shadow-lg transition-all duration-300`}>
            <div className="flex justify-between items-center mb-3 border-b border-slate-700/50 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {title}
                </h3>
                <span className="text-[9px] text-slate-500 font-mono">{subTitle}</span>
            </div>
            <ul className="space-y-2">
                {actions.map((action, i) => (
                    <li key={i} className="flex items-start text-sm text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 mt-1.5 shrink-0"></span>
                        <span className="leading-tight">{action}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RecommendedActions;
