import React from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PushNotificationBanner = ({ show, onAccept, onDismiss }) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-6 inset-x-0 mx-auto z-[80] w-[calc(100%-2rem)] max-w-md"
                >
                    <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/40 p-5 relative overflow-hidden">
                        {/* Glow accent */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-cyan/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-brand-magenta/15 rounded-full blur-2xl pointer-events-none" />

                        {/* Close */}
                        <button
                            onClick={onDismiss}
                            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-800"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-start gap-4 relative z-10">
                            {/* Icon */}
                            <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-brand-cyan/30 to-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center">
                                <Bell size={20} className="text-brand-cyan" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-zinc-100 mb-1">
                                    ¿Activar notificaciones?
                                </h4>
                                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                                    Te avisamos cuando tu pedido cambie de estado, esté listo para retiro o se despache.
                                </p>

                                {/* Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={onAccept}
                                        className="flex-1 py-2 px-4 bg-brand-cyan text-zinc-900 text-xs font-bold rounded-xl hover:brightness-110 transition-all active:scale-[0.97]"
                                    >
                                        Sí, activar
                                    </button>
                                    <button
                                        onClick={onDismiss}
                                        className="py-2 px-4 text-zinc-500 text-xs font-medium rounded-xl hover:bg-zinc-800 hover:text-zinc-300 transition-all"
                                    >
                                        Ahora no
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
