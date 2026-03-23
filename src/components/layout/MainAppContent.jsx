import { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { LayoutDashboard, Warehouse, Printer, ClipboardList, Terminal, CircleUserRound, Tags, Headset, Calculator, Landmark, Shirt, Sun, Sparkles, Flame, Scissors, Pen, Shapes, PenLine, QrCode, ShieldBan, PrinterCheck, History, LayoutGrid, PackagePlus, PackageCheck, Truck, FileSearch, Boxes, Waypoints, Send, Package, Bus, ClipboardCheck, Menu, Users, Shield, Eye, Settings, Database, UserX, RefreshCw, BadgeDollarSign, Layers, BookOpen, Banknote, CreditCard, ShieldCheck } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
const MachineDetailView = lazy(() => import('../pages/MachineDetailView'));
import Dashboard from '../pages/Dashboard';
import AreaView from '../production/areas/AreaView';
const ConfigPage = lazy(() => import('../pages/ConfigPage'));
const LogisticsDashboard = lazy(() => import('../logistics/LogisticsDashboard'));
const OrdersQueryView = lazy(() => import('../pages/OrdersQueryView'));
const RollHistory = lazy(() => import('../pages/RollHistory'));
const MenuAdmin = lazy(() => import('../pages/MenuAdmin'));
const RolesPage = lazy(() => import('../pages/RolesPage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const AuditPage = lazy(() => import('../pages/AuditPage'));
const InventoryPage = lazy(() => import('../pages/InventoryPage'));
const InsumosCatalogPage = lazy(() => import('../pages/InsumosCatalogPage'));
const StockRequestsPage = lazy(() => import('../pages/StockRequestsPage'));
const ReceptionPage = lazy(() => import('../pages/customer-service/ReceptionPage'));
const LogisticsPage = lazy(() => import('../pages/customer-service/LogisticsPage'));
const ActiveStockPage = lazy(() => import('../pages/customer-service/ActiveStockPage'));
const TransportControlPage = lazy(() => import('../pages/TransportControlPage'));
const EcoUvFinishing = lazy(() => import('../pages/EcoUvFinishing'));
const WebRetirosPage = lazy(() => import('../logistics/WebRetirosPage'));
const ClientsIntegration = lazy(() => import('../pages/ClientsIntegration'));
import ChatWidget from '../common/ChatWidget';
const ProductsIntegration = lazy(() => import('../pages/ProductsIntegration'));
const SpecialPrices = lazy(() => import('../pages/SpecialPrices'));
const BasePrices = lazy(() => import('../pages/BasePrices'));
const PriceProfiles = lazy(() => import('../pages/PriceProfiles'));
const LabelGenerationPage = lazy(() => import('../pages/LabelGenerationPage'));
const DepositStockPage = lazy(() => import('../logistics/DepositStockPage'));
const CustomerReplacementPage = lazy(() => import('../pages/customer-service/CustomerReplacementPage'));
const CustomerPriceCatalogPage = lazy(() => import('../pages/CustomerPriceCatalogPage'));
const IntegralOrderView = lazy(() => import('../pages/IntegralOrderView'));
const CargaPagosView = lazy(() => import('../pages/CargaPagosView'));
const VerificarPagosOnlineView = lazy(() => import('../pages/VerificarPagosOnlineView'));
const ExcepcionesDeudaView = lazy(() => import('../pages/ExcepcionesDeudaView'));
const CargaDepositoPage = lazy(() => import('../logistics/CargaDepositoPage'));
const VerificarCodigoPage = lazy(() => import('../logistics/VerificarCodigoPage'));
const CuadreDiarioView = lazy(() => import('../pages/CuadreDiarioView'));
const DuplicateClientsPage = lazy(() => import('../pages/admin/DuplicateClientsPage'));
const OrderSearchPage = lazy(() => import('../logistics/OrderSearchPage'));
const EntregaPedidosView = lazy(() => import('../pages/customer-service/EntregaPedidosView'));
const DepositoDashboard = lazy(() => import('../logistics/DepositoDashboard'));
const SysAdminPage = lazy(() => import('../pages/admin/SysAdminPage'));

// ============================================
// 1. LUCIDE ICON MAP (override FA icons)
// ============================================
const lucideIconMapRaw = {
    'dashboard': LayoutDashboard,
    'logística wms': Warehouse,
    'logistica wms': Warehouse,
    'producción': Printer,
    'produccion': Printer,
    'informes': ClipboardList,
    'sys admin': Terminal,
    'gestión clientes': CircleUserRound,
    'gestion clientes': CircleUserRound,
    'gestión de clientes': CircleUserRound,
    'gestion de clientes': CircleUserRound,
    'gestión productos': Tags,
    'gestion productos': Tags,
    'gestión de productos': Tags,
    'gestion de productos': Tags,
    'atención al cliente': Headset,
    'atencion al cliente': Headset,
    'gestión de precios': Calculator,
    'gestion de precios': Calculator,
    'administración': Landmark,
    'administracion': Landmark,
    // Producción sub-items
    'dtf': Shirt,
    'eco uv': Sun,
    'ecouv': Sun,
    'terminaciones eco uv': Sparkles,
    'terminaciones ecouv': Sparkles,
    'terminacionesecouv': Sparkles,
    'sublimación': Flame,
    'sublimacion': Flame,
    'corte': Scissors,
    'costura': Pen,
    'estampado': Shapes,
    'bordado': PenLine,
    'impresión': Printer,
    'impresion': Printer,
    'generar etiquetas': QrCode,
    'tpu': ShieldBan,
    'impresión directa': PrinterCheck,
    'impresion directa': PrinterCheck,
    'historial de lotes': History,
    // Logística WMS sub-items
    'dashboard depósito': LayoutGrid,
    'dashboard deposito': LayoutGrid,
    'ingreso/aviso de órdenes': PackagePlus,
    'ingreso/aviso de ordenes': PackagePlus,
    'ingreso/ aviso de ordenes': PackagePlus,
    'ingreso/ aviso de órdenes': PackagePlus,
    'empaquetado de retiros': PackageCheck,
    'gestión de encomiendas': Truck,
    'gestion de encomiendas': Truck,
    'gestión de encomiendas y cadeteria': Truck,
    'gestion de encomiendas y cadeteria': Truck,
    'gestión de encomiendas y cadetería': Truck,
    'gestion de encomiendas y cadetería': Truck,
    'buscar/actualizar órdenes': FileSearch,
    'buscar/actualizar ordenes': FileSearch,
    'buscar/actualizar ordenes de retiro': FileSearch,
    'buscar/actualizar órdenes de retiro': FileSearch,
    'inventario': Boxes,
    'control logístico': Waypoints,
    'control logistico': Waypoints,
    'enviar a react': Send,
    'inventario de insumos': Package,
    'inventarios de insumo': ClipboardCheck,
    'insumos': Package,
    'control de transporte': Bus,
    'control transporte': Bus,
    // Sys Admin sub-items
    'gestion menu': Menu,
    'gestión menu': Menu,
    'gestión del menú': Menu,
    'gestion del menu': Menu,
    'usuarios': Users,
    'gestión de roles': Shield,
    'gestion de roles': Shield,
    'auditoría': Eye,
    'auditoria': Eye,
    'configuración': Settings,
    'configuracion': Settings,
    'admin db': Database,
    'depurar clientes': UserX,
    'sysadmin': Terminal,
    'consola': Terminal,
    // Atención al Cliente sub-items
    'ingreso materiales': PackagePlus,
    'reposiciones': RefreshCw,
    // Gestión de Precios sub-items
    'precios estándar': BadgeDollarSign,
    'precios estandar': BadgeDollarSign,
    'perfiles de precios': Layers,
    'catálogo por cliente': BookOpen,
    'catalogo por cliente': BookOpen,
    // Administración sub-items
    'caja': Banknote,
    'pagos': CreditCard,
    'autorizaciones de pagos': ShieldCheck,
};
const getLucideIcon = (name) => lucideIconMapRaw[name?.toLowerCase?.()?.trim?.()?.replace(/\s+/g, ' ')];

// ============================================
// 2. COMPONENTE NAVNODE (Mejorado)
// ============================================
const NavNode = ({ item, openMenus, toggleMenu, navigate, location, level = 0, isCollapsed, setIsCollapsed }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openMenus[item.IdModulo];
    const isChildActive = hasChildren && item.children.some(c => location.pathname === c.Ruta || (c.Ruta && location.pathname.startsWith(c.Ruta + '/')));
    const isSelected = location.pathname === item.Ruta || (hasChildren && isChildActive);

    const baseClasses = "flex items-center mx-2 rounded-md cursor-pointer select-none transition-all duration-200 group relative";

    return (
        <div className="w-full">
            <div
                className={`
                    ${baseClasses}
                    ${isSelected
                        ? "bg-brand-cyan text-white shadow-md shadow-brand-cyan/30"
                        : "text-slate-100 opacity-70 hover:opacity-100 hover:bg-zinc-800 hover:text-white"
                    }
                    py-2.5
                `}
                style={{
                    paddingLeft: !isCollapsed && level > 0 ? `${level * 12}px` : undefined,
                }}
                onClick={() => {
                    if (hasChildren) {
                        if (isCollapsed) setIsCollapsed(false);
                        const wasOpen = openMenus[item.IdModulo];
                        toggleMenu(item.IdModulo);
                        if (!wasOpen) {
                            const firstChild = item.children.find(c => c.Ruta);
                            if (firstChild) navigate(firstChild.Ruta);
                        }
                    } else if (item.Ruta) navigate(item.Ruta);
                }}
                title={isCollapsed ? item.Nombre : ''}
            >

                <div className="w-12 flex-shrink-0 flex items-center justify-center text-base group-hover:scale-110 transition-transform duration-300">
                    {getLucideIcon(item.Nombre) ? (
                        (() => { const LucideIcon = getLucideIcon(item.Nombre); return <LucideIcon size={22} className={isSelected ? 'text-white' : 'text-slate-300 group-hover:text-brand-cyan'} />; })()
                    ) : (
                        <i className={`
                            fa-solid ${item.Icono || (hasChildren ? 'fa-folder' : 'fa-circle')} 
                            ${isSelected ? "text-white" : "text-slate-300 group-hover:text-brand-cyan"}
                        `}></i>
                    )}
                </div>

                {!isCollapsed && (
                    <>
                        <span className={`flex-1 text-xs font-medium tracking-wide whitespace-nowrap ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                            {item.Nombre}
                        </span>

                        {hasChildren && (
                            <i className={`
                                fa-solid fa-chevron-right text-[10px] mr-4 transition-transform duration-300
                                ${isOpen ? "rotate-90" : ""}
                                ${isSelected ? "text-blue-500" : "text-slate-100"}
                            `}></i>
                        )}
                    </>
                )}

            </div>

            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                    maxHeight: hasChildren && isOpen && !isCollapsed ? '1000px' : '0px',
                    opacity: hasChildren && isOpen && !isCollapsed ? 1 : 0,
                    transform: hasChildren && isOpen && !isCollapsed ? 'translateY(0)' : 'translateY(-8px)',
                }}
            >
                {hasChildren && (
                    <div className="mt-1">
                        {item.children.map(child => (
                            <NavNode
                                key={child.IdModulo}
                                item={child}
                                openMenus={openMenus}
                                toggleMenu={toggleMenu}
                                navigate={navigate}
                                location={location}
                                level={level + 1}
                                isCollapsed={isCollapsed}
                                setIsCollapsed={setIsCollapsed}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// 2. COMPONENTE PRINCIPAL (Layout)
// ============================================
const MainAppContent = ({ menuItems = [] }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [openMenus, setOpenMenus] = useState({});
    const [isCollapsed, setIsCollapsed] = useState(true);

    const handleSidebarEnter = useCallback(() => setIsCollapsed(false), []);
    const handleSidebarLeave = useCallback(() => setIsCollapsed(true), []);

    // Dynamic sidebar width based on which parent is expanded
    const expandedWidth = useMemo(() => {
        const openIds = Object.entries(openMenus).filter(([, v]) => v).map(([k]) => Number(k));
        const openNames = openIds.map(id => menuItems.find(m => m.IdModulo === id)?.Nombre?.toLowerCase() || '');
        if (openNames.some(n => n.includes('logística wms') || n.includes('logistica wms'))) return 380;
        if (openNames.some(n => n.includes('administración') || n.includes('administracion'))) return 350;
        return 300;
    }, [openMenus, menuItems]);

    console.log(`[MainAppContent] Render! Path: ${location.pathname}, Key: ${location.key}`);

    const toggleMenu = (id) => setOpenMenus(prev => {
        const wasOpen = prev[id];
        if (!wasOpen) {
            // Encontrar hermanos (mismo padre) para cerrarlos
            const item = menuItems.find(m => m.IdModulo === id);
            const siblings = menuItems.filter(m => m.IdPadre === (item?.IdPadre || null) && m.IdModulo !== id);
            const siblingIds = new Set(siblings.map(s => s.IdModulo));
            const next = {};
            // Mantener ancestros abiertos, cerrar hermanos
            Object.entries(prev).forEach(([k, v]) => {
                if (v && !siblingIds.has(Number(k) || k)) next[k] = true;
            });
            next[id] = true;
            return next;
        }
        return { ...prev, [id]: false };
    });

    const menuTree = useMemo(() => {
        const map = {};
        const tree = [];
        const items = menuItems.map(i => ({ ...i, children: [] }));

        items.forEach(item => { map[item.IdModulo] = item; });
        items.forEach(item => {
            if (item.IdPadre && map[item.IdPadre]) {
                map[item.IdPadre].children.push(item);
            } else if (!item.IdPadre) {
                tree.push(item);
            }
        });

        const sortFn = (a, b) => (a.IndiceOrden || 0) - (b.IndiceOrden || 0);
        const sortRecursive = (nodes) => {
            nodes.sort(sortFn);
            nodes.forEach(node => {
                if (node.children.length > 0) sortRecursive(node.children);
            });
        };
        sortRecursive(tree);
        return tree;
    }, [menuItems]);

    const expandAll = () => {
        const allIds = {};
        menuItems.forEach(item => {
            if (menuItems.some(child => child.IdPadre === item.IdModulo)) {
                allIds[item.IdModulo] = true;
            }
        });
        setOpenMenus(allIds);
    };

    const collapseAll = () => {
        setOpenMenus({});
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans">
            <Toaster
                position="top-right"
                expand
                gap={8}
                theme="light"
                toastOptions={{
                    className: 'shadow-xl rounded-xl',
                    classNames: {
                        toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-800 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl',
                        title: 'text-slate-800 font-semibold text-lg',
                        description: 'text-slate-500 text-xs font-medium',
                        error: '!bg-red-50 !border-red-500 !text-red-500',
                        success: '!bg-emerald-50 !border-emerald-500 !text-emerald-500',
                        warning: '!bg-yellow-50 !border-yellow-500 !text-yellow-600',
                        info: '!bg-blue-50 !border-blue-500 !text-blue-500',
                    },
                    style: {
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    }
                }}
            />
            <Navbar />
            <div className="flex flex-1 overflow-hidden relative">
                {/* Spacer to reserve collapsed sidebar width */}
                <div className="w-16 flex-shrink-0" />
                <aside
                    className={`
                        flex flex-col bg-custom-dark z-[100]
                        transition-all duration-300 ease-in-out h-full absolute left-0 top-0
                        ${isCollapsed ? "w-16" : ""}
                    `}
                    style={!isCollapsed ? { width: expandedWidth } : undefined}
                    onMouseEnter={handleSidebarEnter}
                    onMouseLeave={handleSidebarLeave}
                >
                    <div className="hidden items-center justify-around px-4 border-b border-zinc-700 bg-custom-dark min-h-[64px]">
                        {!isCollapsed && (
                            <div className="flex px-2 items-center justify-between">
                                <button
                                    onClick={() => Object.values(openMenus).some(v => v) ? collapseAll() : expandAll()}
                                    className="rounded-md text-slate-100 hover:text-blue-500 transition-colors"
                                    title={Object.values(openMenus).some(v => v) ? "Colapsar todo" : "Expandir todo"}
                                >
                                    <i className={`fa-solid ${Object.values(openMenus).some(v => v) ? 'fa-angles-up' : 'fa-angles-down'} `}></i>
                                </button>
                            </div>
                        )}
                    </div>



                    <nav className={`flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-2 ${isCollapsed ? '' : 'pr-1'} custom-scrollbar space-y-1 uppercase`}>
                        {menuTree.map((node, idx) => (
                            <div key={node.IdModulo}>
                                {idx > 0 && <div className="mx-4 my-1 border-t border-zinc-700/50" />}
                                <NavNode
                                    item={node}
                                    openMenus={openMenus}
                                    toggleMenu={toggleMenu}
                                    navigate={navigate}
                                    location={location}
                                    isCollapsed={isCollapsed}
                                    setIsCollapsed={setIsCollapsed}
                                />
                            </div>
                        ))}
                    </nav>


                </aside>

                <main className="flex-1 overflow-hidden relative bg-slate-100 w-full">
                    <div className="absolute inset-0 overflow-y-auto p-6 scroll-smooth">
                        <Suspense fallback={
                            <div className="flex items-center justify-center h-full ">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        }>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/consultas/ordenes" element={<OrdersQueryView />} />
                                <Route path="/consultas/integral" element={<IntegralOrderView />} />
                                <Route path="/consultas/rollos" element={<RollHistory />} />
                                <Route path="/production/machine/:area/:machineId" element={<MachineDetailView />} />
                                <Route path="/area/:areaId/*" element={<DynamicRouter menuItems={menuItems} />} />
                                <Route path="/atencion-cliente/despachos" element={<ActiveStockPage />} />
                                <Route path="/atencion-cliente/reposiciones" element={<CustomerReplacementPage />} />
                                <Route path="/logistica/transporte" element={<TransportControlPage />} />
                                <Route path="/logistica/stock-deposito" element={<DepositStockPage />} />
                                <Route path="/logistica/retiros-web" element={<WebRetirosPage />} />
                                <Route path="/logistica/excepciones" element={<ExcepcionesDeudaView />} />
                                <Route path="/logistica/carga-deposito" element={<CargaDepositoPage />} />
                                <Route path="/logistica/verificar-codigo" element={<VerificarCodigoPage />} />
                                <Route path="/logistica/buscar-ordenes" element={<OrderSearchPage />} />
                                <Route path="/logistica/dashboard-deposito" element={<DepositoDashboard />} />
                                <Route path="/atencion-cliente/entrega-pedidos" element={<EntregaPedidosView />} />
                                <Route path="/admin/clientes-integration" element={<ClientsIntegration />} />
                                <Route path="/admin/duplicate-clients" element={<DuplicateClientsPage />} />
                                <Route path="/admin/products-integration" element={<ProductsIntegration />} />
                                <Route path="/admin/special-prices" element={<SpecialPrices />} />
                                <Route path="/admin/base-prices" element={<BasePrices />} />
                                <Route path="/admin/price-profiles" element={<PriceProfiles />} />
                                <Route path="/admin/price-catalog" element={<CustomerPriceCatalogPage />} />
                                <Route path="/produccion/etiquetas" element={<LabelGenerationPage />} />
                                <Route path="/caja/pagos" element={<CargaPagosView />} />
                                <Route path="/caja/pagos-online" element={<VerificarPagosOnlineView />} />
                                <Route path="/caja/cuadre" element={<CuadreDiarioView />} />
                                <Route path="/admin/consola" element={<SysAdminPage />} />
                                <Route path="/*" element={<DynamicRouter menuItems={menuItems} />} />
                            </Routes>
                        </Suspense>
                    </div>
                </main>
            </div>
            {/* <ChatWidget /> */}
        </div>
    );
};

// ============================================
// 3. DYNAMIC ROUTER
// ============================================
const DynamicRouter = ({ menuItems }) => {
    const location = useLocation();
    const currentPath = location.pathname;

    if (!menuItems || menuItems.length === 0) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    const matches = menuItems.filter(item => item.Ruta && (currentPath === item.Ruta || currentPath.startsWith(item.Ruta + '/')));
    const menuItem = matches.sort((a, b) => b.Ruta.length - a.Ruta.length)[0];

    // Fallback si no se encuentra ruta exacta
    if (!menuItem) {
        if (currentPath === '/consultas/ordenes') return <OrdersQueryView />;

        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <i className="fa-solid fa-ghost text-4xl mb-4 opacity-50"></i>
                <p className="text-lg font-medium">Ruta no definida</p>
                <p className="text-sm">No se encontró configuración para {currentPath}</p>
            </div>
        );
    }

    if (menuItem.Ruta === '/admin/database') return <ConfigPage />;
    if (menuItem.Ruta === '/admin/menu') return <MenuAdmin />;
    if (menuItem.Ruta === '/admin/roles') return <RolesPage />;
    if (menuItem.Ruta === '/admin/users') return <UsersPage />;
    if (menuItem.Ruta === '/admin/audit') return <AuditPage />;
    if (menuItem.Ruta === '/produccion/etiquetas') return <LabelGenerationPage />;
    if (menuItem.Ruta === '/admin/clientes-integration') return <ClientsIntegration />;
    if (menuItem.Ruta === '/admin/products-integration') return <ProductsIntegration />;
    if (menuItem.Ruta === '/admin/price-catalog') return <CustomerPriceCatalogPage />;
    if (menuItem.Ruta === '/produccion/terminaciones' || menuItem.Ruta === '/area/ecouv/terminaciones') return <EcoUvFinishing />;
    if (menuItem.Ruta === '/logistica' || menuItem.Ruta.toLowerCase() === '/logistica/') return <LogisticsDashboard />;
    if (menuItem.Ruta === '/ops/inventory') return <LogisticsDashboard />;
    if (menuItem.Ruta === '/inventario') return <InventoryPage />;
    if (menuItem.Ruta === '/insumos') return <InsumosCatalogPage />;
    if (menuItem.Ruta === '/solicitudes') return <StockRequestsPage />;
    if (menuItem.Ruta === '/atencion-cliente/recepcion') return <ReceptionPage />;
    if (menuItem.Ruta === '/atencion-cliente/control') return <LogisticsPage />;
    if (menuItem.Ruta === '/atencion-cliente/despachos') return <ActiveStockPage />;
    if (menuItem.Ruta === '/atencion-cliente/reposiciones') return <CustomerReplacementPage />;
    if (menuItem.Ruta === '/atencion-cliente/entrega-pedidos') return <EntregaPedidosView />;
    if (menuItem.Ruta === '/logistica/retiros-web') return <WebRetirosPage />;
    if (menuItem.Ruta === '/logistica/dashboard-deposito') return <DepositoDashboard />;
    if (menuItem.Ruta === '/caja/pagos' || menuItem.Ruta.toLowerCase() === '/caja/pagos/') return <CargaPagosView />;
    if (menuItem.Ruta === '/caja/cuadre') return <CuadreDiarioView />;
    if (menuItem.Ruta === '/logistica/verificar-codigo') return <VerificarCodigoPage />;
    if (menuItem.Ruta === '/logistica/carga-deposito') return <CargaDepositoPage />;
    if (menuItem.Ruta === '/admin/duplicados') return <DuplicateClientsPage />;
    if (menuItem.Ruta === '/logistica/precios') return <SpecialPrices />;
    if (menuItem.Ruta === '/admin/precios-base') return <BasePrices />;
    if (menuItem.Ruta === '/admin/perfiles-precio') return <PriceProfiles />;
    if (menuItem.Ruta === '/logistica/transporte') return <TransportControlPage />;
    if (menuItem.Ruta === '/logistica/buscar-ordenes') return <OrderSearchPage />;
    if (menuItem.Ruta === '/logistica/orden-integral') return <IntegralOrderView />;
    if (menuItem.Ruta === '/caja/verificar-pagos') return <VerificarPagosOnlineView />;
    if (menuItem.Ruta === '/admin/excepciones-deuda') return <ExcepcionesDeudaView />;
    if (menuItem.Ruta === '/admin/consola') return <SysAdminPage />;

    // NEW: Historial de Lotes
    if (menuItem.Ruta === '/consultas/rollos') return <RollHistory />;

    if (currentPath === '/consultas/ordenes') return <OrdersQueryView />;



    const segments = menuItem.Ruta.split('/').filter(Boolean);

    // CORRECCIÓN: Si la ruta actual es más profunda (ej: /area/ecouv), usar ese segmento
    let areaKeyFinal = '';

    const pathSegments = currentPath.split('/').filter(Boolean);
    const areaIndex = pathSegments.findIndex(s => s.toLowerCase() === 'area');

    if (areaIndex !== -1 && pathSegments[areaIndex + 1]) {
        areaKeyFinal = pathSegments[areaIndex + 1];
    } else {
        // Fallback lógica anterior
        const lastSegment = segments[segments.length - 1];
        areaKeyFinal = (lastSegment && !['area', 'procesos'].includes(lastSegment.toLowerCase())) ? lastSegment : menuItem.Nombre;
    }

    console.log(`[DynamicRouter] Path: ${currentPath}, Extracted Key: ${areaKeyFinal}`);

    let areaConfig = {};
    try {
        areaConfig = typeof menuItem.ui_config === 'string' ? JSON.parse(menuItem.ui_config) : (menuItem.ui_config || {});
    } catch (e) { console.error("Error UI Config:", e); }

    return <AreaView key={menuItem.IdModulo} areaKey={areaKeyFinal} areaConfig={areaConfig} />;
};

export default MainAppContent;