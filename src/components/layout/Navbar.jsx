import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/apiClient';

const Navbar = ({ onSwitchTab, currentView }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchRef, setSearchRef] = useState('');
  const searchInputRef = useRef(null);
  const [serverStatus, setServerStatus] = useState('ok'); // 'ok' | 'slow' | 'error'

  useEffect(() => {
    const check = async () => {
      try {
        const start = Date.now();
        await api.get('/health');
        const ms = Date.now() - start;
        setServerStatus(ms > 3000 ? 'slow' : 'ok');
      } catch {
        setServerStatus('error');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to format breadcrumb
  const getBreadcrumb = () => {
    const path = location.pathname.split('/').filter(Boolean);
    if (path.length === 0) return 'INICIO';
    // Mapeo simple de nombres comunes
    const mapNames = {
      'area': 'ÁREA',
      'admin': 'ADMINISTRACIÓN',
      'users': 'USUARIOS',
      'database': 'CONFIGURACIÓN',
      'menu': 'MENÚ',
      'medicion': 'MEDICIÓN',
      'control': 'CONTROL DE CALIDAD',
      'planeacion': 'PLANEACIÓN',
      'logistica': 'LOGÍSTICA'
    };

    return path.map(p => mapNames[p.toLowerCase()] || p.toUpperCase()).join(' > ');
  };

  return (
    <nav className="h-14 px-6 bg-zinc-900 border-b border-zinc-700 flex items-center justify-between sticky top-0 z-50 shadow-md">
      {/* IZQUIERDA: Titulo y Breadcrumb */}
      <div
        className="flex flex-col justify-center cursor-pointer group"
        onClick={() => navigate('/')}
      >
        <h1 className="font-black text-white tracking-tighter text-lg leading-none transition-colors uppercase">
          GESTIÓN DE PRODUCCIÓN</h1>
      </div>
      {/* Búsqueda Integral */}
      <div className="hidden md:block w-48 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!searchRef.trim()) return;
            window.open(`/consultas/integral?ref=${encodeURIComponent(searchRef.trim())}`, '_blank');
            setSearchRef('');
          }}
          className="flex items-center h-9 w-40 focus-within:w-48 transition-all duration-300 bg-zinc-700 rounded-lg overflow-hidden"
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            placeholder="Buscar pedido"
            className="font-bold uppercase bg-transparent pl-3 text-xs min-w-0 outline-none placeholder-slate-300 text-white h-full"
          />
          <button
            type="submit"
            className="px-3 h-full text-slate-100 hover:text-blue-500 transition-colors shrink-0"
            title="Búsqueda Integral"
          >
            <i className="fa-solid fa-magnifying-glass text-md"></i>
          </button>
        </form>
      </div>

      {/* Listado de ordenes */}
      <button
        className="hidden md:flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs uppercase transition-all duration-300 text-slate-100 hover:text-blue-500 bg-zinc-700 shrink-0 active:scale-95"
        onClick={() => navigate('/consultas/ordenes')}
        title="Listado de Órdenes"
      >
        <span className="font-bold">Listado de ordenes</span>
        <i className="fa-solid fa-list-ul"></i>
      </button>

      {/* DERECHA: Notificaciones y Usuario */}
      <div className="flex items-center gap-6">
        {/* Notificaciones */}
        {/* <div
          className="relative cursor-pointer group"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-500 transition-colors">
            <i className="fa-solid fa-bell"></i>
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white shadow-sm">
            3
          </span> 
        </div>

        {/* Usuario */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block px-2">
            <div className="flex text-md font-bold leading-none align-center justify-center text-white">{user?.nombre || user?.usuario}</div>
            <div className="w-full h-px bg-zinc-800 my-1"></div>
            <div className="flex items-center justify-center gap-1">
              <span className={`w-2 h-2 rounded-full ${serverStatus === 'ok' ? 'bg-emerald-500' : serverStatus === 'slow' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className={`text-[11px] font-bold uppercase tracking-wider leading-none text-slate-100`}>
                {user?.rol || user?.role || user?.userType || 'Usuario'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-10 h-10 flex items-center justify-center text-slate-100 hover:text-red-500 transition-all"
            title="Cerrar Sesión"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </nav >
  );
};

export default Navbar;