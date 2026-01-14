import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Order as OrderType } from '../types';
import { Layout } from '../components/Layout';
import { Copy, Clock, CheckCircle2, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Order = () => {
    const params = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderType | null>(null);
    const [receivedCode, setReceivedCode] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState('30:00');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('PENDING');
    const [copied, setCopied] = useState(false);
    const pollTimer = useRef<number | null>(null);

    // Initial decode orderId
    const orderId = params.orderId ? decodeURIComponent(params.orderId) : null;

    useEffect(() => {
        if (!orderId) {
            setError('Invalid Order ID');
            return;
        }

        const fetchOrder = () => {
            const data = apiService.getOrderDetails(orderId);
            if (data) {
                setOrder(data);
                if (data.code) {
                    setReceivedCode(data.code);
                    setStatus('COMPLETED');
                }
                startPolling(data.id);
            } else {
                setError('Order not found or expired');
            }
        };

        fetchOrder();

        const timer = setInterval(() => {
            // Simplified countdown just for visual effect
            const now = new Date();
            const future = new Date(now.getTime() + 30 * 60000); // 30 mins
            // For real implementation this should use order.expiresAt
        }, 1000);

        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
            clearInterval(timer);
        };
    }, [orderId]);

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
            <div className="max-w-md mx-auto animate-in fade-in zoom-in duration-500">

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

                {/* Messages Log (Sijillat) - PLACED AT THE TOP AS REQUESTED */}
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-slate-400 font-medium text-sm flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            Live Records / السجل
                        </h3>
                        <button
                            onClick={async () => {
                                const btn = document.getElementById('refresh-btn');
                                if (btn) btn.classList.add('animate-spin');
                                await apiService.getStatus(order.id);
                                const updated = apiService.getOrderDetails(order.id);
                                if (updated) {
                                    setOrder(updated);
                                    if (updated.code) setReceivedCode(updated.code);
                                }
                                setTimeout(() => btn?.classList.remove('animate-spin'), 1000);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-colors border border-slate-700 hover:text-white group"
                            title="Refresh Messages"
                            type="button"
                        >
                            <Loader2 id="refresh-btn" size={16} className="group-hover:text-white transition-all" />
                        </button>
                    </div>

                    {!order.messages || order.messages.length === 0 ? (
                        <div className="bg-dark-card border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                            <Loader2 size={24} className="animate-spin text-slate-600" />
                            <p>Waiting for incoming messages...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {order.messages.map((msg, idx) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-colors relative overflow-hidden"
                                >
                                    {/* New Message Highlight */}
                                    {idx === 0 && (
                                        <div className="absolute top-0 right-0 p-1">
                                            <span className="bg-emerald-500 text-[10px] text-black font-bold px-2 py-0.5 rounded-bl-lg">NEW</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded w-fit">
                                                {msg.sender || 'Unknown Sender'}
                                            </span>
                                            {msg.status === 'failed' || msg.status === 'undelivered' ? (
                                                <span className="text-[10px] text-red-400 flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 w-fit">
                                                    <AlertCircle size={10} /> Failed: {msg.errorCode || 'Blocked'}
                                                </span>
                                            ) : null}
                                        </div>
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            {new Date(msg.date).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-sm font-mono break-all leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
                                        {msg.body}
                                        {msg.errorMessage && (
                                            <span className="block mt-2 text-xs text-red-400 bg-red-900/20 p-1 rounded">
                                                Server Error: {msg.errorMessage}
                                            </span>
                                        )}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Code Box (Latest Status) - MOVED TO BOTTOM */}
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

                {/* Instructions */}
                <div className="bg-dark-card border border-slate-800 rounded-xl p-6 mt-6">
                    <h3 className="text-white font-medium mb-4 text-sm">كيف تستخدمه؟</h3>
                    <ul className="space-y-3 text-sm text-slate-400">
                        <li className="flex gap-3">
                            <span className="text-indigo-400 font-bold">1.</span>
                            انسخ الرقم واستخدمه في التطبيق (واتساب/تليجرام).
                        </li>
                        <li className="flex gap-3">
                            <span className="text-indigo-400 font-bold">2.</span>
                            انتظر  هنا حتى يظهر الكود تلقائياً.
                        </li>
                    </ul>
                </div>

            </div>
        </Layout>
    );
};

export default Order;
