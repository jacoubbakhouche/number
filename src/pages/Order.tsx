import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Order as OrderType } from '../types';
import { Layout } from '../components/Layout';
import { Copy, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const Order = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderType | null>(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [receivedCode, setReceivedCode] = useState<string | null>(null);
    const [status, setStatus] = useState("PENDING");
    const [copied, setCopied] = useState(false);

    const pollTimer = useRef<number | null>(null);

    useEffect(() => {
        if (!orderId) {
            navigate('/');
            return;
        }
        const localOrder = apiService.getOrderDetails(orderId);
        if (!localOrder) {
            navigate('/');
            return;
        }
        setOrder(localOrder);
        setReceivedCode(localOrder.code || null);
        setStatus(localOrder.status);
        updateTimeLeft(localOrder.expiresAt);
        if (!localOrder.code && localOrder.status !== 'EXPIRED') {
            startPolling(orderId);
        }
        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, [orderId, navigate]);

    useEffect(() => {
        if (!order) return;
        const timer = setInterval(() => {
            updateTimeLeft(order.expiresAt);
        }, 60000);
        return () => clearInterval(timer);
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
        pollTimer.current = window.setInterval(async () => {
            const result = await apiService.getStatus(id);
            if (result.startsWith('STATUS_OK')) {
                const code = result.split(':')[1];
                setReceivedCode(code);
                setStatus('COMPLETED');
                if (pollTimer.current) clearInterval(pollTimer.current);
            }
        }, 3000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!order) return <div className="text-white p-10">Loading...</div>;

    const codeBoxClass = receivedCode
        ? "transition-all duration-500 bg-dark-card border rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center relative overflow-hidden border-green-500/50 bg-green-500/5"
        : "transition-all duration-500 bg-dark-card border rounded-2xl p-8 min-h-[220px] flex flex-col items-center justify-center relative overflow-hidden border-slate-700";

    const copyButtonClass = copied
        ? "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all font-medium text-lg shadow-lg"
        : "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium text-lg shadow-lg";

    return (
        <Layout title="Order Details">
            <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in duration-500">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-slate-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft size={16} className="mr-1" /> Back to Home
                </button>

                <div className="bg-dark-card border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock size={100} />
                    </div>
                    <div className="relative z-10 text-center space-y-2">
                        <div className="text-slate-400 text-sm uppercase tracking-wider font-medium">Number / الرقم</div>
                        <div className="text-4xl font-mono font-bold text-white tracking-wider my-4">
                            {order.phoneNumber}
                        </div>
                        <button onClick={() => copyToClipboard(order.phoneNumber)} className={copyButtonClass}>
                            {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                            {copied ? 'تم النسخ!' : 'نسخ الرقم'}
                        </button>
                    </div>
                    <div className="mt-8 pt-4 border-t border-slate-700/50 flex justify-center text-slate-500 text-xs gap-2">
                        <Clock size={14} />
                        <span>Valid until: {timeLeft}</span>
                    </div>
                </div>

                <div className={codeBoxClass}>
                    {status === 'COMPLETED' ? (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center w-full">
                            <div className="bg-slate-900/50 p-8 rounded-2xl border border-emerald-500/30 text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                                <div className="relative">
                                    <h3 className="text-emerald-400 font-medium mb-4 flex items-center justify-center gap-2">
                                        <CheckCircle2 size={20} /> !وصل الكود
                                    </h3>
                                    <div
                                        className="font-mono text-white transition-all break-all drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                        style={{
                                            fontSize: receivedCode && receivedCode.length > 8 ? '1.25rem' : '3.75rem',
                                            letterSpacing: receivedCode && receivedCode.length > 8 ? 'normal' : '0.5em'
                                        }}
                                    >
                                        {receivedCode}
                                    </div>
                                    <p className="text-slate-500 text-xs mt-4">استخدم هذا الكود لتفعيل التطبيق</p>
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
                                <p className="text-slate-400 text-sm leading-relaxed">Waiting for SMS... <br />(This may take up to 2 mins)</p>
                            </div>
                            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500/50 animate-progress w-full origin-left"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-dark-card border border-slate-800 rounded-xl p-6">
                    <h3 className="text-white font-medium mb-4 text-sm">كيف تستخدمه؟</h3>
                    <ul className="space-y-3 text-sm text-slate-400">
                        <li className="flex gap-3"><span className="text-indigo-400 font-bold">1.</span>انسخ الرقم واستخدمه في التطبيق (واتساب/تليجرام).</li>
                        <li className="flex gap-3"><span className="text-indigo-400 font-bold">2.</span>انتظر هنا حتى يظهر الكود تلقائياً.</li>
                    </ul>
                </div>
            </div>
        </Layout>
    );
};

export default Order;
