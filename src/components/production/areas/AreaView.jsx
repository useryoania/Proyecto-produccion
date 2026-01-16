import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useQuery } from "@tanstack/react-query";

// Componentes de Vistas
import ProductionTable from "../../production/components/ProductionTable"; // Restored
// import OrderCard from "../../production/components/OrderCard"; // Grid components commented out
import OrderDetailModal from "../../production/components/OrderDetailModal";
import RollsKanban from "../../pages/RollsKanban";
import ProductionKanban from "../../pages/ProductionKanban";
import MeasurementView from "../../pages/MeasurementView";
import FilePrintControl from "../../pages/FilePrintControl";
import LogisticsView from "../../pages/LogisticsView";
import PlaneacionTrabajo from "../../pages/PlaneacionTrabajo";

// Modales y Sidebars
import NewOrderModal from "../../modals/NewOrderModal";
import ReportFailureModal from "../../modals/ReportFailureModal";
import StockRequestModal from "../../modals/StockRequestModal";
import LogisticsCartModal from "../../modals/LogisticsCartModal";
import RollAssignmentModal from "../../modals/RollAssignmentModal";
import RollSidebar from "../../layout/RollSidebar";
import MatrixSidebar from "../../layout/MatrixSidebar";

import { ordersService, rollsService } from '../../../services/api';
import { SOCKET_URL } from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';

