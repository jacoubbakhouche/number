import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { TwilioNumber, Service } from '../types';
import { CountrySelector } from '../components/CountrySelector';
import { ServiceCard } from '../components/ServiceCard';
import { AvailableNumbersList } from '../components/AvailableNumbersList';
import { Layout } from '../components/Layout';
import { Search, Loader2, ArrowLeft } from 'lucide-react';

export const Home: React.FC = () => {
    const navigate = useNavigate();

    // Data from Service
    const COUNTRIES = apiService.getCountries();
    const SERVICES = apiService.getServices();

    // Selection State
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    // Search Search
    const [isSearching, setIsSearching] = useState(false);
    const [availableNumbers, setAvailableNumbers] = useState<TwilioNumber[] | null>(null);

    // Buying State
    const [isBuying, setIsBuying] = useState<string | null>(null);

    // Step 1: Search for numbers
    const handleSearch = async (service: Service) => {
        setSelectedService(service);
        setIsSearching(true);
        setAvailableNumbers(null); // Reset previous results

        try {
            const numbers = await apiService.searchNumbers(selectedCountry.id, service.id);
            setAvailableNumbers(numbers);
        } catch (e) {
            alert('Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    // Step 2: Buy specific number
    const handleBuyNumber = async (phoneNumber: string) => {
        if (!selectedService) return;

        setIsBuying(phoneNumber);
        try {
            const order = await apiService.buyNumber(phoneNumber, selectedService.id, selectedCountry.id);
            if (order && order.id) {
                navigate(`/order/${order.id}`);
            } else {
                // If null is returned but no exception thrown (handled in api)
            }
        } catch (e: any) {
            // Show the actual error message from Twilio (e.g., "Address Required", "Insufficient Funds")
            alert(`Purchase Failed: ${e.message}`);
        } finally {
            setIsBuying(null);
        }
    };

    const resetSearch = () => {
        setAvailableNumbers(null);
        setSelectedService(null);
    }

    return (
        <Layout title={availableNumbers ? "Select Number" : "Number Store"}>
            <div className="space-y-6">

                {/* Header Actions */}
                {!availableNumbers && (
                    <div className="flex justify-end">
                        <button
                            onClick={() => navigate('/history')}
                            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 transition-all hover:bg-emerald-500/20 shadow-md shadow-emerald-900/20"
                        >
                            My Numbers &rarr;
                        </button>
                    </div>
                )}

                {/* If we have search results, show them. Otherwise show selection form */}
                {availableNumbers ? (
                    <div>
                        <button
                            onClick={resetSearch}
                            className="mb-4 text-sm text-slate-400 flex items-center gap-1 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={16} /> Back to Services
                        </button>

                        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3">
                            <span className="text-2xl">{selectedCountry.iso /* Using ISO as flag placeholder or need emoji mapping */}</span>
                            <div className="flex-1">
                                <div className="text-sm text-primary font-bold">{selectedService?.name}</div>
                                <div className="text-xs text-slate-400">Showing available numbers</div>
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
                        {/* Step 1: Select Country */}
                        <section className={isSearching ? 'opacity-50 pointer-events-none' : ''}>
                            <label className="text-sm text-slate-400 mb-2 block ml-1">Select Country</label>
                            <CountrySelector
                                countries={COUNTRIES}
                                selectedCountry={selectedCountry}
                                onSelect={setSelectedCountry}
                            />
                        </section>

                        {/* Step 2: Select Service (Triggers Search) */}
                        <section>
                            <label className="text-sm text-slate-400 mb-2 block ml-1 flex justify-between">
                                <span>Available Services</span>
                                {isSearching && <span className="text-primary flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Searching...</span>}
                            </label>

                            <div className="grid grid-cols-3 gap-3">
                                {SERVICES.map((service) => (
                                    <div key={service.id} className="relative">
                                        <ServiceCard
                                            service={service}
                                            onClick={() => handleSearch(service)}
                                            disabled={isSearching}
                                        />
                                        {/* Loading Overlay for the specific card user clicked if needed, or global loading */}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="mt-8 p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-sm">
                            <p className="flex gap-2">
                                <Search size={16} className="shrink-0 mt-0.5" />
                                <span>Select a service above to search for available numbers in <strong>{selectedCountry.name}</strong>.</span>
                            </p>
                        </div>
                    </>
                )}

            </div>
        </Layout>
    );
};
