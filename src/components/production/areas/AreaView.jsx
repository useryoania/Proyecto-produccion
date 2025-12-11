import React, { useState, useEffect, useMemo } from "react";

// Componentes
import ProductionTable from "../components/ProductionTable"; 
import OrderDetailPanel from "../../production/components/OrderDetailPanel";

// Servicios
import { ordersService } from '../../../services/api';

// Vistas Alternativas
import RollsKanban from "../../pages/RollsKanban"; 
import ProductionKanban from "../../pages/ProductionKanban"; 

// Modales
import NewOrderModal from "../../modals/NewOrderModal";
import SettingsModal from "../../modals/SettingsModal";
import ReportFailureModal from "../../modals/ReportFailureModal";
import StockRequestModal from "../../modals/StockRequestModal";
import LogisticsCartModal from "../../modals/LogisticsCartModal";
import RollAssignmentModal from "../../modals/RollAssignmentModal";

// Sidebars
import SidebarProcesses from "../../layout/SidebarProcesses";
import RollSidebar from "../../layout/RollSidebar";
import MatrixSidebar from "../../layout/MatrixSidebar";

// Configuración y Estilos
import { areaConfigs } from "../../utils/configs/areaConfigs";
import styles from "./AreaView.module.css";

export default function AreaView({
  areaKey,
  areaConfig,
  filters = {},
  updateFilter = () => {},
  views = { currentView: "table" },
  switchView = () => {},
  onSwitchTab
}) {
  // --- ESTADOS DE NAVEGACIÓN ---
  const [activeTab, setActiveTab] = useState("todo"); 
  const [isKanbanMode, setIsKanbanMode] = useState(false);      
  const [isProductionMode, setIsProductionMode] = useState(false); 

  // --- ESTADOS DE FILTRO & UI ---
  const [sidebarFilter, setSidebarFilter] = useState("ALL"); 
  const [sidebarMode, setSidebarMode] = useState("rolls"); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // <--- NUEVO: Controla si se ve la barra
  
  const [clientFilter, setClientFilter] = useState(""); 
  const [variantFilter, setVariantFilter] = useState("ALL");

  // --- DATOS ---
  const [dbOrders, setDbOrders] = useState([]); 
  const [loadingOrders, setLoadingOrders] = useState(false);

  // --- SELECCIÓN ---
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [selectedIds, setSelectedIds] = useState([]);       

  // --- MODALES ---
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFailureOpen, setIsFailureOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isRollModalOpen, setIsRollModalOpen] = useState(false);

  // 1. CARGAR ÓRDENES
  const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
          const mode = activeTab === 'todo' ? 'active' : 'history';
          const data = await ordersService.getByArea(areaKey, mode);
          setDbOrders(data);
      } catch (error) {
          console.error("Error cargando órdenes:", error);
      } finally {
          setLoadingOrders(false);
      }
  };

  useEffect(() => { if (areaKey) fetchOrders(); }, [areaKey, activeTab]);
  
  // Resetear filtros al cambiar de área
  useEffect(() => { 
      setSidebarFilter("ALL"); 
      setClientFilter("");
      setVariantFilter("ALL");
      setSelectedIds([]);
      setSidebarMode("rolls");
      setIsKanbanMode(false);
      setIsProductionMode(false);
      setIsSidebarOpen(true); // Reiniciamos sidebar abierto
  }, [areaKey]);

  // 2. FILTRADO
  const filteredOrders = useMemo(() => {
    let result = dbOrders;
    
    // Filtro Sidebar
    if (sidebarFilter !== 'ALL') {
        if (sidebarFilter === 'Sin Asignar') {
             // Caso especial para nulos
             if (sidebarMode === 'rolls') result = result.filter(o => !o.rollId);
             else result = result.filter(o => !o.printer);
        } else {
             if (sidebarMode === 'rolls') result = result.filter(o => o.rollId === sidebarFilter);
             else result = result.filter(o => o.printer === sidebarFilter);
        }
        
        if (areaKey === 'BORD' && sidebarMode === 'rolls') {
            result = result.filter(o => o.matrixStatus === sidebarFilter);
        }
    }

    if (clientFilter) result = result.filter(o => o.client && o.client.toLowerCase().includes(clientFilter.toLowerCase()));
    if (variantFilter !== 'ALL') result = result.filter(o => o.variant === variantFilter);
    
    return result;
  }, [dbOrders, sidebarFilter, sidebarMode, clientFilter, variantFilter, areaKey]);

  // 3. RENDERIZADO DEL SIDEBAR
  const renderSidebar = () => {
    if (!isSidebarOpen) return null; // Si está cerrado, no renderiza nada aquí

    // Áreas de Impresión
    if (areaKey === 'DTF' || areaKey === 'SUB' || areaKey === 'ECOUV') {
        let sidebarData = dbOrders;
        
        // Si estamos en modo MÁQUINAS, mapeamos para que RollSidebar entienda la data
        if (sidebarMode === 'machines') {
            sidebarData = dbOrders.map(o => ({ ...o, rollId: o.printer })); // printer puede ser null, RollSidebar lo maneja
        }

        return (
            <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                <div className={styles.sidebarSwitcher}>
                    <button className={sidebarMode === 'rolls' ? styles.switchActive : styles.switchBtn} onClick={() => { setSidebarMode('rolls'); setSidebarFilter('ALL'); }}>Lotes</button>
                    <button className={sidebarMode === 'machines' ? styles.switchActive : styles.switchBtn} onClick={() => { setSidebarMode('machines'); setSidebarFilter('ALL'); }}>Equipos</button>
                </div>
                
                <RollSidebar 
                    orders={sidebarData} 
                    currentFilter={sidebarFilter} 
                    onFilterChange={setSidebarFilter}
                    onClose={() => setIsSidebarOpen(false)} // <--- Acción cerrar
                    title={sidebarMode === 'rolls' ? 'LOTES / ROLLOS' : 'EQUIPOS'} // <--- Título dinámico
                />
            </div>
        );
    }
    
    if (areaKey === 'BORD') {
        return <MatrixSidebar orders={dbOrders} currentFilter={sidebarFilter} onFilterChange={setSidebarFilter} />;
    }
    
    return <SidebarProcesses allAreaConfigs={areaConfigs} currentArea={areaKey} onAreaChange={(key) => onSwitchTab(`planilla-${key.toLowerCase()}`)} />;
  };

  const handleGoBack = () => onSwitchTab && onSwitchTab('dashboard');
  const handleSelectionChange = (ids) => setSelectedIds(ids); 
  const handleSyncERP = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/import/sync'); 
            const data = await res.json();
            alert(data.message || 'Sincronización completada');
            fetchOrders();
        } catch (e) { alert('Error al sincronizar con ERP'); }
  };

  const readyCount = dbOrders.filter(o => o.status === 'Finalizado').length;
  const uniqueVariants = [...new Set(dbOrders.map(o => o.variant).filter(Boolean))];

  if (!areaConfig) return <div style={{padding:20}}>Cargando configuración...</div>;

  return (
    <div className={styles.layoutContainer}>
      
      {/* MODALES */}
      <NewOrderModal isOpen={isNewOrderOpen} onClose={() => { setIsNewOrderOpen(false); fetchOrders(); }} areaName={areaConfig.name} areaCode={areaKey} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} area={areaConfig.name} />
      <ReportFailureModal isOpen={isFailureOpen} onClose={() => setIsFailureOpen(false)} areaName={areaConfig.name} areaCode={areaKey} />
      <StockRequestModal isOpen={isStockOpen} onClose={() => setIsStockOpen(false)} areaName={areaConfig.name} areaCode={areaKey} />
      <LogisticsCartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} areaName={areaConfig.name} areaCode={areaKey} onSuccess={() => { setActiveTab('all'); fetchOrders(); }} />
      <RollAssignmentModal isOpen={isRollModalOpen} onClose={() => setIsRollModalOpen(false)} selectedIds={selectedIds} onSuccess={() => { setSelectedIds([]); fetchOrders(); }} />

      {/* HEADER */}
      <header className={styles.headerContainer}>
        <div className={styles.headerTopRow}>
            <div className={styles.titleGroup}>
                <button className={styles.backButton} onClick={handleGoBack}><i className="fa-solid fa-arrow-left"></i></button>
                <div className={styles.titles}><h1>{areaConfig.name}</h1><span className={styles.breadcrumb}>PRODUCCIÓN</span></div>
            </div>
            <div className={styles.navCenter}>
                <div className={styles.filterTabs}>
                    <button className={activeTab === "todo" ? styles.filterTabActive : styles.filterTab} onClick={() => setActiveTab("todo")}>Para Hacer</button>
                    <button className={activeTab === "all" ? styles.filterTabActive : styles.filterTab} onClick={() => setActiveTab("all")}>Historial</button>
                </div>
            </div>
            <div className={styles.actionButtons}>
                 <button className={styles.btnConfig} onClick={handleSyncERP} title="Sincronizar ERP" style={{marginRight:5, background:'#f0fdf4', color:'#166534', borderColor:'#bbf7d0'}}><i className="fa-solid fa-rotate"></i> Sync ERP</button>
                 <button className={styles.btnConfig} onClick={() => onSwitchTab('config')} title="Configuración"><i className="fa-solid fa-gear"></i></button>
                 <button className={styles.btnInsumos} onClick={() => setIsStockOpen(true)}><i className="fa-solid fa-boxes-stacked"></i> Insumos</button>
                 <button className={styles.btnFalla} onClick={() => setIsFailureOpen(true)}><i className="fa-solid fa-triangle-exclamation"></i> Falla</button>
                 <button className={styles.btnNew} onClick={() => setIsNewOrderOpen(true)}><i className="fa-solid fa-plus"></i> Nueva Orden</button>
            </div>
        </div>

        <div className={styles.processControlRow}>
            <div className={styles.processActions}>
                <button className={isKanbanMode ? styles.btnPrimary : styles.btnSecondary} onClick={() => { setIsKanbanMode(!isKanbanMode); setIsProductionMode(false); }}>
                    <i className={`fa-solid ${isKanbanMode ? 'fa-table' : 'fa-layer-group'}`}></i> {isKanbanMode ? 'Ver Tabla' : 'Armado de Lotes'}
                </button>
                {(areaKey === 'DTF' || areaKey === 'SUB'|| areaKey === 'ECOUV') && (
                    <button className={isProductionMode ? styles.btnPrimary : styles.btnSecondary} onClick={() => { setIsProductionMode(!isProductionMode); setIsKanbanMode(false); }}>
                        <i className="fa-solid fa-scroll"></i> {isProductionMode ? 'Ver Tabla' : 'Lote a Producción'}
                    </button>
                )}
                <button className={styles.btnEntrega} onClick={() => setIsCartOpen(true)}>
                    <i className="fa-solid fa-cart-shopping" style={{ fontSize: '1.1rem' }}></i><span style={{marginLeft:5}}>Entrega</span>
                    {readyCount > 0 && <span className={styles.cartBadge}>{readyCount > 99 ? '99+' : readyCount}</span>}
                </button>
            </div>
            <div className={styles.quickFilters}>
                <div className={styles.filterInputGroup}><i className="fa-solid fa-magnifying-glass"></i><input type="text" placeholder="Buscar Cliente..." value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} /></div>
                <div className={styles.filterInputGroup}><i className="fa-solid fa-filter"></i>
                    <select value={variantFilter} onChange={(e) => setVariantFilter(e.target.value)}>
                        <option value="ALL">Todas Variantes</option>
                        {uniqueVariants.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
            </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <div className={styles.bodyContainer}>
        
        {/* A) SIDEBAR (Solo visible en modo Tabla y si isSidebarOpen es true) */}
        {!isKanbanMode && !isProductionMode && isSidebarOpen && (
            <aside className={styles.sidebarColumn}>
                {renderSidebar()}
            </aside>
        )}

        {/* B) BOTÓN PARA RE-ABRIR SIDEBAR (Solo si está cerrado) */}
        {!isKanbanMode && !isProductionMode && !isSidebarOpen && (
            <div 
                style={{ 
                    width: '30px', 
                    background: '#f8fafc', 
                    borderRight: '1px solid #e2e8f0', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    paddingTop: '15px', 
                    cursor: 'pointer' 
                }}
                onClick={() => setIsSidebarOpen(true)}
                title="Mostrar Panel Lateral"
            >
                <i className="fa-solid fa-angles-right" style={{ color: '#94a3b8' }}></i>
                <span style={{ writingMode: 'vertical-rl', marginTop: '20px', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {sidebarMode === 'rolls' ? 'Lotes' : 'Equipos'}
                </span>
            </div>
        )}
        
        {/* CONTENIDO CENTRAL */}
        <main className={styles.mainContent}>
            {loadingOrders ? (
                <div style={{textAlign:'center', padding:40, color:'#64748b'}}><i className="fa-solid fa-spinner fa-spin" style={{marginRight:10}}></i> Cargando datos...</div>
            ) : (
                <>
                    {isKanbanMode ? ( <RollsKanban areaCode={areaKey} /> ) : 
                     isProductionMode ? ( <ProductionKanban areaCode={areaKey} /> ) : 
                     (
                        <div style={{ flex: 1, overflow: 'hidden', height:'100%', width:'100%' }}>
                            <ProductionTable rowData={filteredOrders} onRowSelected={handleSelectionChange} onRowClick={(order) => setSelectedOrder(order)} />
                        </div>
                    )}
                </>
            )}
        </main>
      </div>

      <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
};