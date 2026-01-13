import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode, title?: string }> = ({ children, title }) => {
    return (
        <div className="min-h-screen w-full flex justify-center bg-[#0f172a] text-slate-50 selection:bg-indigo-500/30">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900 pointer-events-none" />

            <div className="w-full max-w-md min-h-screen relative flex flex-col bg-slate-900/0 sm:border-x sm:border-slate-800 shadow-2xl">
                {title && (
                    <header className="px-6 py-5 border-b border-slate-800/50 sticky top-0 bg-slate-900/80 backdrop-blur-xl z-40 flex items-center justify-between">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent drop-shadow-sm">
                            {title}
                        </h1>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </header>
                )}
                <main className="flex-1 p-5 flex flex-col relative z-10">
                    {children}
                </main>
            </div>
        </div>
    );
};
