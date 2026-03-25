import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/apiClient';
import { Search, DollarSign, Filter, Loader2, Tag, Package } from 'lucide-react';

export const PricesView = () => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedFamily, setSelectedFamily] = useState('Todas');

    useEffect(() => {
        apiClient.get('/precios-publicos')
            .then(data => setPrices(data))
            .catch(err => console.error('Error cargando precios:', err))
            .finally(() => setLoading(false));
    }, []);

    const families = useMemo(() => {
        const set = new Set(prices.map(p => p.Familia).filter(Boolean));
        return ['Todas', ...Array.from(set).sort()];
    }, [prices]);

    const filtered = useMemo(() => {
        return prices.filter(p => {
            const matchFamily = selectedFamily === 'Todas' || p.Familia === selectedFamily;
            const matchSearch = !search ||
                (p.Producto || '').toLowerCase().includes(search.toLowerCase()) ||
                (p.Descripcion || '').toLowerCase().includes(search.toLowerCase()) ||
                (p.Familia || '').toLowerCase().includes(search.toLowerCase());
            return matchFamily && matchSearch;
        });
    }, [prices, selectedFamily, search]);

    const grouped = useMemo(() => {
        const map = {};
        filtered.forEach(p => {
            const key = p.Familia || 'Sin Familia';
            if (!map[key]) map[key] = [];
            map[key].push(p);
        });
        return map;
    }, [filtered]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <DollarSign size={48} strokeWidth={1} className="text-brand-gold" />
                <div>
                    <h2 className="text-lg font-bold text-zinc-300 uppercase">Lista de <span className="text-custom-cyan">Precios</span></h2>
                    <p className="text-zinc-500 uppercase text-xs">Consultá nuestros precios actualizados.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-brand-dark text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan outline-none text-sm transition-all"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <select
                        value={selectedFamily}
                        onChange={e => setSelectedFamily(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-zinc-700 bg-brand-dark text-zinc-100 focus:ring-2 focus:ring-brand-cyan/30 focus:border-brand-cyan outline-none text-sm appearance-none cursor-pointer md:min-w-[180px] md:w-auto"
                    >
                        {families.map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Results count */}
            <p className="text-xs text-zinc-500 font-medium uppercase">
                {filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>

            {/* Price Cards by Family */}
            {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                    <Package size={48} className="mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">No se encontraron productos</p>
                    <p className="text-sm">Probá con otro término de búsqueda</p>
                </div>
            ) : (
                Object.entries(grouped).map(([family, items]) => (
                    <div key={family} className="space-y-3">
                        <div className="flex items-center gap-2 text-zinc-700">
                            <Tag size={16} className="text-blue-500" />
                            <h2 className="font-bold text-lg uppercase">{family}</h2>
                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{items.length}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="bg-brand-dark rounded-xl border border-zinc-700 p-4 hover:border-brand-cyan hover:shadow-[0_0_15px_-3px_rgba(0,174,239,0.25)] transition-all duration-300 group cursor-default opacity-0 animate-fade-in"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-zinc-100 text-sm truncate group-hover:text-brand-cyan transition-colors uppercase">
                                                {item.Producto}
                                            </h3>
                                            {item.Descripcion && (
                                                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 uppercase">{item.Descripcion}</p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-bold text-brand-gold">
                                                {(item.Moneda || '').toUpperCase().includes('DOLAR') || (item.Moneda || '').toUpperCase().includes('USD') ? 'US$' : '$'}
                                                {item.Precio?.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.Moneda}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
