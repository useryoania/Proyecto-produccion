import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'sonner';
import { Search, Calculator, Filter, Layers, ArrowDownUp, RefreshCw, AlertCircle, FileSpreadsheet } from 'lucide-react';

const CustomerPriceCatalog = ({ customers = [], onSearch }) => {
    const [products, setProducts] = useState([]);
    const [clientId, setClientId] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Filtros
    const [selectedGroup, setSelectedGroup] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Precios calculados
    const [calculatedPrices, setCalculatedPrices] = useState({});
    const [calculatingInProgress, setCalculatingInProgress] = useState(false);

    useEffect(() => {
        loadBaseProducts();
    }, []);

    // Efecto para debounce de búsqueda en servidor (clientes)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (onSearch) {
                onSearch(clientFilter);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [clientFilter, onSearch]);

    // Cuando cambia el cliente o grupo, borramos caché de cálculos y calculamos los del grupo actual
    useEffect(() => {
        setCalculatedPrices({});
        if (clientId && selectedGroup) {
            calculateGroupPrices();
        }
    }, [clientId, selectedGroup]);

    const loadBaseProducts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/prices/base');
            // Removemos 'TOTAL' de la visualización de catálogo
            const validProducts = (res.data || []).filter(p => p.CodArticulo !== 'TOTAL');
            setProducts(validProducts);
        } catch (e) {
            console.error("Error cargando productos base", e);
            toast.error("Error al cargar maestro de artículos");
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c => {
        if (!clientFilter) return true;
        const search = clientFilter.toLowerCase();
        return (c.Nombre || '').toLowerCase().includes(search) ||
            (c.NombreFantasia || '').toLowerCase().includes(search) ||
            String(c.CodCliente).includes(search);
    }).slice(0, 50);

    const groups = useMemo(() => {
        const uniqueGroups = [...new Set(products.map(p => p.GrupoNombre || p.Grupo).filter(Boolean))];
        return uniqueGroups.sort();
    }, [products]);

    // Productos a mostrar en base a familia y búsqueda
    const displayedProducts = useMemo(() => {
        return products.filter(p => {
            const matchesGroup = !selectedGroup || (p.GrupoNombre || p.Grupo) === selectedGroup;
            const seqMatch = !searchQuery || 
                p.CodArticulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (p.Descripcion || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesGroup && seqMatch;
        });
    }, [products, selectedGroup, searchQuery]);

    const calculateGroupPrices = async () => {
        if (!clientId || !selectedGroup) return;
        
        const productsToCalculate = displayedProducts;
        if (productsToCalculate.length === 0) return;

        setCalculatingInProgress(true);
        toast.loading(`Calculando precios para ${selectedGroup}...`, { id: 'calc-group' });

        const batchSize = 10;
        let newCalculated = { ...calculatedPrices };

        try {
            for (let i = 0; i < productsToCalculate.length; i += batchSize) {
                const batch = productsToCalculate.slice(i, i + batchSize);
                
                const promises = batch.map(p => 
                    api.post('/prices/calculate', {
                        codArticulo: p.CodArticulo,
                        cantidad: 1,
                        clienteId: clientId,
                        extraProfileIds: [],
                        variables: {},
                        targetCurrency: 'USD'
                    }).then(res => ({ cod: p.CodArticulo, result: res.data }))
                      .catch(err => ({ cod: p.CodArticulo, error: true }))
                );

                const results = await Promise.all(promises);
                
                results.forEach(r => {
                    if (!r.error) {
                        newCalculated[r.cod] = r.result;
                    }
                });

                // Actualización parcial para que la UI no se congele totalmente
                setCalculatedPrices({ ...newCalculated });
            }
            toast.success(`Cálculo completado para ${selectedGroup}`, { id: 'calc-group' });
        } catch (e) {
            console.error("Error calculando lote", e);
            toast.error("Ocurrió un error en el cálculo por lotes", { id: 'calc-group' });
        } finally {
            setCalculatingInProgress(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50 animate-fade-in-up">
            {/* Header y Filtros */}
            <div className="bg-white border-b border-slate-200 p-6 shadow-sm z-10">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                            <Layers className="w-7 h-7 text-indigo-500" />
                            Matriz de Catálogo por Cliente
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Explora rápidamente todos los precios finales y reglas que aplican a un cliente específico.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Selector Cliente */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block flex items-center gap-1.5"><Search className="w-3 h-3" /> Selección de Cliente</label>
                        <input
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 mb-2 transition-all shadow-sm"
                            placeholder="Buscar nombre o ID de cliente..."
                            value={clientFilter}
                            onChange={e => setClientFilter(e.target.value)}
                        />
                        <select
                            className="w-full bg-white border border-slate-200 text-sm outline-none font-bold text-slate-700 p-2 rounded-lg focus:border-indigo-400 shadow-sm transition-all"
                            value={clientId}
                            onChange={e => setClientId(e.target.value)}
                        >
                            <option value="">-- Elige un Cliente --</option>
                            {filteredCustomers.map(c => (
                                <option key={c.CodCliente} value={c.CodCliente}>
                                    {c.Nombre || c.NombreFantasia} (ID: {c.CodCliente})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selector de Familia/Grupo */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block flex items-center gap-1.5"><Filter className="w-3 h-3" /> Familia / Grupo (Requerido)</label>
                        <select
                            className="w-full bg-white border border-slate-200 text-sm outline-none font-bold text-slate-700 p-2.5 rounded-lg focus:border-indigo-400 shadow-sm transition-all"
                            value={selectedGroup}
                            onChange={e => setSelectedGroup(e.target.value)}
                            disabled={!clientId}
                        >
                            <option value="">-- Selecciona una categoría --</option>
                            {groups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                        <p className="text-[9px] text-amber-600 font-bold uppercase mt-2 opacity-80">* Para optimizar velocidad, selecciona una familia.</p>
                    </div>

                    {/* Buscador de Articulo Libre */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Búsqueda Rápida</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                className="w-full bg-white text-xs p-2.5 pl-9 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-mono shadow-sm"
                                placeholder="Filtrar código EJ: 'DF0123'..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                {!clientId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <Search className="w-16 h-16 mb-4" />
                        <h3 className="text-xl font-bold">Selecciona un Cliente</h3>
                        <p>Busca arriba un cliente para ver su catálogo inteligente de precios.</p>
                    </div>
                ) : !selectedGroup ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-indigo-300 opacity-60">
                        <Layers className="w-16 h-16 mb-4" />
                        <h3 className="text-xl font-bold">Selecciona una Familia</h3>
                        <p>Selecciona un grupo a explorar (EJ: Tazas, DTF Textil) para desplegar sus componentes.</p>
                    </div>
                ) : (
                    <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
                        {loading || calculatingInProgress ? (
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100 overflow-hidden">
                                <div className="h-full bg-indigo-500 w-1/3 animate-fast-pulse origin-left translate-x-full"></div>
                            </div>
                        ) : null}
                        
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                <span className="font-bold text-slate-700">{selectedGroup}</span>
                                <span className="text-[10px] bg-slate-200 text-slate-500 rounded-full px-2 py-0.5 font-black">{displayedProducts.length} Items</span>
                            </div>
                            <button 
                                onClick={calculateGroupPrices} 
                                disabled={calculatingInProgress}
                                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${calculatingInProgress ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white'}`}
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${calculatingInProgress && 'animate-spin'}`} />
                                Forzar Recálculo
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/90 backdrop-blur-md shadow-sm z-10 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 w-1/4">Artículo</th>
                                        <th className="p-4 w-1/4">Descripción</th>
                                        <th className="p-4 text-center">Base Orig. (USD)</th>
                                        <th className="p-4 text-center">Precio Cliente (USD)</th>
                                        <th className="p-4 w-1/3">Análisis de Reglas Aplicadas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedProducts.map(p => {
                                        const calculation = calculatedPrices[p.CodArticulo];
                                        const isCalculated = !!calculation;
                                        
                                        // Extraer total final y base.
                                        // El valor de cálculo viene de calculation.breakdown (ej: BASE, DISCOUNT, OVERRIDE, SURCHARGE)
                                        let finalValue = 0;
                                        let originalBase = p.Precio || 0; 
                                        let appliedRules = [];
                                        
                                        if (isCalculated) {
                                            let net = 0;
                                            let surcharges = 0;
                                            calculation.breakdown.forEach(b => {
                                                if (b.tipo === 'BASE' || b.tipo === 'OVERRIDE') {
                                                    net = b.valor;
                                                    if (b.tipo === 'BASE') originalBase = b.valor; // En caso q el calc detecte otra
                                                }
                                                if (b.tipo === 'DISCOUNT') net -= Math.abs(b.valor);
                                                if (b.tipo === 'SURCHARGE') surcharges += b.valor;
                                                
                                                if (b.tipo !== 'BASE' && b.tipo !== 'INFO') {
                                                    appliedRules.push(b);
                                                }
                                            });
                                            finalValue = Math.max(0, net + surcharges);
                                        }

                                        const hasChanged = originalBase !== finalValue && isCalculated;

                                        return (
                                            <tr key={p.CodArticulo} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                                <td className="p-4 font-mono text-sm font-bold text-indigo-600">{p.CodArticulo}</td>
                                                <td className="p-4 text-xs font-medium text-slate-600 truncate max-w-[200px]" title={p.Descripcion}>{p.Descripcion}</td>
                                                <td className="p-4 text-center text-slate-400 font-mono text-xs">
                                                    ${Number(originalBase).toFixed(2)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isCalculated ? (
                                                        <span className={`text-sm font-black font-mono px-3 py-1.5 rounded-lg ${hasChanged ? (finalValue < originalBase ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' : 'text-rose-700 bg-rose-100 border border-rose-200') : 'text-slate-700 bg-slate-100'}`}>
                                                            ${finalValue.toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Esperando...</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {isCalculated && appliedRules.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {appliedRules.map((rule, idx) => (
                                                                <span key={idx} className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide flex items-center gap-1 ${
                                                                    rule.tipo === 'DISCOUNT' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                                    rule.tipo === 'OVERRIDE' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                                    'bg-amber-50 text-amber-600 border-amber-200'
                                                                }`}>
                                                                    {rule.tipo === 'DISCOUNT' ? <ArrowDownUp className="w-2 h-2" /> : ''}
                                                                    {rule.desc} ({rule.valor > 0 ? '+' : ''}{rule.valor.toFixed(2)})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : isCalculated ? (
                                                        <span className="text-[10px] text-slate-400 italic">Precio Normal de Catálogo</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 italic">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>

                            {displayedProducts.length === 0 && !loading && (
                                <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                                    <AlertCircle className="w-10 h-10 mb-2 opacity-30" />
                                    No se encontraron productos que coincidan con la búsqueda en esta sub-familia.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerPriceCatalog;
