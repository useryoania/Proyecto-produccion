import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import loadingAnim from '../../assets/animations/loading.json';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/apiClient';
import { CreditCard, AlertCircle, ChevronRight, CheckCircle, Package } from 'lucide-react';
import { CustomButton } from '../pautas/CustomButton';

export const UnpaidPickupsView = () => {
    const { user } = useAuth();
    const [retiros, setRetiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState(null);

    useEffect(() => {
        const fetchRetiros = async () => {
            try {
                const res = await apiClient.get('/web-retiros/mis-retiros');
                if (res) {
                    const data = Array.isArray(res) ? res : (res.data || []);
                    setRetiros(data);
                }
            } catch (error) {
                console.error("Error fetching unpaid retiros:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRetiros();
    }, []);

    const handlePay = async (retiro) => {
        setPayingId(retiro.OrdIdRetiro);
        try {
            const payload = {
                ordenRetiro: retiro.OrdIdRetiro,
                totalAmount: retiro.Monto,
                activeCurrency: retiro.Moneda || 'UYU',
                bultosJSON: retiro.BultosJSON
            };

            const res = await apiClient.post('/web-retiros/payment', payload);
            const url = res?.url || res?.data?.url;
            const txId = res?.transactionId || res?.data?.transactionId;

            if (url) {
                window.open(url, '_blank');
                if (txId) {
                    window.location.href = `/payment-status?txId=${txId}`;
                }
            } else {
                alert("No se pudo obtener el link de pago.");
            }
        } catch (error) {
            console.error("Error generating payment link:", error);
            alert("Error al contactar la pasarela de pagos.");
        } finally {
            setPayingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh]">
                <Lottie animationData={loadingAnim} loop style={{ width: 250, height: 250 }} />
                <span className="font-bold uppercase -mt-20 animate-pulse text-zinc-300">Buscando pagos pendientes...</span>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <CreditCard size={48} strokeWidth={1} className="text-brand-gold" />
                <div>
                    <h2 className="text-3xl font-bold text-zinc-300 uppercase tracking-tight">Pagos <span className="text-custom-cyan">Pendientes</span></h2>
                    <p className="text-zinc-500 uppercase text-sm">Retiros pendientes de pago.</p>
                </div>
            </div>

            {retiros.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-brand-dark border border-zinc-800">
                    <div className="w-20 h-20 bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={40} className="text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-200 mb-2">¡Todo al día!</h3>
                    <p className="text-zinc-500 max-w-sm">
                        No tienes órdenes de retiro pendientes de pago en este momento.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {retiros.map((retiro) => {
                        let bultos = [];
                        try {
                            bultos = JSON.parse(retiro.BultosJSON || "[]");
                        } catch (e) { }

                        return (
                            <div key={retiro.OrdIdRetiro} className="overflow-hidden rounded-xl bg-brand-dark border border-zinc-800 hover:border-zinc-700 transition-all shadow-lg shadow-black/20">
                                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-amber-900/30 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-amber-700/40">
                                                Pendiente de Pago
                                            </span>
                                            <span className="text-sm font-bold text-zinc-500">
                                                {new Date(retiro.Fecha).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-black text-zinc-200 uppercase italic tracking-tight">
                                                ORDEN: <span className="text-custom-cyan">{retiro.OrdIdRetiro}</span>
                                            </h3>
                                            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
                                                <Package size={16} /> {bultos.length} artículo(s) en esta orden
                                            </p>
                                        </div>

                                        {bultos.length > 0 && (
                                            <div className="bg-custom-dark p-4 rounded-xl border border-zinc-800 space-y-2">
                                                {bultos.slice(0, 3).map((b, i) => (
                                                    <div key={i} className="flex justify-between text-sm">
                                                        <span className="text-zinc-400 truncate max-w-[250px]" title={b.desc}>{b.desc || b.orderNumber}</span>
                                                        <span className="font-bold text-custom-cyan">${b.amount}</span>
                                                    </div>
                                                ))}
                                                {bultos.length > 3 && (
                                                    <div className="text-xs text-zinc-600 pt-2 border-t border-zinc-800 mt-2">
                                                        + {bultos.length - 3} artículos más
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-6 md:p-0">
                                        <div className="text-center md:text-right">
                                            <p className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">Total a Pagar</p>
                                            <p className="text-4xl font-black text-zinc-100">
                                                <span className="text-2xl text-zinc-500 mr-2">{retiro.Moneda === 'USD' ? 'US$' : '$'}</span>
                                                {Number(retiro.Monto || 0).toFixed(2)}
                                            </p>
                                        </div>

                                        <CustomButton
                                            onClick={() => handlePay(retiro)}
                                            isLoading={payingId === retiro.OrdIdRetiro}
                                            disabled={payingId !== null}
                                            icon={CreditCard}
                                            className="w-full md:w-auto px-8 py-4 !bg-transparent !text-zinc-100 !shadow-none border border-zinc-800 hover:!border-brand-cyan/40 hover:!bg-brand-cyan/5"
                                            whileHover={{ scale: 1 }}
                                            whileTap={{ scale: 1 }}
                                        >
                                            Pagar Online
                                        </CustomButton>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
