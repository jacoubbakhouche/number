import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Order } from '../types';
import { Layout } from '../components/Layout';
import { IconMap } from '../utils/icons';
import { Clock, Copy, ArrowLeft, MessageSquare } from 'lucide-react';

export const HistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const loadOrders = async () => {
            // Sync first
            await apiService.syncTwilioNumbers();
            // Then load local
            setOrders(apiService.getMyOrders());
        }
        loadOrders();
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <Layout title="My Numbers">
            <div className="mb-6">
                <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
                    <ArrowLeft size={16} /> Back to Store
                </button>
            </div>

            <div className="space-y-4 pb-10">
                {orders.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                        <p className="text-slate-400">No numbers purchased yet.</p>
                    </div>
                ) : (
                    orders.map((order) => {
                        // Determine Service Icon
                        // This is a quick lookup, ideally we store icon name in Order or lookup from SERVICES
                        const Icon = IconMap[order.serviceId === 'wa' ? 'MessageCircle' :
                            order.serviceId === 'tg' ? 'Send' :
                                order.serviceId === 'fb' ? 'Facebook' : 'Globe'];

                        return (
                            <div
                                key={order.id}
                                onClick={() => {
                                    const rawId = order.id || order.phoneNumber;
                                    if (rawId) navigate(`/order/${encodeURIComponent(rawId)}`);
                                }}
                                className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 active:scale-98 transition-all cursor-pointer hover:bg-slate-800/60 group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rawId = order.id || order.phoneNumber;
                                                // IMPORTANT: Encode the ID to handle '+' characters safely in URL
                                                if (rawId) {
                                                    navigate(`/order/${encodeURIComponent(rawId)}`);
                                                } else {
                                                    alert("Error: Order ID is missing");
                                                }
                                            }}
                                            className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-300 ring-1 ring-slate-600 hover:bg-slate-700 hover:text-white transition-colors"
                                        >
                                            {Icon ? <Icon size={20} /> : <Clock size={20} />}
                                        </button>
                                        <div>
                                            <div className="font-mono font-semibold text-slate-200">{order.phoneNumber}</div>
                                            <div className="text-xs text-slate-500 flex gap-2">
                                                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${order.code ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                        order.status === 'EXPIRED' ? 'bg-red-500/10 text-red-400' :
                                            'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse'
                                        }`}>
                                        {order.code ? 'CODE RECEIVED' : order.status}
                                    </div>
                                </div>

                                {order.code && (
                                    <div className="mt-3 bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center group-hover:bg-emerald-900/20 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(order.code!); }}
                                    >
                                        <div className="text-xs text-emerald-600/80 uppercase tracking-wider font-bold">Code</div>
                                        <div className="font-mono text-xl font-bold text-white tracking-widest">{order.code}</div>
                                        <Copy size={16} className="text-emerald-500 opacity-50" />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </Layout>
    );
};
