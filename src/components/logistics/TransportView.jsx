import React, { useState, useEffect } from 'react';
import { logisticsService } from '../../services/api';
import { toast } from 'sonner';

const TransportView = () => {
    const [transports, setTransports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await logisticsService.getActiveTransports();
            setTransports(data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar transportes');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async (transport) => {
        try {
            // Fetch full details
            const details = await logisticsService.getRemitoByCode(transport.CodigoRemito);

            // Construct HTML
            const html = `
                <html>
                <head>
                    <title>Remito ${details.CodigoRemito}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        h1 { border-bottom: 2px solid #000; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .footer { margin-top: 40px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>REMITO DE SALIDA</h1>
                    <p><strong>Código:</strong> ${details.CodigoRemito}</p>
                    <p><strong>Fecha Salida:</strong> ${new Date(details.FechaSalida || details.FechaCreacion).toLocaleString()}</p>
                    <p><strong>Origen:</strong> ${details.AreaOrigenID}</p>
                    <p><strong>Destino:</strong> ${details.AreaDestinoID}</p>
                    <p><strong>Transportista:</strong> ${transport.Observaciones}</p>
                    
                    <h3>Detalle de Bultos</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Código Bulto</th>
                                <th>Descripción</th>
                                <th>Orden</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${details.items.map(i => `
                                <tr>
                                    <td>${i.CodigoEtiqueta}</td>
                                    <td>${i.Descripcion || ''}</td>
                                    <td>${i.OrdenID || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>Firma Transportista: _______________________</p>
                        <p>Aclaración: _____________________________</p>
                    </div>
                    <script>window.print();</script>
                </body>
                </html>
             `;

            const win = window.open('', '_blank');
            win.document.write(html);
            win.document.close();

        } catch (err) {
            console.error(err);
            toast.error("Error al generar remito");
        }
    };

    const [filterStatus, setFilterStatus] = useState('ACTIVE'); // 'ACTIVE' | 'ALL'

    const filtered = transports.filter(t => {
        const matchesSearch = (t.CodigoRemito || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.Observaciones || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterStatus === 'ACTIVE') {
            return ['EN_TRANSITO', 'EN_TRANSITO_PARCIAL', 'ESPERANDO_RETIRO'].includes(t.Estado);
        }
        return true;
    });

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Transporte en Curso</h2>
                    <p className="text-slate-500 text-sm">Mercadería en poder de transportistas</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-bold">
                        <button
                            onClick={() => setFilterStatus('ACTIVE')}
                            className={`px-3 py-1 rounded transition-all ${filterStatus === 'ACTIVE' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            En Viaje
                        </button>
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className={`px-3 py-1 rounded transition-all ${filterStatus === 'ALL' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Todos
                        </button>
                    </div>
                    <button onClick={loadData} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 relative max-w-sm">
                <i className="fa-solid fa-search absolute left-3 top-3 text-slate-400"></i>
                <input
                    type="text"
                    placeholder="Buscar por remito, chofer..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Cargando...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <i className="fa-solid fa-road text-4xl text-slate-300 mb-3"></i>
                        <p className="text-slate-500">No hay vehículos registrados con este filtro.</p>
                    </div>
                ) : (
                    filtered.map(t => (
                        <div key={t.EnvioID} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center hover:shadow-md transition-shadow 
                            ${t.Estado.includes('RECIBIDO') ? 'border-slate-200 opacity-75' : 'border-indigo-100'}`}>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-lg text-slate-800 bg-indigo-50 px-2 rounded border border-indigo-100">{t.CodigoRemito}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase
                                        ${t.Estado === 'ESPERANDO_RETIRO' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                            t.Estado.includes('RECIBIDO') ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        {t.Estado.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-600 mt-2">
                                    <i className="fa-solid fa-user-tag text-slate-400 mr-2"></i>
                                    {/* Mostrar solo la parte del transportista si es muy larga la obs */}
                                    <span className="font-medium text-slate-800">{t.Observaciones}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    <i className="fa-solid fa-clock mr-1"></i>
                                    Salida: {new Date(t.Fecha).toLocaleString()} | {t.TotalBultos} Bultos
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                                <div className="text-2xl font-black text-slate-200">
                                    <i className="fa-solid fa-truck-fast"></i>
                                </div>
                                <button
                                    onClick={() => handlePrint(t)}
                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-bold transition-colors flex items-center gap-1"
                                >
                                    <i className="fa-solid fa-print"></i>
                                    Reimprimir
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TransportView;
