import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { TwilioNumber, Service } from '../types';
import { ServiceCard } from '../components/ServiceCard';
import { AvailableNumbersList } from '../components/AvailableNumbersList';
import { Layout } from '../components/Layout';
import { Search, Loader2, ArrowLeft, Globe } from 'lucide-react';

export const Home: React.FC = () => {
    const navigate = useNavigate();

    // Data
    const COUNTRIES = apiService.getCountries();
    const SERVICES = apiService.getServices();

    // Selection State
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    // Search State
    const [isSearching, setIsSearching] = useState(false);
    const [availableNumbers, setAvailableNumbers] = useState<TwilioNumber[] | null>(null);

    // Buying State
    const [isBuying, setIsBuying] = useState<string | null>(null);

    // Step 1: Search for numbers globally
    const handleSearch = async (service: Service) => {
        setSelectedService(service);
        setIsSearching(true);
        setAvailableNumbers(null);

        try {
            // Using enhanced Global Search
            const numbers = await apiService.searchGlobal(service.id);
            setAvailableNumbers(numbers);

            if (numbers.length === 0) {
                alert("No numbers available at the moment. Please try again later.");
            }
        } catch (e: any) {
            alert(`Search failed: ${e.message}`);
        } finally {
            setIsSearching(false);
        }
    };

    // Step 2: Buy specific number
    const handleBuyNumber = async (phoneNumber: string) => {
        if (!selectedService || !availableNumbers) return;

        setIsBuying(phoneNumber);
        try {
            // Find the correct country ID for this specific number
            const targetNumber = availableNumbers.find(n => n.phoneNumber === phoneNumber);
            // Default to first country if match fails (shouldn't happen if iso codes match)
            const targetCountry = COUNTRIES.find(c => c.iso === targetNumber?.country) || COUNTRIES[0];

            const order = await apiService.buyNumber(phoneNumber, selectedService.id, targetCountry.id);
            if (order && order.id) {
                navigate(`/order/${order.id}`);
            }
        } catch (e: any) {
            alert(`Purchase Failed: ${e.message}`);
        } finally {
            setIsBuying(null);
        }
    };

    const resetSearch = () => {
        setAvailableNumbers(null);
        setSelectedService(null);
    };

    return (
        <Layout title="Number Store">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header Section */}
                {!availableNumbers && (
                    <div className="mb-8 text-center relative overflow-hidden rounded-3xl bg-slate-800/50 p-8 border border-slate-700/50">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>

                        <div className="relative">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-3">
                                Private Numbers
                            </h1>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                                Get instant verification codes for WhatsApp, Telegram, and more from global numbers.
                            </p>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 border border-slate-800/60 shadow-xl">

                    {/* If we have search results, show them. Otherwise show selection form */}
                    {availableNumbers ? (
                        <div>
                            <button
                                onClick={resetSearch}
                                className="mb-4 text-sm text-slate-400 flex items-center gap-1 hover:text-white transition-colors"
                            >
                                <ArrowLeft size={16} /> Back to Services
                            </button>

                            <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-3">
                                <span className="text-2xl drop-shadow-md">🌍</span>
                                <div className="flex-1">
                                    <div className="text-sm text-indigo-400 font-bold">{selectedService?.name}</div>
                                    <div className="text-xs text-slate-400">Showing available numbers from all countries</div>
                                </div>
                            </div>

                            <AvailableNumbersList
                                numbers={availableNumbers}
                                onBuy={handleBuyNumber}
                                isBuying={isBuying}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 rounded-2xl border border-indigo-500/20 mb-6 relative overflow-hidden">
                                <Globe className="absolute right-2 top-2 text-indigo-500/10 transform rotate-12" size={80} />
                                <h2 className="text-lg font-bold text-white mb-2 relative z-10">Select a Service</h2>
                                <p className="text-slate-400 text-xs relative z-10">
                                    Tap a service to find numbers globally. We search UK, USA, Germany, and more automatically.
                                </p>
                            </div>

                            {/* Service Selection Grid */}
                            <section>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block ml-1 flex justify-between items-center">
                                    <span>Available Apps</span>
                                    {isSearching && (
                                        <span className="text-indigo-400 flex items-center gap-1 normal-case text-xs bg-indigo-500/10 px-2 py-1 rounded-full">
                                            <Loader2 size={10} className="animate-spin" /> Global Search...
                                        </span>
                                    )}
                                </label>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {SERVICES.map((service) => (
                                        <div key={service.id} className="relative group">
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <ServiceCard
                                                service={service}
                                                onClick={() => handleSearch(service)}
                                                disabled={isSearching}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 text-slate-500 text-xs flex gap-3 items-start">
                                <Search size={16} className="shrink-0 mt-0.5 text-slate-400" />
                                <span className="leading-relaxed">
                                    Our system automatically checks for the best available numbers across <strong>Multiple European & US Carriers</strong> to ensure high delivery rates.
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};
