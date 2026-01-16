import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { logisticsService } from '../../services/modules/logisticsService';

const ReceptionView = () => {
    // STATE
    const [mode, setMode] = useState('SCAN_REMITO'); // 'SCAN_REMITO' | 'CHECKING'
    const [remitoCode, setRemitoCode] = useState('');
    const [scanInput, setScanInput] = useState('');
    const [loadedRemito, setLoadedRemito] = useState(null);
    const [itemMap, setItemMap] = useState({}); // { 'CODE': { ...item, scanned: bool } }

    const inputRef = useRef(null);

    // 1. QUERY: Fetch Remito Details
    // Only enabled when we have a confirmed code to search
    const fetchRemito = async (code) => {
        try {
            const data = await logisticsService.getRemitoByCode(code);
            setLoadedRemito(data);

            // Build Quick Map for scanning O(1)
            // Backend returns items array
            const map = {};
            data.items.forEach(item => {
                map[item.CodigoEtiqueta] = {
                    ...item,
                    scanned: item.EstadoRecepcion === 'ESCANEADO' || item.EstadoRecepcion === 'RECIBIDO'
                };
            });
            setItemMap(map);
            setMode('CHECKING');
        } catch (err) {
            alert("❌ Remito no encontrado: " + err.message);
            setRemitoCode('');
        }
    };

    // 2. MUTATION: Reception Item
    const receiveItemMutation = useMutation({
        mutationFn: logisticsService.receiveBulto,
        onSuccess: (_, variables) => {
            // Update Local State Optimistically
            const code = variables.codigoEtiqueta;
            setItemMap(prev => ({
                ...prev,
                [code]: { ...prev[code], scanned: true }
            }));
            // Play OK Sound (Optional)
        },
        onError: (err) => {
            alert(`⚠️ Error al recepcionar: ${err.message}`);
        }
    });

    // EFFECT: Focus management
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, [mode, loadedRemito, scanInput]);

    // HANDLER: Master Scanner
    const handleScan = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = scanInput.trim();
            if (!code) return;

            if (mode === 'SCAN_REMITO') {
                // Assuming Remito codes have a prefix or specific format, or just accept any
                // If code starts with "REM-", it's likely a remito
                fetchRemito(code);
                setRemitoCode(code);
            }
            else if (mode === 'CHECKING') {
                // Check against loaded map
                if (itemMap[code]) {
                    if (itemMap[code].scanned) {
                        alert("⚠️ Ya escaneado: " + code);
                    } else {
                        // Valid Item -> Call Backend
                        receiveItemMutation.mutate({
                            envioId: loadedRemito.EnvioID,
                            codigoEtiqueta: code,
                            usuarioId: 1 // TODO: User
                        });
                    }
                } else {
                    // Item WRONG (No pertenece al remito)
                    alert("⛔ ALERTA: Este bulto NO pertenece a este remito!\nCódigo: " + code);
                }
            }
            setScanInput('');
        }
    };

    const getProgress = () => {
        if (!itemMap || Object.keys(itemMap).length === 0) return 0;
        const total = Object.keys(itemMap).length;
        const scanned = Object.values(itemMap).filter(i => i.scanned).length;
        return Math.round((scanned / total) * 100);
    };

    const handleReset = () => {
        setMode('SCAN_REMITO');
        setLoadedRemito(null);
        setItemMap({});
        setRemitoCode('');
        setScanInput('');
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 max-w-6xl mx-auto space-y-6">

            {/* TOP BAR / SCANNER */}
            <div className={`rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${mode === 'SCAN_REMITO' ? 'bg-indigo-600 text-white p-10 text-center' : 'bg-white border text-left p-4 flex items-center justify-between'}`}>

                {mode === 'SCAN_REMITO' ? (
                    <div>
                        <i className="fa-solid fa-qrcode text-6xl mb-4 text-indigo-300"></i>
                        <h2 className="text-3xl font-bold mb-2">Recepción de Mercadería</h2>
                        <p className="text-indigo-200 mb-8">Escanee el código QR del REMITO para comenzar la descarga.</p>

                        <div className="max-w-md mx-auto relative">
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-12 pr-4 py-4 rounded-full bg-indigo-800/50 border-2 border-indigo-400 text-white text-xl placeholder-indigo-300 focus:bg-indigo-900 focus:outline-none focus:border-white transition-all font-mono text-center"
                                placeholder="Escanear Remito..."
                                value={scanInput}
                                onChange={e => setScanInput(e.target.value)}
                                onKeyDown={handleScan}
                                autoFocus
                            />
                            <i className="fa-solid fa-barcode absolute left-5 top-1/2 transform -translate-y-1/2 text-indigo-300 text-xl"></i>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                                <i className="fa-solid fa-truck-ramp-box text-2xl"></i>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Remito en Proceso</div>
                                <h2 className="text-2xl font-bold text-gray-800 font-mono">{remitoCode}</h2>
                                <div className="text-xs text-gray-500">Origen: <span className="font-semibold">{loadedRemito?.AreaOrigenID}</span></div>
                            </div>
                        </div>

                        {/* MINI SCANNER FOR ITEMS */}
                        <div className="flex-1 max-w-lg mx-6 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-indigo-100 bg-indigo-50/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-mono font-bold text-gray-700 uppercase"
                                placeholder="Escanear Bulto..."
                                value={scanInput}
                                onChange={e => setScanInput(e.target.value)}
                                onKeyDown={handleScan}
                            />
                            <div className="absolute right-3 top-3 text-xs font-bold text-gray-400 uppercase pointer-events-none">
                                {receiveItemMutation.isLoading ? <i className="fa-solid fa-spinner fa-spin text-indigo-500"></i> : 'LISTO'}
                            </div>
                            <i className="fa-solid fa-barcode absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        </div>

                        <button onClick={handleReset} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded transition-colors text-sm font-semibold">
                            <i className="fa-solid fa-times mr-1"></i> Cerrar
                        </button>
                    </>
                )}
            </div>

            {/* CHECKING LIST GRID */}
            {mode === 'CHECKING' && (
                <div className="flex-1 flex flex-col space-y-4">

                    {/* PROGRESS BAR */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-end mb-2">
                            <span className="font-bold text-gray-700">Progreso de Descarga</span>
                            <span className="text-2xl font-bold text-indigo-600">{getProgress()}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${getProgress()}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* ITEMS GRID */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Object.values(itemMap).map((item) => (
                                <div
                                    key={item.CodigoEtiqueta}
                                    className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${item.scanned ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-gray-50 opacity-80'}`}
                                >
                                    {item.scanned && (
                                        <div className="absolute -top-3 -right-3 bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md animate-bounce">
                                            <i className="fa-solid fa-check"></i>
                                        </div>
                                    )}

                                    <div className="flex items-center mb-2">
                                        <i className={`fa-solid ${item.Tipocontenido === 'PROD_TERMINADO' ? 'fa-shirt' : 'fa-box'} mr-2 ${item.scanned ? 'text-green-600' : 'text-gray-400'}`}></i>
                                        <span className={`font-mono font-bold text-sm ${item.scanned ? 'text-green-800' : 'text-gray-500'}`}>{item.CodigoEtiqueta}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2">{item.Descripcion}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {getProgress() === 100 && (
                        <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-lg text-center animate-pulse">
                            <i className="fa-solid fa-check-double text-2xl mb-2 block"></i>
                            <span className="font-bold text-lg">Recepción Completa</span>
                            <p className="text-sm">Todo el contenido del remito ha sido verificado.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReceptionView;
