import React, { useState } from 'react';
import type { Country } from '../types';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountrySelectorProps {
    countries: Country[];
    selectedCountry: Country;
    onSelect: (country: Country) => void;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({ countries, selectedCountry, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 text-left hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all duration-300 shadow-sm group"
            >
                <span className="flex items-center gap-4">
                    <span className="text-2xl drop-shadow-sm">{selectedCountry.flag}</span>
                    <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">{selectedCountry.name}</span>
                </span>
                <div className={`p-1 rounded-full bg-slate-700/50 transition-all duration-300 ${isOpen ? 'bg-indigo-500/20 rotate-180' : ''}`}>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-colors ${isOpen ? 'text-indigo-400' : 'group-hover:text-slate-300'}`} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl shadow-black/50 max-h-60 overflow-y-auto overflow-hidden divide-y divide-slate-700/50"
                    >
                        {countries.map((country) => (
                            <button
                                key={country.id}
                                onClick={() => {
                                    onSelect(country);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-4 p-4 hover:bg-indigo-500/10 transition-colors ${selectedCountry.id === country.id ? 'bg-indigo-500/20' : ''
                                    }`}
                            >
                                <span className="text-2xl drop-shadow-sm">{country.flag}</span>
                                <span className={`font-medium ${selectedCountry.id === country.id ? 'text-indigo-300' : 'text-slate-300'}`}>{country.name}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
