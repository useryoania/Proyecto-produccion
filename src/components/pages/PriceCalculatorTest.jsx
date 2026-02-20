import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Ajustar import según tu estructura
import { toast } from 'react-hot-toast';

const ProductSearchInput = ({ value, onChange, catalog = [] }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleSearch = (text) => {
        onChange(text);
        if (!text || text.length < 1) {
            setSuggestions([]);
            return;
        }

        const upperText = text.toUpperCase();
        const matches = catalog.filter(p =>
            p.CodArticulo.toUpperCase().includes(upperText) ||
            (p.Descripcion && p.Descripcion.toUpperCase().includes(upperText))
        ).slice(0, 10);

        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
    };

    const selectedProduct = catalog.find(p => p.CodArticulo === value);

    return (
        <div className="relative">
            <input
                className="w-full border border-slate-300 rounded p-2 font-mono text-sm focus:border-indigo-400 outline-none uppercase"
                value={value}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Busca un producto..."
                onFocus={() => { if (value === '' && catalog.length > 0) { setSuggestions(catalog.slice(0, 10)); setShowSuggestions(true); } else if (value) { handleSearch(value); } }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {selectedProduct && (
                <div className="mt-1 ml-1 leading-tight">
                    <div className="text-xs text-slate-600 font-bold">{selectedProduct.Descripcion}</div>
                    <div className="text-[10px] text-slate-500">Precio Base: ${selectedProduct.Precio}</div>
                </div>
            )}
            {showSuggestions && (
                <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-lg rounded z-50 max-h-60 overflow-y-auto mt-1">
                    {suggestions.map(s => (
                        <div
                            key={s.CodArticulo}
                            className="p-2 hover:bg-indigo-50 cursor-pointer text-xs border-b last:border-0 flex justify-between items-center"
                            onClick={() => { onChange(s.CodArticulo); setShowSuggestions(false); }}
                        >
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-bold text-indigo-700">{s.CodArticulo}</span>
                                <span className="text-[10px] text-slate-400">{s.GrupoNombre || s.Grupo}</span>
                            </div>
                            <span className="text-slate-500 truncate max-w-[150px] text-right ml-2">{s.Descripcion}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const PriceCalculatorTest = ({ customers = [], assignments = {}, onSearch }) => {
    const [products, setProducts] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [showDebug, setShowDebug] = useState(false);

    // Formulario
    const [selectedProduct, setSelectedProduct] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientFilter, setClientFilter] = useState(''); // Nuevo filtro
    const [quantity, setQuantity] = useState(1);

    const [extraProfiles, setExtraProfiles] = useState([]); // IDs manuales
    const [activeProfiles, setActiveProfiles] = useState([]); // Todos los perfiles activos en la UI

    // Resultado
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [ignoredSurcharges, setIgnoredSurcharges] = useState([]); // Indices de recargos desactivados manualmente

    useEffect(() => {
        loadData();
    }, []);

    // Effect to trigger server search when filter changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (onSearch) {
                onSearch(clientFilter);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [clientFilter]);

    const loadData = async () => {
        try {
            const [prodRes, profRes] = await Promise.all([
                api.get('/prices/base'),
                api.get('/profiles')
            ]);
            setProducts(prodRes.data || []);
            setProfiles(profRes.data || []);
        } catch (e) {
            console.error("Error loading initial data", e);
            toast.error("Error cargando productos/perfiles");
        }
    };

    // Filtrar clientes para el select (Top 50)
    const filteredCustomers = customers.filter(c => {
        if (!clientFilter) return true;
        const search = clientFilter.toLowerCase();
        return (c.Nombre || '').toLowerCase().includes(search) ||
            (c.NombreFantasia || '').toLowerCase().includes(search) ||
            String(c.CodCliente).includes(search);
    }).slice(0, 50);

    // Calcular perfiles BASE (Globales + Asignados al cliente)
    const baseProfileIds = React.useMemo(() => {
        let ids = [];
        // 1. Globales
        const globalProfiles = profiles.filter(p => p.EsGlobal).map(p => p.ID);
        ids = [...ids, ...globalProfiles];
        // 2. Asignados
        if (clientId && assignments[clientId]) {
            const assigned = assignments[clientId].pid;
            if (Array.isArray(assigned)) ids = [...ids, ...assigned];
            else if (assigned) ids.push(assigned);
        }
        return [...new Set(ids)];
    }, [clientId, profiles, assignments]);

    // Sincronizar perfiles activos cuando cambia el cliente o la base
    useEffect(() => {
        setActiveProfiles(baseProfileIds);
    }, [baseProfileIds]);

    const handleCalculate = async () => {
        if (!selectedProduct) return toast.error("Selecciona un producto");

        setLoading(true);
        try {
            const params = {
                cod: selectedProduct,
                qty: quantity,
                cid: clientId || null,
                extra: extraProfiles.join(',')
            };

            const res = await api.get('/prices/calculate', { params });
            setResult(res.data);
            setIgnoredSurcharges([]); // Reset manual toggles on new calculation

        } catch (e) {
            console.error(e);
            toast.error("Error al calcular precio");
        } finally {
            setLoading(false);
        }
    };

    const toggleProfile = (id) => {
        if (activeProfiles.includes(id)) {
            setActiveProfiles(activeProfiles.filter(pid => pid !== id));
        } else {
            setActiveProfiles([...activeProfiles, id]);
        }
        // Sync extraProfiles for backend call (although backend enforces globals, we verify in frontend)
        if (extraProfiles.includes(id)) {
            setExtraProfiles(extraProfiles.filter(p => p !== id));
        } else if (!baseProfileIds.includes(id)) {
            setExtraProfiles([...extraProfiles, id]);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md mt-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b pb-2 flex items-center gap-2">
                <i className="fa-solid fa-calculator text-indigo-600"></i>
                Simulador de Precios
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CONFIGURACIÓN */}
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Producto</label>
                        <ProductSearchInput
                            value={selectedProduct}
                            onChange={setSelectedProduct}
                            catalog={products}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Cliente</label>

                            {/* Combo Buscador Clientes */}
                            <div className="border border-slate-300 rounded p-1 bg-slate-50/50 focus-within:ring-2 focus-within:ring-indigo-100 transition-shadow">
                                <input
                                    className="w-full text-xs p-1 bg-transparent outline-none border-b border-slate-200 mb-1 text-slate-600 placeholder:text-slate-400"
                                    placeholder="🔍 Buscar cliente..."
                                    value={clientFilter}
                                    onChange={e => setClientFilter(e.target.value)}
                                />
                                <select
                                    className="w-full bg-transparent text-sm outline-none font-medium text-slate-800"
                                    value={clientId}
                                    onChange={e => setClientId(e.target.value)}
                                >
                                    <option value="">-- Cliente Genérico --</option>
                                    {filteredCustomers.map(c => (
                                        <option key={c.CodCliente} value={c.CodCliente}>
                                            {c.Nombre || c.NombreFantasia} (ID: {c.CodCliente})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Busca arriba para filtrar la lista.</p>
                        </div>

                        <div className="w-24">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Cantidad</label>
                            <input
                                type="number"
                                className="w-full border border-slate-300 rounded p-2 font-mono text-center focus:ring-2 focus:ring-indigo-100 outline-none"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Condiciones / Perfiles Aplicados
                        </label>
                        <div className="border rounded-lg p-3 bg-slate-50 max-h-60 overflow-y-auto space-y-2">
                            {profiles.map(p => {
                                const isBase = baseProfileIds.includes(p.ID);
                                const isChecked = isBase || extraProfiles.includes(p.ID);

                                return (
                                    <label
                                        key={p.ID}
                                        className={`flex items-center gap-3 p-2 rounded border transition-colors ${isBase
                                            ? 'bg-blue-50 border-blue-200 cursor-not-allowed'
                                            : isChecked
                                                ? 'bg-indigo-50 border-indigo-200 cursor-pointer'
                                                : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={activeProfiles.includes(p.ID)}
                                            onChange={() => toggleProfile(p.ID)}
                                            className={`rounded w-4 h-4 ${isBase ? 'text-blue-500' : 'text-indigo-600 focus:ring-indigo-500'}`}
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-sm font-bold ${isBase ? 'text-blue-800' : 'text-slate-700'}`}>
                                                    {p.Nombre}
                                                </span>
                                                {isBase && (
                                                    <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-1.5 rounded border border-blue-200 flex items-center gap-1">
                                                        <i className="fa-solid fa-lock text-[8px]"></i>
                                                        {p.EsGlobal ? 'Global' : 'Cliente'}
                                                    </span>
                                                )}
                                            </div>
                                            {p.Descripcion && <div className="text-xs opacity-70 mt-0.5">{p.Descripcion}</div>}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-2">
                            <i className="fa-solid fa-lightbulb text-yellow-500"></i>
                            <span>
                                Usa los perfiles marcados en azul (🔒) para ver lo que el cliente ya tiene. Marca otros (como <b>Tinta</b> o <b>Urgencias</b>) para simular.
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={handleCalculate}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors flex justify-center items-center gap-2"
                    >
                        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-calculator"></i>}
                        Calcular Precio
                    </button>
                </div>

                {/* RESULTADOS */}
                <div className="bg-slate-50 border rounded-lg p-4 h-full relative">
                    {!result ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <i className="fa-solid fa-receipt text-4xl mb-2 opacity-50"></i>
                            <p>Ingresa datos para ver el desglose</p>
                        </div>
                    ) : (
                        <div className="animate-fade-in-up">
                            {/* Lógica de Cálculo Visual */}
                            {(() => {
                                let base = 0;
                                let discounts = 0;
                                let activeSurcharges = 0;

                                // Filtrar breakdown basado en perfiles activos en UI
                                const filteredBreakdown = result.breakdown.filter(item => {
                                    if (!item.profileId) return true; // Reglas sin perfil (AdHoc o Base original) pasan
                                    return activeProfiles.includes(item.profileId);
                                });

                                // Primera pasada: Base y Descuentos
                                filteredBreakdown.forEach((item) => {
                                    if (item.tipo === 'BASE' || item.tipo === 'OVERRIDE') base = item.valor;
                                    if (item.tipo === 'DISCOUNT') discounts += Math.abs(item.valor);
                                });

                                const netPrice = base - discounts;

                                // Segunda pasada: Recargos Activos
                                filteredBreakdown.forEach((item, idx) => {
                                    if (item.tipo === 'SURCHARGE' && !ignoredSurcharges.includes(idx)) {
                                        activeSurcharges += item.valor;
                                    }
                                });

                                const finalUnit = Math.max(0, netPrice + activeSurcharges);
                                const finalTotal = finalUnit * result.cantidad;

                                return (
                                    <>
                                        <div className="flex justify-between items-end border-b pb-3 mb-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">{result.codArticulo}</h3>
                                                <p className="text-sm text-slate-500">{result.cantidad} unidades</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Precio Unitario</p>
                                                <p className="text-3xl font-bold text-indigo-700">
                                                    ${finalUnit.toFixed(2)}
                                                    <span className="text-xs text-slate-400 ml-1 font-normal">{result.moneda}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Desglose */}
                                        <div className="space-y-2 text-sm">
                                            {/* 1. Base y Descuentos */}
                                            {filteredBreakdown.map((item, idx) => {
                                                if (item.tipo === 'SURCHARGE' || item.tipo === 'INFO') return null;
                                                return (
                                                    <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            {item.tipo === 'BASE' && <span className="w-2 h-2 rounded-full bg-slate-400"></span>}
                                                            {item.tipo === 'DISCOUNT' && <i className="fa-solid fa-minus text-green-500 text-xs"></i>}
                                                            {item.tipo === 'OVERRIDE' && <i className="fa-solid fa-pen text-purple-500 text-xs"></i>}
                                                            <span className={`${item.tipo === 'BASE' ? 'font-bold' : ''} text-slate-700`}>{item.desc}</span>
                                                        </div>
                                                        <span className={`font-mono ${item.valor < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                                            {item.valor > 0 && item.tipo !== 'BASE' ? '+' : ''}{item.valor.toFixed(2)}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            {/* Subtotal Neto (Nuevo) */}
                                            <div className="flex justify-between items-center py-2 border-t border-b border-indigo-100 bg-indigo-50/50 font-bold text-indigo-900 rounded px-2 -mx-2">
                                                <span>Precio Neto (sin recargos)</span>
                                                <span>${netPrice.toFixed(2)}</span>
                                            </div>

                                            {/* 2. Recargos (Simulables) */}
                                            {filteredBreakdown.map((item, idx) => {
                                                if (item.tipo !== 'SURCHARGE') return null;
                                                const isIgnored = ignoredSurcharges.includes(idx);
                                                return (
                                                    <div key={idx} className={`flex justify-between items-center py-1 border-b border-dashed border-slate-200 transition-opacity ${isIgnored ? 'opacity-50' : 'opacity-100'}`}>
                                                        <label className="flex items-center gap-2 cursor-pointer select-none hover:text-amber-600">
                                                            <input
                                                                type="checkbox"
                                                                checked={!isIgnored}
                                                                onChange={() => setIgnoredSurcharges(prev => isIgnored ? prev.filter(i => i !== idx) : [...prev, idx])}
                                                                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                                            />
                                                            <span className={`text-slate-700 ${isIgnored ? 'line-through decoration-slate-400' : ''}`}>
                                                                {item.desc}
                                                            </span>
                                                        </label>
                                                        <span className={`font-mono ${isIgnored ? 'line-through text-slate-400' : 'text-amber-600'}`}>
                                                            +{item.valor.toFixed(2)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-300 flex justify-between items-center font-bold text-lg">
                                            <span>Total Final</span>
                                            <span>${finalTotal.toFixed(2)}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* DEBUG SECTION */}
            <div className="mt-8 pt-4 border-t border-slate-200">
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                    <i className={`fa-solid fa-bug ${showDebug ? 'text-indigo-500' : ''}`}></i>
                    {showDebug ? 'Ocultar Info Técnica' : 'Ver Info Técnica (Debug)'}
                </button>

                {showDebug && result && result._debug && (
                    <div className="mt-2 p-3 bg-slate-900 text-green-400 font-mono text-xs rounded overflow-x-auto">
                        <pre>{JSON.stringify(result._debug, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceCalculatorTest;
