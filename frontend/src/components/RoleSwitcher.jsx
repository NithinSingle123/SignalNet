import React from 'react';

const RoleSwitcher = ({ activeRole, onRoleChange }) => {
    const roles = [
        { id: 'viewer', label: 'Viewer', color: 'bg-slate-700', icon: '🔍' },
        { id: 'operator', label: 'Operator', color: 'bg-blue-600', icon: '📡' },
        { id: 'commander', label: 'Commander', color: 'bg-red-700', icon: '🎖️' }
    ];

    return (
        <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-700 shadow-inner">
            {roles.map((role) => (
                <button
                    key={role.id}
                    onClick={() => onRoleChange(role.id)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeRole === role.id
                            ? `${role.color} text-white shadow-lg scale-105 border border-white/20`
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                        }`}
                >
                    <span>{role.icon}</span>
                    <span>{role.label}</span>
                </button>
            ))}
        </div>
    );
};

export default RoleSwitcher;
