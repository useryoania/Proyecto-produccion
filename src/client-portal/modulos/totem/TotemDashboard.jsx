import React, { useState } from 'react';
import { Package, RefreshCw, CheckCircle, Search, ArrowLeft } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const BASE_PREFIXES = ['SB', 'DF', 'UVDF', 'ECOUV', 'TWC', 'EMB', 'TWD', 'EST', 'TP', 'IMD'];
const STANDALONE_PREFIXES = ['PRO', 'VEN'];

export const TotemDashboard = ({ onLogout }) => {
    // Search state
    const [externalMode, setExternalMode] = useState(''); // '' | 'X' | 'R'
    const [prefix, setPrefix] = useState('');
    const [number, setNumber] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Results state
    const [client, setClient] = useState(null);
    const [orders, setOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [creating, setCreating] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const fullCode = prefix ? `${externalMode && BASE_PREFIXES.includes(prefix) ? externalMode : ''}${prefix}-${number}` : number;

    const handlePrefix = (p) => {
        if (STANDALONE_PREFIXES.includes(p)) setExternalMode('');
        setPrefix(p);
        setSearchError('');
    };

    const handleKey = (key) => {
        setSearchError('');
        if (key === 'DEL') {
            setNumber(prev => prev.slice(0, -1));
        } else if (key === 'CLEAR') {
            setNumber('');
            setPrefix('');
            setXMode(false);
        } else if (number.length < 10) {
            setNumber(prev => prev + key);
        }
    };

    const handleSearch = async () => {
        if (!prefix || !number) {
            setSearchError('Seleccioná un prefijo e ingresá el número');
            return;
        }
        setSearching(true);
        setSearchError('');
        try {
            const res = await fetch(`${API_BASE}/web-orders/totem-lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderCode: fullCode })
            });
            const data = await res.json();
            if (data.success) {
                setClient(data.client);
                setOrders(data.orders || []);
                setSelectedOrders([]);
            } else {
                setSearchError(data.message || 'Orden no encontrada');
            }
        } catch (err) {
            setSearchError('Error de conexión');
        } finally {
            setSearching(false);
        }
    };

    const handleBack = () => {
        setClient(null);
        setOrders([]);
        setSelectedOrders([]);
        setError('');
        setNumber('');
        setPrefix('');
        setExternalMode('');
    };

    const toggleOrder = (id) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedOrders(
            selectedOrders.length === orders.length ? [] : orders.map(o => o.id)
        );
    };

    const createPickup = async () => {
        if (selectedOrders.length === 0) return;
        setCreating(true);
        setError('');
        try {
            const selected = orders.filter(o => selectedOrders.includes(o.id));
            const totalCost = selected.reduce((sum, o) => sum + (o.amount || 0), 0);

            const res = await fetch(`${API_BASE}/web-orders/totem-create-pickup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orders: selectedOrders,
                    totalCost: totalCost.toFixed(2),
                    lugarRetiro: 5,
                    formaRetiro: 'RT',
                    clientId: client.idCliente
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setSelectedOrders([]);
                setTimeout(() => { setSuccess(false); onLogout(); }, 5000);
            } else {
                setError(data.error || 'Error al crear retiro');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setCreating(false);
        }
    };

    // Success screen
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center gap-4">
                <CheckCircle size={80} strokeWidth={1.5} className="text-green-400" />
                <h2 className="text-4xl font-extrabold text-green-400">¡Retiro creado!</h2>
                <p className="text-xl text-white/70">Un operario te atenderá en breve.</p>
                <p className="text-sm text-white/30 mt-3">¡Gracias por tu preferencia!</p>
            </div>
        );
    }

    // Results screen
    if (client) {
        // Sort: searched order first
        const sortedOrders = [...orders].sort((a, b) => {
            if (a.id === fullCode) return -1;
            if (b.id === fullCode) return 1;
            return 0;
        });

        return (
            <div className="min-h-screen flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
                    <h2 className="text-2xl md:text-3xl font-bold">
                        Hola, {client.company || client.name}
                    </h2>
                    <button
                        className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-lg font-bold bg-gradient-to-r from-blue-500 to-brand-500 text-white transition-all active:scale-[0.97] disabled:opacity-30"
                        onClick={createPickup}
                        disabled={creating || selectedOrders.length === 0}
                    >
                        <Package size={22} />
                        {creating
                            ? 'Creando...'
                            : selectedOrders.length > 0
                                ? `Retirar (${selectedOrders.length})`
                                : 'Retirar'
                        }
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-auto w-[80%] mt-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-center text-[15px]">
                        {error}
                    </div>
                )}

                {/* Orders list */}
                <div className="flex-1 overflow-y-auto py-6">
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-white/40 text-lg gap-4">
                            <Package size={48} strokeWidth={1} />
                            <p>No hay órdenes listas para retirar</p>
                            <button
                                className="mt-4 px-8 py-3 rounded-xl text-base font-semibold bg-white/[0.08] border border-white/15 text-white/70 transition-all active:bg-white/[0.15]"
                                onClick={handleBack}
                            >
                                <ArrowLeft size={18} className="inline mr-2" /> Buscar otra orden
                            </button>
                        </div>
                    ) : (
                        <div className="w-[80%] mx-auto flex flex-col gap-2">
                            {/* Column headers */}
                            <div className="flex items-center gap-4 px-5 py-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
                                <div className="w-[26px] flex-shrink-0" />
                                <div className="w-36 flex-shrink-0">Orden</div>
                                <div className="flex-1">Descripción</div>
                                <div className="w-24 flex-shrink-0 text-right">Cantidad</div>
                                <div className="w-28 flex-shrink-0 text-right">Costo</div>
                            </div>
                            {sortedOrders.map(order => (
                                <div
                                    key={order.id}
                                    className={`flex items-center gap-4 rounded-xl px-5 py-4 cursor-pointer transition-all active:scale-[0.99] border-2 ${selectedOrders.includes(order.id)
                                        ? 'bg-blue-500/10 border-blue-500/40'
                                        : 'bg-white/[0.05] border-white/[0.08]'
                                        }`}
                                    onClick={() => toggleOrder(order.id)}
                                >
                                    {/* Checkbox */}
                                    <div className="flex-shrink-0 text-blue-400">
                                        {selectedOrders.includes(order.id) ? (
                                            <CheckCircle size={26} />
                                        ) : (
                                            <div className="w-[26px] h-[26px] rounded-full border-2 border-white/20" />
                                        )}
                                    </div>

                                    {/* Order number */}
                                    <div className="w-36 flex-shrink-0">
                                        <span className="text-base font-bold">{order.id}</span>
                                    </div>

                                    {/* Description */}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm text-white/60 truncate block">{order.desc}</span>
                                    </div>

                                    {/* Quantity */}
                                    <div className="w-24 flex-shrink-0 text-right">
                                        <span className="text-sm text-white/50">{order.quantity}</span>
                                    </div>

                                    {/* Cost */}
                                    <div className="w-28 flex-shrink-0 text-right">
                                        <span className="text-base font-bold text-blue-400">
                                            {order.currency} {order.amount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Search another */}
                            <button
                                className="mt-4 self-start flex items-center gap-2 text-sm text-white/30 hover:text-white/50 transition-colors"
                                onClick={handleBack}
                            >
                                <ArrowLeft size={16} /> Buscar otra orden
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Search screen (default)
    return (
        <div className="flex items-center justify-center min-h-screen p-6">
            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-[520px] shadow-2xl">

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Ingresá tu número de orden</h2>
                    <p className="text-white/40 text-sm mt-1">Seleccioná el prefijo y escribí el número</p>
                </div>

                {/* External prefix toggles */}
                <div className="flex items-center gap-2 mb-3">
                    <button
                        className={`w-12 py-2.5 rounded-lg text-base font-bold border-2 transition-all text-center ${externalMode === 'X'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-white/[0.04] border-white/10 text-white/40'
                            }`}
                        onClick={() => setExternalMode(externalMode === 'X' ? '' : 'X')}
                    >
                        X
                    </button>
                    <button
                        className={`w-12 py-2.5 rounded-lg text-base font-bold border-2 transition-all text-center ${externalMode === 'R'
                            ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                            : 'bg-white/[0.04] border-white/10 text-white/40'
                            }`}
                        onClick={() => setExternalMode(externalMode === 'R' ? '' : 'R')}
                    >
                        R
                    </button>
                    <span className="text-white/30 text-sm">Prefijo externo</span>
                </div>

                {/* Base prefixes */}
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {BASE_PREFIXES.map(p => (
                        <button
                            key={p}
                            className={`py-2.5 rounded-lg text-sm font-bold border transition-all active:scale-95 ${prefix === p
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : 'bg-white/[0.06] border-white/10 text-white/70 hover:bg-white/[0.1]'
                                }`}
                            onClick={() => handlePrefix(p)}
                        >
                            {externalMode ? `${externalMode}${p}` : p}
                        </button>
                    ))}
                </div>

                {/* Standalone prefixes */}
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                    {STANDALONE_PREFIXES.map(p => (
                        <button
                            key={p}
                            className={`py-2.5 rounded-lg text-sm font-bold border transition-all active:scale-95 ${prefix === p
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                : 'bg-white/[0.06] border-white/10 text-white/70 hover:bg-white/[0.1]'
                                }`}
                            onClick={() => handlePrefix(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Code display */}
                <div className="mb-4 flex items-center gap-2">
                    {prefix && (
                        <div className="text-2xl font-bold text-blue-400 whitespace-nowrap">
                            {externalMode && BASE_PREFIXES.includes(prefix) ? `${externalMode}${prefix}` : prefix}-
                        </div>
                    )}
                    <div className="flex-1 bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-center text-2xl font-bold tracking-[6px] min-h-[40px] text-white">
                        {number || <span className="text-white/20 text-lg tracking-normal">{prefix ? 'Ingresá el número...' : 'Seleccioná un prefijo...'}</span>}
                    </div>
                </div>

                {/* Error */}
                {searchError && (
                    <div className="bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-center text-sm mb-3">
                        {searchError}
                    </div>
                )}

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'DEL'].map(key => (
                        <button
                            key={key}
                            className={`rounded-xl py-3.5 text-xl font-semibold border transition-all active:scale-95 ${key === 'CLEAR' || key === 'DEL'
                                ? 'bg-white/[0.04] border-white/10 text-white/60 text-base'
                                : 'bg-white/[0.08] border-white/10 text-white hover:bg-white/[0.12]'
                                }`}
                            onClick={() => handleKey(key)}
                            disabled={searching}
                        >
                            {key === 'DEL' ? '⌫' : key === 'CLEAR' ? 'C' : key}
                        </button>
                    ))}
                </div>

                {/* Search button */}
                <button
                    className="w-full py-4 rounded-xl text-xl font-bold bg-custom-magenta text-white transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
                    onClick={handleSearch}
                    disabled={searching || !prefix || !number}
                >
                    <Search size={22} />
                    {searching ? 'Buscando...' : 'Buscar'}
                </button>

            </div>
        </div>
    );
};
