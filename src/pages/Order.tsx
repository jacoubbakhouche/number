import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Order as OrderType } from '../types';
import { Layout } from '../components/Layout';
import { Copy, Clock, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Order = () => {
    const params = useParams();
    // Decode ID immediately to handle special chars like '+'
    const orderId = params.orderId ? decodeURIComponent(params.orderId) : null;
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderType | null>(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [receivedCode, setReceivedCode] = useState<string | null>(null);
    const [status, setStatus] = useState("PENDING");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fix: Use 'number' for browser compatibility instead of NodeJS.Timeout
    const pollTimer = useRef<number | null>(null);

    // Initial Data Load
    useEffect(() => {
        if (!orderId || orderId === 'undefined' || orderId === 'null') {
            setError(`Invalid Link. ID received: "${orderId}"`);
            return;
        }

        const loadOrder = () => {
            const localOrder = apiService.getOrderDetails(orderId);
            if (!localOrder) {
                // Try one sync attempt if order not found
                console.log("Order not found locally, trying sync...");
                apiService.syncTwilioNumbers().then(() => {
                    const retryOrder = apiService.getOrderDetails(orderId);
                    if (retryOrder) {
                        setOrderData(retryOrder);
                    } else {
                        setError(`Order not found: ${orderId}`);
                    }
                });
                return;
            }
            setOrderData(localOrder);
        };

        const setOrderData = (data: OrderType) => {
            setOrder(data);
            setReceivedCode(data.code || null);
            setStatus(data.status);
            updateTimeLeft(data.expiresAt);
            if (!data.code && data.status !== 'EXPIRED') {
                startPolling(orderId);
            }
        };

        loadOrder();

        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, [orderId, navigate]);

    // Timer Countdown Logic (Long Term)
    useEffect(() => {
        if (!order) return;

        const updateTimer = () => {
            const now = Date.now();
            const diff = order.expiresAt - now;

            if (diff <= 0) {
                setTimeLeft("Expired");
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft(days + "d " + hours + "h " + minutes + "m");
        };

        updateTimer(); // Run immediately
        const interval = setInterval(updateTimer, 60000); // Update every minute is enough for long term
        return () => clearInterval(interval);
    }, [order]);

    const updateTimeLeft = (expiresAt: number) => {
        const now = Date.now();
        const diff = expiresAt - now;
        if (diff <= 0) {
            setTimeLeft("Expired");
            return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(days + "d " + hours + "h " + minutes + "m");
    };

    const startPolling = (id: string) => {
        // Polling every 4 seconds for new messages
        // We do NOT stop polling anymore, to keep receiving new messages
        pollTimer.current = window.setInterval(async () => {
            const result = await apiService.getStatus(id);
            // Updating local state if new stuff arrives
            const updatedOrder = apiService.getOrderDetails(id);
            if (updatedOrder) {
                setOrder(updatedOrder);
                if (updatedOrder.code) {
                    setReceivedCode(updatedOrder.code);
                    setStatus('COMPLETED');
                }
            }
        }, 4000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (error) {
        return (
            <Layout title="Error">
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                    <p className="text-slate-400 max-w-xs">{error}</p>
                    <button
                        onClick={() => navigate('/history')}
                        className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                        Go back to My Numbers
                    </button>
                </div>
            </Layout>
        );
    }

    if (!order) return <div className="text-white p-10 text-center animate-pulse">Loading order details...</div>;

    const codeBoxClass = receivedCode
        ? "transition-all duration-500 bg-dark-card border rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center relative overflow-hidden border-green-500/50 bg-green-500/5 mb-8"
        : "transition-all duration-500 bg-dark-card border rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center relative overflow-hidden border-slate-700 mb-8";

    const copyButtonClass = copied
        ? "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all font-medium text-lg shadow-lg"
        : "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium text-lg shadow-lg";

    return (
        <Layout title="Order Details">
            <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-500">

                {/* Header Back Button */}
                <button
                    onClick={() => navigate('/history')}
                    className="flex items-center text-slate-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft size={16} className="mr-1" /> Back
                </button>

                {/* Number Card */}
                <div className="bg-dark-card border border-slate-700 rounded-2xl p-6 relative overflow-hidden mb-6">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock size={100} />
                    </div>

                    <div className="relative z-10 text-center space-y-2">
                        <div className="text-slate-400 text-sm uppercase tracking-wider font-medium">Number / الرقم</div>
                        <div className="text-4xl font-mono font-bold text-white tracking-wider my-4">
                            {order.phoneNumber}
                        </div>

                        <button
                            onClick={() => copyToClipboard(order.phoneNumber)}
                            className={copyButtonClass}
                        >
                            {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                            {copied ? 'تم النسخ!' : 'نسخ الرقم'}
                        </button>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-700/50 flex justify-center text-slate-500 text-xs gap-2">
                        <Clock size={14} />
                        <span>Valid until: {timeLeft}</span>
                    </div>
                </div>

                {/* Code Box (Latest) */}
                <div className={codeBoxClass}>
                    {receivedCode ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center w-full"
                        >
                            <div className="bg-slate-900/50 p-6 rounded-2xl border border-emerald-500/30 text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500" />

                                <div className="relative">
                                    <h3 className="text-emerald-400 font-medium mb-4 flex items-center justify-center gap-2">
                                        <CheckCircle2 size={20} />
                                        !وصل الكود
                                    </h3>

                                    <div
                                        className="font-mono text-white transition-all break-all drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                        style={{
                                            fontSize: receivedCode.length > 8 ? '1.5rem' : '3.5rem',
                                            letterSpacing: receivedCode.length > 8 ? 'normal' : '0.2em'
                                        }}
                                    >
                                        {receivedCode}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-center space-y-6 relative z-10 w-full max-w-xs">
                            <div className="relative mx-auto w-16 h-16">
                                <span className="absolute inset-0 border-4 border-slate-700/30 rounded-full"></span>
                                <span className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                            </div>

                            <div>
                                <h3 className="text-xl font-medium text-white mb-2">Wait for code...</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Waiting for SMS... <br />
                                </p>
                            </div>

                            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500/50 animate-progress w-full origin-left"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages Log (Sijillat) */}
                <div className="space-y-4">
                    <h3 className="text-slate-400 font-medium text-sm px-1">سجل الرسائل الواردة (Records)</h3>

                    {!order.messages || order.messages.length === 0 ? (
                        <div className="bg-dark-card border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
                            No messages received yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {order.messages.map((msg, idx) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                                            {msg.sender || 'Unknown Sender'}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(msg.date).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-sm font-mono break-all leading-relaxed">
                                        {msg.body}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </Layout>
    );
};

export default Order;