// --- SUBCOMPONENT: MAGIC BUTTON ---
const MagicButton = ({ areaKey, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handleMagic = async () => {
        // Áreas que tienen el procedimiento implementado
        const supportedAreas = ['ECOUV', 'DTF'];

        if (!supportedAreas.includes(areaKey)) {
            alert("🚧 Proceso en construcción para esta área. \n\nLa lógica de armado mágico es diferente para cada sector.");
            return;
        }

        if (!window.confirm("🪄 ¿Ejecutar Armado Mágico?\n\nEsto agrupará TODAS las órdenes pendientes por Variante y Material, creando lotes individuales automáticamente.")) return;

        setLoading(true);
        try {
            const res = await rollsService.magicAssignment(areaKey);
            if (res.success) {
                alert(res.message); // "¡Mágia completada!..."
                if (onSuccess) onSuccess();
            } else {
                alert("Error: " + (res.message || "Desconocido"));
            }
        } catch (error) {
            console.error(error);
            alert("Error ejecutando magia: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleMagic}
            disabled={loading}
            className="h-9 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm bg-purple-600 text-white border border-purple-700 hover:bg-purple-700 hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Agrupar automáticamente por Variante > Material > Prioridad"
        >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
            <span className="hidden md:inline">Armado Mágico</span>
        </button>
    );
};

export default function AreaView({ areaKey, areaConfig, onSwitchTab }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // 1. NAVEGACIÓN INTELIGENTE (Keep as is)
    const basePath = useMemo(() => {
        const segments = location.pathname.split('/');
        const areaIdx = segments.findIndex(s => s.toLowerCase() === 'area');
        if (areaIdx !== -1 && segments[areaIdx + 1]) {
            return `/${segments[areaIdx]}/${segments[areaIdx + 1]}`;
        }
        return location.pathname;
    }, [location.pathname]);

    const isActive = (path) => {
        const currentPath = location.pathname.toLowerCase();
        if (path === '') {
            return currentPath === basePath.toLowerCase() || currentPath.endsWith('/tabla');
        }
        return currentPath.includes(path.toLowerCase());
    };

    const goTo = (subPath) => {
        if (!subPath || subPath === '') {
            navigate(basePath);
        } else {
            navigate(`${basePath}/${subPath}`);
        }
    };

    // 2. ESTADOS
    // Removed dbOrders and loadingOrders state, replaced by React Query
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [sidebarFilter, setSidebarFilter] = useState("ALL");
    const [sidebarMode, setSidebarMode] = useState("rolls");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [clientFilter, setClientFilter] = useState("");
    const [variantFilter, setVariantFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [priorityFilter, setPriorityFilter] = useState("ALL");

    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
    const [isStockOpen, setIsStockOpen] = useState(false);
    const [isFailureOpen, setIsFailureOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isRollModalOpen, setIsRollModalOpen] = useState(false);

    // 3. CARGA DE DATOS (React Query)
    const { data: dbOrders = [], isLoading: loadingOrders, refetch } = useQuery({
        queryKey: ['orders', areaKey],
        queryFn: async () => {
            if (!areaKey || areaKey.toLowerCase() === 'area') return [];
            console.log(`📡 API: Pidiendo datos para área [${areaKey}]`);
            let data = await ordersService.getByArea(areaKey, 'active');
            if (!data || data.length === 0) {
                // Retry with Uppercase if empty (preserve original logic)
                data = await ordersService.getByArea(areaKey.toUpperCase(), 'active');
            }
            return data || [];
        },
        enabled: !!areaKey && areaKey.toLowerCase() !== 'area',
        refetchInterval: 30000, // Polling every 30s as backup
    });

    // Socket.io: escuchar actualizaciones en tiempo real
    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('server:order_updated', (payload) => {
            console.log('🔔 Evento socket order_updated:', payload);
            refetch(); // refrescar al recibir notificación
        });
        return () => {
            socket.disconnect();
        };
    }, [refetch]);

    // 4. COMPUTED FILTERS (Dynamic based on data)
    const availablePriorities = useMemo(() => {
        const unique = new Set(dbOrders.map(o => o.priority || 'Normal'));
        const orderPreference = ['Normal', 'Urgente', 'Reposición', 'Falla'];
        return ['ALL', ...Array.from(unique).sort((a, b) => {
            const idxA = orderPreference.indexOf(a);
            const idxB = orderPreference.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        })];
    }, [dbOrders]);

    const availableStatuses = useMemo(() => {
        const unique = new Set(dbOrders.map(o => o.status || 'Pendiente'));
        // Standard Workflow Order
        const orderPreference = ['Pendiente', 'Produccion', 'En Lote', 'Imprimiendo', 'Control y Calidad', 'Pronto', 'Entregado', 'Finalizado', 'Cancelado'];
        return ['ALL', ...Array.from(unique).filter(Boolean).sort((a, b) => {
            const idxA = orderPreference.findIndex(p => p.toLowerCase() === a.toLowerCase());
            const idxB = orderPreference.findIndex(p => p.toLowerCase() === b.toLowerCase());
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        })];
    }, [dbOrders]);

    // 5. FILTRADO
    const filteredOrders = useMemo(() => {
        let result = dbOrders;
        if (sidebarFilter !== 'ALL') {
            let filterField = sidebarMode === 'rolls' ? 'rollId' : 'printer';
            if (areaKey === 'BORD' && sidebarMode === 'rolls') filterField = 'matrixStatus';
            if (sidebarFilter === 'Sin Asignar') result = result.filter(o => !o[filterField]);
            else result = result.filter(o => o[filterField] === sidebarFilter);
        }
        if (clientFilter) result = result.filter(o => o.client?.toLowerCase().includes(clientFilter.toLowerCase()));
        if (variantFilter !== 'ALL') result = result.filter(o => o.variant === variantFilter);
        if (statusFilter !== 'ALL') {
            // Exact match (case insensitive) now that filters are dynamic
            result = result.filter(o => (o.status || 'Pendiente').toLowerCase() === statusFilter.toLowerCase());
        }
        if (priorityFilter !== 'ALL') {
            // Exact match (case insensitive)
            result = result.filter(o => (o.priority || 'Normal').toLowerCase() === priorityFilter.toLowerCase());
        }
        return result;
    }, [dbOrders, sidebarFilter, sidebarMode, clientFilter, variantFilter, areaKey, statusFilter, priorityFilter]);

    const renderSidebar = () => {
        if (isActive('logistica')) return null; // No sidebar en Logística
        if (!isActive('') || !isSidebarOpen) return null;
        if (areaKey === 'BORD') {
            return <MatrixSidebar orders={dbOrders} currentFilter={sidebarFilter} onFilterChange={setSidebarFilter} onClose={() => setIsSidebarOpen(false)} />;
        }
        let sidebarData = sidebarMode === 'machines' ? dbOrders.map(o => ({ ...o, rollId: o.printer })) : dbOrders;
        return (
            <div className="flex flex-col h-full bg-white border-r border-slate-200">
                <div className="flex p-2 gap-2 bg-slate-50 border-b border-slate-200">
                    <button
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${sidebarMode === 'rolls' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                        onClick={() => setSidebarMode('rolls')}
                    >
                        Lotes
                    </button>
                    <button
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${sidebarMode === 'machines' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                        onClick={() => setSidebarMode('machines')}
                    >
                        Equipos
                    </button>
                </div>
                <RollSidebar orders={sidebarData} currentFilter={sidebarFilter} onFilterChange={setSidebarFilter} onClose={() => setIsSidebarOpen(false)} title={sidebarMode === 'rolls' ? 'LOTES' : 'EQUIPOS'} />
            </div>
        );
    };

    if (!areaConfig) return <div className="p-10 text-center text-slate-400">Cargando configuración...</div>;

    const btnBaseClass = "h-9 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm";
    const btnSecondaryClass = "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-blue-500 hover:bg-slate-50";
    const btnPrimaryClass = "bg-blue-50 border border-blue-200 text-blue-600";


    console.log("🔍 [AreaView] Render - Props:", { areaKey, areaConfigName: areaConfig?.name, isRollModalOpen });

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-800">
            <StockRequestModal isOpen={isStockOpen} onClose={() => setIsStockOpen(false)} areaName={areaConfig.name} areaCode={areaKey} />
            <NewOrderModal isOpen={isNewOrderOpen} onClose={() => { setIsNewOrderOpen(false); fetchOrders(); }} areaName={areaConfig.name} areaCode={areaKey} />
            <ReportFailureModal isOpen={isFailureOpen} onClose={() => setIsFailureOpen(false)} areaName={areaConfig.name} areaCode={areaKey} />
            <LogisticsCartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} areaName={areaConfig.name} areaCode={areaKey} onSuccess={() => fetchOrders()} />
            <RollAssignmentModal isOpen={isRollModalOpen} onClose={() => setIsRollModalOpen(false)} selectedIds={selectedIds} areaCode={areaKey} onSuccess={() => { setSelectedIds([]); fetchOrders(); }} />

            <header className="bg-white border-b border-slate-200 flex flex-col shrink-0 z-20 w-full shadow-sm">
                <div className="px-4 py-2 flex items-center justify-between gap-4 bg-white min-h-[56px]">

                    {/* LEFTSIDE: Navegación y Título */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button className="bg-slate-50 border border-slate-200 w-8 h-8 rounded-lg text-slate-500 flex items-center justify-center transition hover:bg-slate-100 hover:text-blue-500 hover:border-blue-200 shadow-sm" onClick={() => navigate('/')}>
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-lg font-black text-slate-800 leading-none whitespace-nowrap">{areaConfig.name}</h1>
                            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Producción</span>
                        </div>
                        <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    </div>

                    {/* CENTER: Tabs de Navegación */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        <button className={`${btnBaseClass} px-3 h-8 text-xs ${isActive('') ? btnPrimaryClass : btnSecondaryClass}`} onClick={() => goTo('')}><i className="fa-solid fa-table"></i> Planilla</button>
                        <button className={`${btnBaseClass} px-3 h-8 text-xs ${isActive('planeacion') ? btnPrimaryClass : btnSecondaryClass}`} onClick={() => goTo('planeacion')}><i className="fa-regular fa-calendar-check"></i> Planeación</button>
                        <button className={`${btnBaseClass} px-3 h-8 text-xs ${isActive('medicion') ? btnPrimaryClass : btnSecondaryClass}`} onClick={() => goTo('medicion')}><i className="fa-solid fa-ruler-combined"></i> Medición</button>
                        <button className={`${btnBaseClass} px-3 h-8 text-xs ${isActive('control') ? btnPrimaryClass : btnSecondaryClass}`} onClick={() => goTo('control')}><i className="fa-solid fa-check-double"></i> Control</button>
                        <button className={`${btnBaseClass} px-3 h-8 text-xs ${isActive('logistica') ? btnPrimaryClass : btnSecondaryClass}`} onClick={() => goTo('logistica')}><i className="fa-solid fa-truck-ramp-box"></i> Logística</button>
                    </div>

                    {/* RIGHT: Acciones Globales */}
                    <div className="flex items-center gap-2 shrink-0">


                        {/* Selected Actions */}
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 mr-2 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                <span className="text-[10px] font-bold text-blue-600 whitespace-nowrap">{selectedIds.length} Sel.</span>
                                <button
                                    onClick={() => setIsRollModalOpen(true)}
                                    className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition whitespace-nowrap"
                                >
                                    Asignar
                                </button>
                                <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-red-500 ml-1">
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        )}

                        <button className={`${btnBaseClass} px-3 h-8 text-xs bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 hover:border-orange-200`} onClick={() => setIsStockOpen(true)}>
                            <i className="fa-solid fa-boxes-stacked"></i> Insumos
                        </button>
                        <button className={`${btnBaseClass} px-3 h-8 text-xs bg-red-50 text-red-600 border border-red-50 hover:bg-red-100 hover:border-red-200`} onClick={() => setIsFailureOpen(true)}>
                            <i className="fa-solid fa-triangle-exclamation"></i> Falla Equipamiento
                        </button>
                    </div>
                </div>
            </header>

            {/* Filter Toolbar (Solo en vista Tabla) */}
            {isActive('') && (
                <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center shrink-0 animate-in slide-in-from-top-2 z-10 transition-all">

                    <button
                        className="h-7 px-3 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-blue-600 hover:border-blue-300 flex items-center gap-2 shadow-sm uppercase tracking-wide"
                        onClick={() => navigate('/consultas/rollos', { state: { areaFilter: areaKey } })}
                    >
                        <i className="fa-solid fa-clock-rotate-left"></i> Historial
                    </button>

                    <div className="w-px h-4 bg-slate-300 mx-1"></div>

                    {/* Prioridad */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mr-1">Prioridad:</span>
                        {availablePriorities.map(p => (
                            <button
                                key={p}
                                onClick={() => setPriorityFilter(p)}
                                className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all border ${priorityFilter === p
                                    ? (['Urgente', 'Reposición', 'Falla'].includes(p) ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' : 'bg-slate-700 text-white border-slate-700 shadow-lg')
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {p === 'ALL' ? 'Todas' : p}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-4 bg-slate-300 mx-2"></div>

                    {/* Estado */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mr-1">Estado:</span>
                        {availableStatuses.map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all border whitespace-nowrap ${statusFilter === s
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {s === 'ALL' ? 'Todos' : s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {renderSidebar()}

                {/* Botón para re-abrir sidebar si está cerrado */}
                {isActive('') && !isSidebarOpen && !isActive('logistica') && (
                    <div
                        className="w-10 shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-slate-50 transition-colors z-10"
                        onClick={() => setIsSidebarOpen(true)}
                        title="Abrir Filtros"
                    >
                        <button className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 flex items-center justify-center hover:text-blue-600 hover:border-blue-300">
                            <i className="fa-solid fa-chevron-right text-[10px]"></i>
                        </button>
                        <span className="text-[10px] uppercase font-bold text-slate-400 [writing-mode:vertical-rl] rotate-180 tracking-widest">
                            Filtros
                        </span>
                    </div>
                )}

                <main className="flex-1 bg-slate-50 p-6 overflow-hidden flex flex-col h-full items-stretch">
                    <Routes>
                        <Route index element={<ProductionTable rowData={filteredOrders} onRowSelected={setSelectedIds} onRowClick={setSelectedOrder} columnDefs={areaConfig.defaultColDefs} />} />
                        <Route path="tabla" element={<ProductionTable rowData={filteredOrders} onRowSelected={setSelectedIds} onRowClick={setSelectedOrder} columnDefs={areaConfig.defaultColDefs} />} />

                        <Route path="lotes" element={<RollsKanban areaCode={areaKey} />} />
                        <Route path="medicion" element={<MeasurementView areaCode={areaKey} />} />
                        <Route path="produccion" element={<ProductionKanban areaCode={areaKey} />} />
                        <Route path="control" element={<FilePrintControl areaCode={areaKey} />} />
                        <Route path="planeacion" element={<PlaneacionTrabajo AreaID={areaKey} />} />
                        <Route path="logistica" element={<LogisticsView areaCode={areaKey} />} />

                        <Route path="*" element={<Navigate to="." replace />} />
                    </Routes>
                </main>
            </div>
            {/* Mantener OrderDetailModal en lugar de Panel */}
            <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onOrderUpdated={refetch} />
        </div>
    );
}