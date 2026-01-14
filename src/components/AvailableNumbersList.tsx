import React from 'react';
import type { TwilioNumber } from '../types';
import { ShoppingCart, Loader2 } from 'lucide-react';

interface AvailableNumbersListProps {
    numbers: TwilioNumber[];
    onBuy: (phoneNumber: string) => void;
    isBuying: string | null; // ID of number currently being bought
}

export const AvailableNumbersList: React.FC<AvailableNumbersListProps> = ({ numbers, onBuy, isBuying }) => {
    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-slate-400 text-sm font-medium sticky top-0 bg-dark-bg/95 backdrop-blur-sm py-2 z-10">
                Available Numbers ({numbers.length})
            </h3>

            {numbers.map((num) => (
                <div
                    key={num.phoneNumber}
                    className="bg-dark-card border border-slate-700 rounded-xl p-4 flex items-center justify-between group hover:border-primary transition-colors"
                >
                    <div>
                        <div>
                            <div className="font-mono font-semibold text-slate-200 flex items-center gap-2">
                                {num.country && <span className="bg-slate-700 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">{num.country}</span>}
                                {num.phoneNumber}
                            </div>
                            <div className="text-xs text-slate-400 flex gap-2 items-center mt-1">
                                <span>{num.region}</span>
                                <span className="text-emerald-400 font-bold ml-auto">• ${num.price}</span>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                    {num.type || 'Monthly'}
                                </span>
                                {num.beta && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1 rounded">BETA</span>}
                            </div>
                            <div className="flex gap-1 mt-1">
                                {(num.capabilities.SMS || num.capabilities.sms) && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">SMS</span>}
                                {num.capabilities.voice && <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">VOICE</span>}
                                {(num.capabilities.MMS || num.capabilities.mms) && <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">MMS</span>}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => onBuy(num.phoneNumber)}
                        disabled={isBuying !== null}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${isBuying === num.phoneNumber
                            ? 'bg-slate-700 text-slate-400 cursor-wait'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                            }`}
                    >
                        {isBuying === num.phoneNumber ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <ShoppingCart size={16} />
                        )}
                        {isBuying === num.phoneNumber ? 'Buying...' : `Buy ($${num.price})`}
                    </button>
                </div>
            ))}
        </div>
    );
};
