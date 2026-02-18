import React, { useState, useEffect } from 'react';
import { rollsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import RollDetailsModal from '../modals/RollDetailsModal';

import { useLocation } from 'react-router-dom';
const RollHistory = () => {
    const { user } = useAuth();
    const location = useLocation();

    // Prioridad: 1. Filtro por navegación (state), 2. Área del usuario (si no es admin)
    const [areaFilter, setAreaFilter] = useState(location.state?.areaFilter || '');

    useEffect(() => {
        if (user) {
            // Si NO es admin, forzamos su área
            if (user.rol !== 'ADMIN') {
                const userArea = user.areaKey || user.area || '';
                // Solo seteamos si es diferente para evitar ciclos
                if (userArea && areaFilter !== userArea) {
                    setAreaFilter(userArea);
                }
            }
        }
    }, [user]);

    const [searchTerm, setSearchTerm] = useState('');
    const [rolls, setRolls] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inspectingRoll, setInspectingRoll] = useState(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Usamos el estado local areaFilter que ya tiene la lógica de usuario
            const data = await rollsService.getHistory(searchTerm, areaFilter);
            setRolls(data);
        } catch (error) {
            console.error("Error fetching history:", error);
            // toast.error("Error cargando historial"); // Idealmente usar toast
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch on mount and when areaFilter changes
    useEffect(() => {
        if (user) { // Solo buscar cuando tengamos usuario cargado
            fetchHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [areaFilter, user]); // Refetch si cambia el área o el usuario se termina de cargar

    const handleSearch = (e) => {
        e.preventDefault();
        fetchHistory();
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 p-6 overflow-hidden">
            <h1 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-slate-400"></i>
                Historial de Lotes {areaFilter ? <span className="text-blue-600">({areaFilter})</span> : ''}
            </h1>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mb-6">
                <div className="relative flex-1">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por ID, Nombre..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                    Buscar
                </button>
            </form>

            {/* Table */}
            <div className="flex-1 bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-bold text-slate-600">ID</th>
                                <th className="px-6 py-3 font-bold text-slate-600">Nombre</th>
                                <th className="px-6 py-3 font-bold text-slate-600">Estado</th>
                                <th className="px-6 py-3 font-bold text-slate-600">Órdenes</th>
                                <th className="px-6 py-3 font-bold text-slate-600">Máquina (Final)</th>
                                <th className="px-6 py-3 font-bold text-slate-600">Fecha Creación</th>
                                <th className="px-6 py-3 font-bold text-slate-600 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rolls.map(roll => (
                                <tr key={roll.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 font-mono text-slate-500">{roll.id}</td>
                                    <td className="px-6 py-3 font-bold text-slate-700">{roll.name}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                                            ${roll.status === 'Finalizado' ? 'bg-slate-200 text-slate-600' :
                                                roll.status === 'Cerrado' ? 'bg-slate-200 text-slate-600' :
                                                    'bg-blue-100 text-blue-600'
                                            }`}>
                                            {roll.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">{roll.orderCount}</td>
                                    <td className="px-6 py-3 text-slate-600">{roll.machineName || '-'}</td>
                                    <td className="px-6 py-3 text-slate-500">
                                        {new Date(roll.FechaCreacion).toLocaleDateString()} {new Date(roll.FechaCreacion).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button
                                            onClick={() => setInspectingRoll({ id: roll.id, name: roll.name, status: roll.status })} // Basic info for loading modal
                                            className="text-blue-600 hover:text-blue-800 font-bold text-xs"
                                        >
                                            <i className="fa-solid fa-eye mr-1"></i> Ver Detalles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rolls.length === 0 && !loading && (
                                <tr><td colSpan="7" className="text-center py-10 text-slate-400">No se encontraron lotes.</td></tr>
                            )}
                            {loading && (
                                <tr><td colSpan="7" className="text-center py-10"><i className="fa-solid fa-spinner fa-spin text-2xl text-blue-500"></i></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {inspectingRoll && (
                <RollDetailsModal
                    roll={inspectingRoll}
                    onClose={() => setInspectingRoll(null)}
                    onUpdate={() => { }} // No actualizamos el tablero desde aquí
                />
            )}
        </div>
    );
};

export default RollHistory;
