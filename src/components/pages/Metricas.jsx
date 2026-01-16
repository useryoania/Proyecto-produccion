import React, { useState } from 'react';

const dataByTab = {
  general: {
    kpis: [
      { label: "A TIEMPO", value: "88%", subtitle: "200 Órdenes", color: "emerald" }, // Using color name references for logic
      { label: "RETRASOS", value: "6.8%", subtitle: "15 Órdenes", color: "red" },
      { label: "REHECHOS", value: "5.2%", subtitle: "15 Órdenes", color: "amber" }
    ],
    productivity: 85,
    alert: "Balanceado"
  },
  dtf: {
    kpis: [
      { label: "DTF OK", value: "90%", subtitle: "180 Órdenes", color: "emerald" },
      { label: "DTF Retrasos", value: "7.0%", subtitle: "20 Órdenes", color: "red" },
      { label: "DTF Reproceso", value: "3.0%", subtitle: "10 Órdenes", color: "amber" }
    ],
    productivity: 80,
    alert: "Requiere atención"
  }
};

const Metricas = ({ currentView, onSwitchTab }) => {
  const [activeTab, setActiveTab] = useState("general");

  const { kpis, productivity, alert } = dataByTab[activeTab] || dataByTab.general;

  // Helper para clases de colores dinamicos
  const getColorClasses = (color) => {
    switch (color) {
      case 'emerald': return 'from-emerald-400 to-green-600 shadow-emerald-500/20';
      case 'red': return 'from-red-400 to-rose-600 shadow-red-500/20';
      case 'amber': return 'from-amber-400 to-orange-500 shadow-orange-500/20';
      default: return 'from-slate-400 to-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <i className="fa-solid fa-chart-pie text-magenta-500"></i>
          Métricas de Planta
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-1 ml-1">KPIs y Rendimiento en Tiempo Real</p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-8 border-b border-slate-200 pb-1">
        {Object.keys(dataByTab).map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              className={`
                        px-6 py-2 text-xs font-black uppercase tracking-widest rounded-t-lg transition-all border-b-2
                        ${isActive
                  ? 'text-cyan-600 border-cyan-500 bg-cyan-50/50'
                  : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
                }
                    `}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          )
        })}
      </div>

      <div className="animate-fade-in-up">
        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {kpis.map(({ label, value, subtitle, color }, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${getColorClasses(color)} opacity-10 rounded-bl-full`}></div>

              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{label}</h4>
              <span className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${getColorClasses(color)}`}>
                {value}
              </span>
              {subtitle && <p className="text-xs font-bold text-slate-400 mt-2">{subtitle}</p>}
            </div>
          ))}
        </div>

        {/* PRODUCTIVITY AND ALERT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Carga y Productividad */}
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800">Carga y Productividad</h3>
              <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Semanal
              </div>
            </div>

            <div className="relative pt-4 pb-2">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-cyan-600 bg-cyan-200">
                    Eficiencia
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black inline-block text-cyan-600">
                    {productivity}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-slate-100 border border-slate-100 shadow-inner">
                <div
                  style={{ width: `${productivity}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                ></div>
              </div>
            </div>

            <p className="text-slate-400 text-xs italic text-center mt-2">La planta está operando a buen ritmo.</p>
          </div>

          {/* Alertas */}
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-center items-center text-center group cursor-help">
            <div className="w-16 h-16 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-yellow-100">
              <i className="fa-solid fa-bell"></i>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">Estado de Alertas</h3>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">{alert}</div>
            <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
              El sistema monitorea en tiempo real posibles cuellos de botella.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metricas;
