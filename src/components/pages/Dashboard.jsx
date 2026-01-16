import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import ActivityFeed from '../dashboard/ActivityFeed.jsx';
import ActiveOrdersCard from '../dashboard/ActiveOrdersCard.jsx';
import CancelledOrdersCard from '../dashboard/CancelledOrdersCard.jsx';
import FailedOrdersCard from '../dashboard/FailedOrdersCard.jsx';

const Dashboard = ({ orders = [] }) => {

  return (
    <div className="min-h-screen bg-slate-50 p-8 custom-scrollbar font-sans text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Panel de Control</h1>
          <p className="text-slate-500 font-medium text-sm">Monitoreo en tiempo real de la producción</p>
        </div>
        <div className="flex gap-2 items-center">
          <Link to="/consultas/rollos" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 hover:text-blue-600 transition-colors shadow-sm flex items-center gap-2 text-sm">
            <i className="fa-solid fa-clock-rotate-left"></i> Historial Lotes
          </Link>
          <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="w-3 h-3 rounded-full bg-pink-500 animate-pulse delay-75"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse delay-150"></span>
        </div>
      </div>

      {/* Buscador Global: Ocultado temporalmente por solicitud del usuario */}

      {/* Tarjeta de Órdenes activas */}


      {/* Grid de KPIs Moderno */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">

        {/* Tarjeta de Órdenes activas dentro del grid */}
        <div className="relative bg-white rounded-2xl p-6 border border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <ActiveOrdersCard />
        </div>

        {/* Tarjeta de Órdenes con Falla */}
        <FailedOrdersCard />

        {/* Tarjeta de Órdenes canceladas */}
        <div className="relative bg-white rounded-2xl p-6 border border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <CancelledOrdersCard />
        </div>
      </div>

      {/* Sección Actividad */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
          <i className="fa-solid fa-bolt"></i>
        </div>
        <h3 className="text-lg font-black text-slate-800">Actividad de Planta</h3>
      </div>
      <ActivityFeed />
    </div>
  );
};

export default Dashboard;