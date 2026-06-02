import React, { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal bloqueante que aparece cuando se detecta una falla y existen órdenes
 * hermanas que ya estaban en "Canasto Produccion" y fueron movidas retroactivamente
 * a "Canasto Falla". El operador debe escribir CONFIRMO para continuar.
 *
 * Props:
 *   ordenes: string[]  — lista de CodigoOrden afectadas
 *   onConfirm: fn      — se llama cuando el operador confirma
 */
const ModalConfirmacionFalla = ({ ordenes = [], onConfirm }) => {
    const [texto, setTexto] = useState('');
    const PALABRA = 'CONFIRMO';
    const puedeConfirmar = texto.trim().toUpperCase() === PALABRA;

    if (!ordenes || ordenes.length === 0) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Overlay oscuro — NO cierra al hacer clic (es bloqueante) */}
            <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-orange-400 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-triangle-exclamation text-white text-lg" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-tight">
                                ⚠️ Falla detectada — Órdenes afectadas
                            </h2>
                            <p className="text-orange-100 text-xs mt-0.5">
                                Las siguientes órdenes fueron movidas al Canasto Falla
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cuerpo */}
                <div className="px-6 py-5 space-y-4">

                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-orange-800 mb-3">
                            <i className="fa-solid fa-box mr-2" />
                            Las siguientes órdenes ya estaban en <strong>Canasto Producción</strong> y fueron movidas automáticamente a <strong>Canasto Falla</strong>:
                        </p>
                        <ul className="space-y-1">
                            {ordenes.map((cod, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm font-mono font-bold text-orange-700 bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200">
                                    <i className="fa-solid fa-arrow-right text-xs text-orange-400" />
                                    {cod}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-amber-800 text-xs font-medium leading-relaxed">
                            <i className="fa-solid fa-hand text-amber-600 mr-1" />
                            <strong>Acción requerida:</strong> Debes ir físicamente al canasto de producción y mover {ordenes.length === 1 ? 'esta orden' : 'estas órdenes'} al canasto de fallas antes de continuar.
                        </p>
                    </div>

                    {/* Input de confirmación */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-600 uppercase mb-1.5 tracking-wide">
                            Escribí <span className="text-orange-600 font-black">{PALABRA}</span> para confirmar que realizaste la acción
                        </label>
                        <input
                            type="text"
                            className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm font-bold text-center tracking-widest transition-colors outline-none
                                ${puedeConfirmar
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                    : 'border-zinc-300 bg-white text-zinc-700 focus:border-orange-400'}`}
                            placeholder={`Escribí ${PALABRA}`}
                            value={texto}
                            onChange={e => setTexto(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5">
                    <button
                        disabled={!puedeConfirmar}
                        onClick={onConfirm}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200
                            ${puedeConfirmar
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-0.5'
                                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}
                    >
                        <i className={`fa-solid ${puedeConfirmar ? 'fa-check-circle' : 'fa-lock'} mr-2`} />
                        {puedeConfirmar ? 'Confirmar — Entendido' : `Escribí ${PALABRA} para habilitar`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ModalConfirmacionFalla;
