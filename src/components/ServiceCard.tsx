import React from 'react';
import type { Service } from '../types';
import { IconMap } from '../utils/icons';

interface ServiceCardProps {
    service: Service;
    onClick: (service: Service) => void;
    disabled?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onClick, disabled }) => {
    const Icon = IconMap[service.icon] || IconMap['Globe'];

    return (
        <button
            onClick={() => onClick(service)}
            disabled={disabled}
            className="relative overflow-hidden flex flex-col items-center justify-center p-5 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-black/20"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300 ring-1 ring-slate-600/50 group-hover:ring-indigo-500/50">
                <Icon className="w-7 h-7 text-slate-300 group-hover:text-indigo-400 transition-colors drop-shadow-md" />
            </div>

            <span className="relative text-base font-semibold text-slate-200 group-hover:text-white transition-colors">{service.name}</span>
            <div className="relative mt-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-700/50 group-hover:border-indigo-500/30 transition-colors">
                <span className="text-xs font-mono font-medium text-emerald-400 shadow-sm">${service.price}</span>
            </div>
        </button>
    );
};
