import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/apiClient';
import { FileText, X, Printer, TrendingUp, RefreshCw, Layers } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' });

const CajaArqueoModal = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/contabilidad/caja/movimientos-turno');
      if (res.data.success) {
        setData(res.data.movimientos || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Agrupar y procesar totales
  const agrupado = useMemo(() => {
    const res = {};
    let saldoTotalUYU = 0;
    let saldoTotalUSD = 0;

    data.forEach(m => {
      const isEgreso = m.TipoOperacion === 'EGRESO';
      const fp = m.MedioDePago || 'INDEFINIDO';
      const isUSD = m.Moneda === 'USD';

      if (!res[fp]) res[fp] = { UYU_in: 0, UYU_out: 0, USD_in: 0, USD_out: 0 };

      if (isEgreso) {
        if (isUSD) { res[fp].USD_out += m.Salida; saldoTotalUSD -= m.Salida; }
        else { res[fp].UYU_out += m.Salida; saldoTotalUYU -= m.Salida; }
      } else {
        if (isUSD) { res[fp].USD_in += m.Entrada; saldoTotalUSD += m.Entrada; }
        else { res[fp].UYU_in += m.Entrada; saldoTotalUYU += m.Entrada; }
      }
    });

    return { porForma: res, saldoUYU: saldoTotalUYU, saldoUSD: saldoTotalUSD };
  }, [data]);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const d = new Date().toLocaleString('es-UY');

    const rows = data.map(m => `
      <tr>
        <td style="padding:6px 8px;font-size:11px">${fmtDate(m.Fecha)}</td>
        <td style="padding:6px 8px;font-weight:bold">${m.TipoOperacion}</td>
        <td style="padding:6px 8px">${m.TipoComprobante || ''} ${m.Comprobante || ''}</td>
        <td style="padding:6px 8px">${m.Concepto || ''}</td>
        <td style="padding:6px 8px">${m.MedioDePago || ''}</td>
        <td style="padding:6px 8px;font-weight:bold;color:#065f46">${m.Entrada > 0 ? `${m.Moneda} ${fmt(m.Entrada)}` : '-'}</td>
        <td style="padding:6px 8px;font-weight:bold;color:#991b1b">${m.Salida > 0 ? `${m.Moneda} ${fmt(m.Salida)}` : '-'}</td>
      </tr>
    `).join('');

    const sumRows = Object.entries(agrupado.porForma).map(([k, v]) => `
      <tr>
        <td style="padding:6px 8px;font-weight:bold">${k}</td>
        <td style="padding:6px 8px;color:#065f46">UYU ${fmt(v.UYU_in)}</td>
        <td style="padding:6px 8px;color:#991b1b">UYU ${fmt(v.UYU_out)}</td>
        <td style="padding:6px 8px;font-weight:bold">UYU ${fmt(v.UYU_in - v.UYU_out)}</td>
        <td style="padding:6px 8px;color:#065f46">USD ${fmt(v.USD_in)}</td>
        <td style="padding:6px 8px;color:#991b1b">USD ${fmt(v.USD_out)}</td>
        <td style="padding:6px 8px;font-weight:bold">USD ${fmt(v.USD_in - v.USD_out)}</td>
      </tr>
    `).join('');

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Arqueo de Caja - Turno Actual</title>
      <style>
        body { font-family: sans-serif; padding: 20px; font-size:12px; }
        h1 { font-size: 18px; margin-bottom: 5px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; text-align: left; }
        th { background: #f0f0f0; padding:6px 8px; font-size:11px; }
        .s { font-size:16px; font-weight:bold; margin: 10px 0;}
      </style>
    </head><body>
      <h1>Arqueo Documentado de Caja</h1>
      <p style="color:#666">Impreso: ${d}</p>
      
      <div class="s">RESUMEN POR FORMA DE PAGO</div>
      <table>
        <tr><th>Medio de Pago</th><th>Entrada UYU</th><th>Salida UYU</th><th>Saldo UYU</th><th>Entrada USD</th><th>Salida USD</th><th>Saldo USD</th></tr>
        ${sumRows}
      </table>
      
      <div style="padding: 10px; background: #eee; border: 1px solid #ccc; font-size: 14px;">
        <strong>SALDO FINAL NETO DEL TURNO:</strong> &nbsp;&nbsp;&nbsp; UYU ${fmt(agrupado.saldoUYU)} &nbsp;&nbsp;|&nbsp;&nbsp; USD ${fmt(agrupado.saldoUSD)}
      </div>

      <div class="s">DETALLE DE MOVIMIENTOS</div>
      <table>
        <tr><th>Fecha y Hora</th><th>Tipo</th><th>Comprobante</th><th>Rubro/Concepto</th><th>Medio de Pago</th><th>Entrada</th><th>Salida</th></tr>
        ${rows}
      </table>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center font-sans">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white border border-slate-200 rounded-3xl w-[95%] max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
              <Layers size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Arqueo de Caja (Turno Actual)</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Movimientos, agrupaciones y saldos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2.5 bg-white text-slate-500 hover:text-slate-800 rounded-xl transition-all border border-slate-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:scale-95">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={handlePrint} className="flex flex-row gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-black text-white font-black rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95">
              <Printer size={18} /> IMPRIMIR ARCHIVO
            </button>
            <div className="w-px h-8 bg-slate-200 mx-1"></div>
            <button onClick={onClose} className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-100 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-auto p-8 space-y-8 bg-[#f1f5f9]">
          {loading ? (
             <div className="py-24 text-center text-slate-400 flex flex-col items-center"><RefreshCw className="animate-spin mb-4 text-amber-500" size={40} /> <span className="font-black text-sm tracking-widest uppercase">Cargando movimientos...</span></div>
          ) : data.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center">
              <Layers className="text-slate-300 mb-4" size={48} />
              <div className="text-slate-500 font-black uppercase tracking-widest">No hay ingresos ni egresos aún en este turno</div>
            </div>
          ) : (
            <>
              {/* Tarjetas de Saldos Totales */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border-2 border-emerald-100 rounded-3xl p-6 flex justify-between items-center shadow-sm">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Neto (Ingresos - Egresos)</h3>
                    <p className="text-4xl font-black text-emerald-600 tracking-tighter">UYU {fmt(agrupado.saldoUYU)}</p>
                  </div>
                  <TrendingUp className="text-emerald-100" size={64} />
                </div>
                <div className="bg-white border-2 border-emerald-100 rounded-3xl p-6 flex justify-between items-center shadow-sm">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Neto (Ingresos - Egresos)</h3>
                    <p className="text-4xl font-black text-emerald-600 tracking-tighter">USD {fmt(agrupado.saldoUSD)}</p>
                  </div>
                  <TrendingUp className="text-emerald-100" size={64} />
                </div>
              </div>

              {/* Agrupaciones */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                 <h4 className="text-slate-800 font-black mb-5 flex items-center gap-2 tracking-tight text-lg"><FileText size={20} className="text-indigo-600"/> Agrupado por Medio de Pago</h4>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 uppercase text-[10px] tracking-widest border-b-2 border-slate-100">
                          <th className="pb-3 text-left font-black">Forma de Pago</th>
                          <th className="pb-3 text-right font-black">UYU (Entradas)</th>
                          <th className="pb-3 text-right font-black text-rose-500">UYU (Salidas)</th>
                          <th className="pb-3 text-right font-black text-slate-800 bg-slate-50 px-3 rounded-t-xl">Subtotal UYU</th>
                          <th className="pb-3 text-right font-black">USD (Entradas)</th>
                          <th className="pb-3 text-right font-black text-rose-500">USD (Salidas)</th>
                          <th className="pb-3 text-right font-black text-slate-800 bg-slate-50 px-3 rounded-t-xl">Subtotal USD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(agrupado.porForma).map(([kp, v], i) => (
                           <tr key={i} className="hover:bg-slate-50 transition-colors">
                             <td className="py-4 font-black text-indigo-700">{kp}</td>
                             <td className="py-4 text-right text-slate-600 font-mono font-bold text-[15px]">{fmt(v.UYU_in)}</td>
                             <td className="py-4 text-right text-rose-600 font-mono font-bold text-[15px]">{fmt(v.UYU_out)}</td>
                             <td className="py-4 text-right text-slate-800 font-black font-mono text-lg bg-slate-50 px-3">{fmt(v.UYU_in - v.UYU_out)}</td>
                             <td className="py-4 text-right text-slate-600 font-mono font-bold text-[15px]">{fmt(v.USD_in)}</td>
                             <td className="py-4 text-right text-rose-600 font-mono font-bold text-[15px]">{fmt(v.USD_out)}</td>
                             <td className="py-4 text-right text-slate-800 font-black font-mono text-lg bg-slate-50 px-3">{fmt(v.USD_in - v.USD_out)}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>

              {/* Detalle Cronológico */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 bg-slate-50 border-b border-slate-200">
                  <h4 className="text-slate-800 font-black flex items-center gap-2 tracking-tight text-lg">Detalle Analítico de Movimientos del Turno</h4>
                </div>
                 <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm border-b-2 border-slate-100">
                        <tr className="text-slate-400 uppercase text-[10px] tracking-widest">
                          <th className="p-4 px-6 text-left w-32 font-black">Fecha Hora</th>
                          <th className="p-4 text-center font-black">Tipo</th>
                          <th className="p-4 text-left font-black">Nº Comprobante / Doc</th>
                          <th className="p-4 text-left font-black">Rubro / Concepto</th>
                          <th className="p-4 text-left font-black">Forma Pago</th>
                          <th className="p-4 text-right font-black">Entrada</th>
                          <th className="p-4 px-6 text-right font-black text-rose-500">Salida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.map((m, i) => (
                          <tr key={i} className="hover:bg-slate-50 text-slate-700 transition-colors">
                             <td className="p-4 px-6 whitespace-nowrap text-xs text-slate-500 font-bold">{fmtDate(m.Fecha)}</td>
                             <td className="p-4 text-center">
                               {m.TipoOperacion === 'INGRESO' 
                                  ? <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md text-[10px] font-black border border-emerald-200 tracking-widest shadow-sm">INGRESO</span>
                                  : <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md text-[10px] font-black border border-rose-200 tracking-widest shadow-sm">EGRESO</span>
                               }
                             </td>
                             <td className="p-4 font-mono text-xs font-bold text-slate-500">{m.TipoComprobante} {m.Comprobante && m.Comprobante !== '-' ? <span className="text-indigo-600">{m.Comprobante}</span> : ''}</td>
                             <td className="p-4 font-bold text-slate-800">{m.Concepto}</td>
                             <td className="p-4 text-indigo-700 text-xs font-black">{m.MedioDePago}</td>
                             <td className="p-4 text-right font-black text-emerald-600 font-mono text-base">{m.Entrada > 0 ? `${m.Moneda} ${fmt(m.Entrada)}` : '-'}</td>
                             <td className="p-4 px-6 text-right font-black text-rose-600 font-mono text-base">{m.Salida > 0  ? `${m.Moneda} ${fmt(m.Salida)}`  : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CajaArqueoModal;
