import React from 'react';

const areas = [
  { key: 'planilla-dtf', name: 'DTF', icon: 'fa-print', color: '#2563eb', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', softBg: 'bg-blue-50' },
  { key: 'planilla-bordado', name: 'Bordado', icon: 'fa-needle', color: '#7c3aed', bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', softBg: 'bg-purple-50' },
  { key: 'planilla-uv', name: 'ECO UV', icon: 'fa-sun', color: '#ea580c', bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-600', softBg: 'bg-orange-50' },
  { key: 'planilla-tpu-uv', name: 'TPU UV', icon: 'fa-cube', color: '#0ea5e9', bg: 'bg-sky-600', text: 'text-sky-600', border: 'border-sky-600', softBg: 'bg-sky-50' },
  { key: 'planilla-directa', name: 'Impresión Directa', icon: 'fa-spray-can', color: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', softBg: 'bg-emerald-50' },
  { key: 'planilla-estampado', name: 'Estampado', icon: 'fa-shirt', color: '#ec4899', bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500', softBg: 'bg-pink-50' },
  { key: 'planilla-laser', name: 'Láser', icon: 'fa-bolt-lightning', color: '#eab308', bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500', softBg: 'bg-yellow-50' },
  { key: 'planilla-costura', name: 'Costura', icon: 'fa-scissors', color: '#ef4444', bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', softBg: 'bg-red-50' },
  { key: 'planilla-terminacion', name: 'Terminación UV', icon: 'fa-check', color: '#14b8a6', bg: 'bg-teal-500', text: 'text-teal-500', border: 'border-teal-500', softBg: 'bg-teal-50' },
  { key: 'planilla-coordinacion', name: 'Coordinación', icon: 'fa-people-group', color: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500', softBg: 'bg-indigo-50' },
  { key: 'planilla-deposito', name: 'Depósito', icon: 'fa-boxes-stacked', color: '#4b5563', bg: 'bg-slate-600', text: 'text-slate-600', border: 'border-slate-600', softBg: 'bg-slate-50' },
  { key: 'planilla-sublimacion', name: 'Sublimación', icon: 'fa-fire', color: '#dc2626', bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600', softBg: 'bg-red-50' },
];

const Planilla = ({ onSwitchTab }) => {
  return (
    <div className="p-10 font-sans min-h-screen bg-slate-50">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Planillas de Área</h1>
        <p className="text-slate-500 font-medium">Selecciona un área para gestionar su producción.</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
        {areas.map(area => (
          <button
            key={area.key}
            className={`
                flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 transition-all 
                hover:-translate-y-1 hover:shadow-xl group
                ${area.border}
            `}
            style={{ borderColor: area.color }} // Fallback if tailwind class fails
            onClick={() => onSwitchTab(area.key)}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4 transition-colors ${area.softBg} ${area.text}`}
            >
              <i className={`fa-solid ${area.icon}`}></i>
            </div>
            <h3 className="text-base font-bold text-slate-700 group-hover:text-slate-900">{area.name}</h3>
            <span className="text-xs text-slate-400 mt-1 font-medium group-hover:text-slate-500">Ver planilla</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Planilla;
