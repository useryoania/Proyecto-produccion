import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/modules/inventoryService';
import { Button } from '../ui/Button';
import { BarChart, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';

const InventoryReports = ({ defaultArea }) => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filtros
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [areaId, setAreaId] = useState(defaultArea || '');

    // Inicializar fechas (Ultimos 30 dias)
    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
        setAreaId(defaultArea || '');
    }, [defaultArea]);

    useEffect(() => {
        if (startDate && endDate) {
            loadReport();
        }
    }, [startDate, endDate, areaId]);

    const loadReport = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getReport({ startDate, endDate, areaId: areaId === 'TODAS' ? '' : areaId });
            setStats(data);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando reporte");
        } finally {
            setLoading(false);
        }
    };

    // Cálculos Globales
    const totalConsumo = stats.reduce((acc, curr) => acc + (curr.ConsumoNeto || 0), 0);
    const totalFallas = stats.reduce((acc, curr) => acc + (curr.DesperdicioProduccion || 0), 0);
    const totalReimpresiones = stats.reduce((acc, curr) => acc + (curr.DesperdicioReimpresion || 0), 0);
    const totalRemanente = stats.reduce((acc, curr) => acc + (curr.DesperdicioCierre || 0), 0);

    const totalDesecho = totalFallas + totalRemanente + totalReimpresiones;
    const totalBruto = totalConsumo + totalDesecho;
    const eficienciaGlobal = totalBruto > 0 ? ((totalConsumo / totalBruto) * 100).toFixed(1) : '100.0';

    return (
        <div className="space-y-6">
            {/* FILTROS */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Desde</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="border rounded p-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Hasta</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="border rounded p-2 text-sm"
                    />
                </div>

                <div className="md:ml-auto flex gap-2">
                    <Button variant="secondary" onClick={loadReport} disabled={loading}>
                        <Filter className="w-4 h-4 mr-2" />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                    <div className="text-slate-500 text-sm font-medium">Consumo Productivo</div>
                    <div className="text-2xl font-bold text-slate-800">{totalConsumo.toFixed(0)} <span className="text-sm font-normal text-slate-400">m</span></div>
                    <div className="text-xs text-blue-600 mt-1">Material OK</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
                    <div className="text-slate-500 text-sm font-medium">Fallas (Impresión)</div>
                    <div className="text-2xl font-bold text-slate-800">{totalFallas.toFixed(0)} <span className="text-sm font-normal text-slate-400">m</span></div>
                    <div className="text-xs text-red-600 mt-1">Ordenes con 'F'</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                    <div className="text-slate-500 text-sm font-medium">Mermas (Material)</div>
                    <div className="text-2xl font-bold text-slate-800">{totalReimpresiones.toFixed(0)} <span className="text-sm font-normal text-slate-400">m</span></div>
                    <div className="text-xs text-purple-600 mt-1">Fallos / Cambios</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
                    <div className="text-slate-500 text-sm font-medium">Remanente (Cierre)</div>
                    <div className="text-2xl font-bold text-slate-800">{totalRemanente.toFixed(0)} <span className="text-sm font-normal text-slate-400">m</span></div>
                    <div className="text-xs text-orange-600 mt-1">Sobrantes declarados</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                    <div className="text-slate-500 text-sm font-medium">Eficiencia Global</div>
                    <div className="text-2xl font-bold text-slate-800">{eficienciaGlobal}%</div>
                    <div className="text-xs text-green-600 mt-1">Aprovechamiento</div>
                </div>
            </div>

            {/* TABLA DETALLADA */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-blue-600" />
                        Detalle por Insumo
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                            <tr>
                                <th className="p-3 border-b">Insumo</th>
                                <th className="p-3 border-b text-center">Bobinas Cerr.</th>
                                <th className="p-3 border-b text-right">Consumo (m)</th>
                                <th className="p-3 border-b text-right text-red-600 bg-red-50">Fallas (m)</th>
                                <th className="p-3 border-b text-right text-purple-600 bg-purple-50">Merma Mat. (m)</th>
                                <th className="p-3 border-b text-right text-orange-600 bg-orange-50">Remanente</th>
                                <th className="p-3 border-b text-right font-bold">Total Desp.</th>
                                <th className="p-3 border-b text-right">% Merma</th>
                                <th className="p-3 border-b w-1/4">Distribución</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-400 italic">
                                        No hay datos registrados en este periodo.
                                    </td>
                                </tr>
                            ) : (
                                stats.map((item, idx) => {
                                    // Calcular porcentajes relativos para la barra
                                    const total = (item.ConsumoNeto || 0) + (item.DesperdicioTotal || 0);
                                    const pOK = total > 0 ? (item.ConsumoNeto / total) * 100 : 0;
                                    const pFail = total > 0 ? (item.DesperdicioProduccion / total) * 100 : 0;
                                    const pReimp = total > 0 ? (item.DesperdicioReimpresion / total) * 100 : 0;
                                    const pRem = total > 0 ? (item.DesperdicioCierre / total) * 100 : 0;

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-700">{item.Insumo}</td>
                                            <td className="p-3 text-center">{item.BobinasCerradas}</td>
                                            <td className="p-3 text-right font-medium">{item.ConsumoNeto.toFixed(1)}</td>
                                            <td className="p-3 text-right text-red-600 bg-red-50 font-medium">{item.DesperdicioProduccion.toFixed(1)}</td>
                                            <td className="p-3 text-right text-purple-600 bg-purple-50 font-medium">{item.DesperdicioReimpresion.toFixed(1)}</td>
                                            <td className="p-3 text-right text-orange-600 bg-orange-50 font-medium">{item.DesperdicioCierre.toFixed(1)}</td>
                                            <td className="p-3 text-right font-bold text-slate-600">{item.DesperdicioTotal.toFixed(1)}</td>
                                            <td className="p-3 text-right font-bold text-slate-800">{item.PorcentajeDesperdicio}%</td>
                                            <td className="p-3 align-middle">
                                                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                                    <div
                                                        className="h-full bg-blue-500 hover:bg-blue-600 transition-colors"
                                                        style={{ width: `${pOK}%` }}
                                                        title={`Productivo: ${pOK.toFixed(1)}%`}
                                                    ></div>
                                                    <div
                                                        className="h-full bg-red-500 hover:bg-red-600 transition-colors"
                                                        style={{ width: `${pFail}%` }}
                                                        title={`Fallas: ${pFail.toFixed(1)}%`}
                                                    ></div>
                                                    <div
                                                        className="h-full bg-purple-500 hover:bg-purple-600 transition-colors"
                                                        style={{ width: `${pReimp}%` }}
                                                        title={`Mermas Material: ${pReimp.toFixed(1)}%`}
                                                    ></div>
                                                    <div
                                                        className="h-full bg-orange-400 hover:bg-orange-500 transition-colors"
                                                        style={{ width: `${pRem}%` }}
                                                        title={`Remanente: ${pRem.toFixed(1)}%`}
                                                    ></div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryReports;
