import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logisticsService } from '../../services/modules/logisticsService';

const DispatchView = () => {
    // STATE
    const [scannedLabel, setScannedLabel] = useState('');
    const [scannedItems, setScannedItems] = useState([]);

    const [originArea, setOriginArea] = useState('PRODUCCION');
    const [destArea, setDestArea] = useState('LOGISTICA_CENTRAL');
    const [remitoCode, setRemitoCode] = useState(`REM-${new Date().getFullYear()}${new Date().getMonth() + 1}${new Date().getDate()}-${Math.floor(Math.random() * 1000)}`); // Auto-gen mock

    // REFS for focus management
    const inputRef = useRef(null);

    // MUTATION: Create Dispatch/Remito
    const createDispatchMutation = useMutation({
        mutationFn: logisticsService.createDispatch,
        onSuccess: (data) => {
            alert(`✅ Remito Creado Exitosamente!\nID: ${data.envioId}\nCódigo: ${remitoCode}`);
            // Reset
            setScannedItems([]);
            setRemitoCode(`REM-${new Date().getFullYear()}${new Date().getMonth() + 1}${new Date().getDate()}-${Math.floor(Math.random() * 1000)}`);
        },
        onError: (err) => alert(`❌ Error al crear remito: ${err.message}`)
    });

    // EFFECT: Keep focus on scanner input
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, [scannedItems]);

    // HANDLER: Simulate Scanning (Enter key)
    const handleScan = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = scannedLabel.trim();
            if (!code) return;

            // Check duplicate
            if (scannedItems.find(item => item.code === code)) {
                alert("⚠️ Este bulto ya fue escaneado en esta lista.");
                setScannedLabel('');
                return;
            }

            // In a real app, we might want to fetch Bulto details here to validate it exists
            // For speed, let's assume valid or fetch async. 
            // We'll trust the user/scanner for now or add a validation query.
            validateAndAdd(code);
        }
    };

    const validateAndAdd = async (code) => {
        try {
            // Optional: Validate with backend before adding
            const bulto = await logisticsService.getBultoByLabel(code);

            setScannedItems(prev => [{
                id: bulto.BultoID, // Real ID from DB
                code: bulto.CodigoEtiqueta,
                desc: bulto.Descripcion || bulto.Tipocontenido,
                type: bulto.Tipocontenido,
                scannedAt: new Date()
            }, ...prev]);

            setScannedLabel(''); // Clear for next scan
        } catch (error) {
            console.error(error);
            // Fallback for demo if offline or not found (Optional)
            alert("❌ Bulto no encontrado o inválido");
            setScannedLabel('');
        }
    };

    const handleConfirmDispatch = () => {
        if (scannedItems.length === 0) {
            alert("⚠️ No hay bultos para despachar.");
            return;
        }

        if (!confirm(`¿Confirmar despacho de ${scannedItems.length} bultos hacia ${destArea}?`)) return;

        createDispatchMutation.mutate({
            codigoRemito: remitoCode,
            areaOrigen: originArea,
            areaDestino: destArea,
            usuarioId: 1, // TODO: Real User
            bultosIds: scannedItems.map(i => i.id)
        });
    };

    return (
        <div className="flex flex-col h-full p-6 space-y-6 max-w-6xl mx-auto">

            {/* 1. HEADER & CONFIG */}
            <div className="grid grid-cols-12 gap-6">

                {/* IZQUIERDA: CONFIGURACIÓN DESTINO */}
                <div className="col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Configuración del Envío</h2>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Código de Remito (Auto)</label>
                        <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-3 py-2">
                            <i className="fa-solid fa-barcode text-gray-400 mr-2"></i>
                            <input
                                className="bg-transparent w-full text-sm font-mono font-bold text-gray-700 outline-none"
                                value={remitoCode}
                                onChange={(e) => setRemitoCode(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Origen</label>
                            <select
                                value={originArea} onChange={e => setOriginArea(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="PRODUCCION">Producción</option>
                                <option value="CALIDAD">Calidad</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Destino</label>
                            <select
                                value={destArea} onChange={e => setDestArea(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="LOGISTICA_CENTRAL">Logística Central</option>
                                <option value="DESPACHO_CLIENTE">Cliente Final</option>
                                <option value="BORDADO">Taller Bordado</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* DERECHA: SCANNER AREA */}
                <div className="col-span-8 bg-indigo-600 rounded-xl shadow-lg text-white p-6 flex flex-col justify-center items-center relative overflow-hidden">
                    <i className="fa-solid fa-truck-fast absolute -right-6 -bottom-6 text-9xl text-indigo-500 opacity-50 transform -rotate-12"></i>

                    <h2 className="text-2xl font-bold mb-4 relative z-10">Escaneo de Carga</h2>
                    <div className="w-full max-w-md relative z-10">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full pl-12 pr-4 py-4 rounded-full bg-indigo-800/50 border-2 border-indigo-400 placeholder-indigo-300 text-white text-lg focus:outline-none focus:border-white focus:bg-indigo-700/80 transition-all font-mono shadow-inner"
                            placeholder="Pistolear Etiqueta Aquí..."
                            value={scannedLabel}
                            onChange={(e) => setScannedLabel(e.target.value)}
                            onKeyDown={handleScan}
                            autoFocus
                        />
                        <i className="fa-solid fa-qrcode absolute left-5 top-1/2 transform -translate-y-1/2 text-indigo-300 text-xl"></i>
                    </div>
                    <p className="mt-3 text-indigo-200 text-xs relative z-10">Presione ENTER después de escanear o use lector de códigos.</p>
                </div>
            </div>

            {/* 2. LISTA DE BULTOS (GRID) */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Contenido del Remito <span className="ml-2 bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{scannedItems.length} Bultos</span></h3>
                    {scannedItems.length > 0 && (
                        <button className="text-red-500 text-xs hover:underline" onClick={() => setScannedItems([])}>Limpiar Todo</button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {scannedItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            <i className="fa-solid fa-boxes-stacked text-5xl mb-3"></i>
                            <p>Esperando escaneo de bultos...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {scannedItems.map((item, idx) => (
                                <div key={idx} className="flex items-center p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all animate-fade-in-down">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${item.type === 'PROD_TERMINADO' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                                        <i className={`fa-solid ${item.type === 'PROD_TERMINADO' ? 'fa-shirt' : 'fa-box'}`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-800 text-sm truncate">{item.code}</div>
                                        <div className="text-xs text-gray-500 truncate">{item.desc}</div>
                                    </div>
                                    <button
                                        onClick={() => setScannedItems(items => items.filter((_, i) => i !== idx))}
                                        className="w-6 h-6 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors"
                                    >
                                        <i className="fa-solid fa-times text-xs"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={handleConfirmDispatch}
                        disabled={scannedItems.length === 0 || createDispatchMutation.isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center transition-all transform active:scale-95"
                    >
                        {createDispatchMutation.isLoading ? (
                            <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                        ) : (
                            <i className="fa-solid fa-paper-plane mr-2"></i>
                        )}
                        Confirmar y Generar Remito
                    </button>
                </div>
            </div>

        </div>
    );
};

export default DispatchView;
