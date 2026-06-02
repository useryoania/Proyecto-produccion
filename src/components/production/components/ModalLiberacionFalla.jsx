import React, { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal bloqueante que aparece cuando TODAS las órdenes del pedido (incluida la
 * reposición de la falla) están en estado OK. El sistema moverá automáticamente
 * las órdenes del Canasto Falla al Canasto Producción después del CONFIRMO,
 * y registrará la acción en auditoría.
 *
 * Props:
 *   ordenes: string[]  — lista de CodigoOrden que pasarán a Canasto Produccion
 *   onConfirm: fn      — se llama cuando el operador confirma (el sistema hace el UPDATE)
 *   loading: bool      — mientras se ejecuta el endpoint
 */
const ModalLiberacionFalla = ({ ordenes = [], onConfirm, loading = false }) => {
    const [texto, setTexto] = useState('');
    const PALABRA = 'CONFIRMO';
    const puedeConfirmar = texto.trim().toUpperCase() === PALABRA;

    if (!ordenes || ordenes.length === 0) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Overlay — NO cierra al hacer clic */}
            <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-emerald-400 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-circle-check text-white text-lg" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-tight">
                                ✅ Pedido completamente resuelto
                            </h2>
                            <p className="text-emerald-100 text-xs mt-0.5">
                                Todas las órdenes y reposiciones están OK
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cuerpo */}
                <div className="px-6 py-5 space-y-4">

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-emerald-800 mb-3">
                            <i className="fa-solid fa-boxes-stacked mr-2" />
                            Las siguientes órdenes pasarán automáticamente del <strong>Canasto Falla</strong> al <strong>Canasto Producción</strong>:
                        </p>
                        <ul className="space-y-1">
                            {ordenes.map((cod, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm font-mono font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200">
                                    <i className="fa-solid fa-arrow-right text-xs text-emerald-400" />
                                    {cod}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-blue-800 text-xs font-medium leading-relaxed">
                            <i className="fa-solid fa-info-circle text-blue-600 mr-1" />
                            Al confirmar, el sistema actualizará el estado logístico automáticamente y registrará la acción en auditoría.
                        </p>
                    </div>

                    {/* Input de confirmación */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-600 uppercase mb-1.5 tracking-wide">
                            Escribí <span className="text-emerald-600 font-black">{PALABRA}</span> para liberar las órdenes
                        </label>
                        <input
                            type="text"
                            className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm font-bold text-center tracking-widest transition-colors outline-none
                                ${puedeConfirmar
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                    : 'border-zinc-300 bg-white text-zinc-700 focus:border-emerald-400'}`}
                            placeholder={`Escribí ${PALABRA}`}
                            value={texto}
                            onChange={e => setTexto(e.target.value)}
                            autoFocus
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5">
                    <button
                        disabled={!puedeConfirmar || loading}
                        onClick={onConfirm}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200
                            ${puedeConfirmar && !loading
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5'
                                : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}
                    >
                        {loading
                            ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Procesando...</>
                            : puedeConfirmar
                                ? <><i className="fa-solid fa-check-circle mr-2" />Confirmar — Mover a Canasto Producción</>
                                : <><i className="fa-solid fa-lock mr-2" />Escribí {PALABRA} para habilitar</>
                        }
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ModalLiberacionFalla;
