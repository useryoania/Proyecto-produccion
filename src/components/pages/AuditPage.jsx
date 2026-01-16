import React, { useState, useEffect } from 'react';
import { auditService } from '../../services/api';

const AuditPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [filterAction, setFilterAction] = useState('');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await auditService.getAll();
            setLogs(data);
        } catch (error) {
            console.error("Error loading audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (log.Usuario?.toLowerCase() || '').includes(term) ||
            (log.Accion?.toLowerCase() || '').includes(term) ||
            (log.Detalles?.toLowerCase() || '').includes(term);

        const matchesUser = filterUser ? log.Usuario === filterUser : true;
        const matchesAction = filterAction ? log.Accion === filterAction : true;

        let matchesDate = true;
        if (startDate || endDate) {
            const logDate = new Date(log.FechaAccion);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0); // Start of day
                if (logDate < start) matchesDate = false;
            }
            if (endDate && matchesDate) { // Check only if still matching
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // End of day
                if (logDate > end) matchesDate = false;
            }
        }

        return matchesSearch && matchesUser && matchesAction && matchesDate;
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto">

                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 flex items-center justify-center bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <i className="fa-solid fa-list-check text-2xl"></i>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Auditoría del Sistema</h1>
                            <p className="text-slate-400 text-sm mt-1 font-medium italic">Historial de acciones y eventos</p>
                        </div>
                    </div>

                </header>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Buscar</label>
                        <div className="relative">
                            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input
                                type="text"
                                placeholder="Buscar en detalles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="md:w-48 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Usuario</label>
                        <select
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-slate-700 text-sm cursor-pointer"
                        >
                            <option value="">Todos los Usuarios</option>
                            {[...new Set(logs.map(l => l.Usuario))].filter(Boolean).sort().map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:w-48 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Acción</label>
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-slate-700 text-sm cursor-pointer"
                        >
                            <option value="">Todas las Acciones</option>
                            {[...new Set(logs.map(l => l.Accion))].filter(Boolean).sort().map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:w-36 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-slate-700 text-sm cursor-pointer"
                        />
                    </div>

                    <div className="md:w-36 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-slate-700 text-sm cursor-pointer"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Fecha/Hora</th>
                                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Acción</th>
                                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">Detalles</th>
                                    <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-widest">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">
                                            <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Cargando registros...
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">
                                            No se encontraron registros
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.AccionID} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-5 text-sm font-mono text-slate-500 whitespace-nowrap">
                                                {new Date(log.FechaAccion).toLocaleString()}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                                                        {(log.Usuario || '?').substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-700">{log.Nombre || log.Usuario}</div>
                                                        {log.Nombre && <div className="text-[10px] text-slate-400 text-mono">@{log.Usuario}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${log.Accion === 'LOGIN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    log.Accion === 'LOGOUT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                    }`}>
                                                    {log.Accion}
                                                </span>
                                            </td>
                                            <td className="p-5 text-sm text-slate-600 font-medium">{log.Detalles}</td>
                                            <td className="p-5 text-sm font-mono text-slate-400">{log.IPAddress}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AuditPage;
