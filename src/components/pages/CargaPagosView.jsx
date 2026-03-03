import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/apiClient';

export const CargaGestionPagosView = () => {
    const { user } = useAuth();
    const [retiros, setRetiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRetiro, setSelectedRetiro] = useState(null);
    const [formaPago, setFormaPago] = useState('');
    const [moneda, setMoneda] = useState('USD');
    const [monto, setMonto] = useState('');
    const [metodosPago, setMetodosPago] = useState([]);
    const [cotizacion, setCotizacion] = useState(39.85);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resRetiros, resMetodos, resCotiz] = await Promise.all([
                api.get('/web-retiros/caja-ordenes'),
                api.get('/web-retiros/metodos-pago'),
                api.get('/web-retiros/cotizacion')
            ]);

            const dataRetiros = Array.isArray(resRetiros.data) ? resRetiros.data : (Array.isArray(resRetiros) ? resRetiros : []);
            setRetiros(dataRetiros);

            // Si hay retiros, seleccionar el primero (u otro)
            if (dataRetiros.length > 0) {
                setSelectedRetiro(dataRetiros[0]);
            } else {
                setSelectedRetiro(null);
            }

            const dataMetodos = Array.isArray(resMetodos.data) ? resMetodos.data : (Array.isArray(resMetodos) ? resMetodos : []);
            setMetodosPago(dataMetodos);

            if (resCotiz.data && Array.isArray(resCotiz.data.cotizaciones) && resCotiz.data.cotizaciones.length > 0) {
                setCotizacion(resCotiz.data.cotizaciones[0].CotDolar || 39.85);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRealizarPago = async () => {
        if (!selectedRetiro) return alert("Seleccione una orden para pagar.");
        if (!formaPago) return alert("Seleccione un método de pago.");

        const importe = parseFloat(monto);
        if (isNaN(importe) || importe <= 0) {
            return alert("El importe del pago debe ser mayor que cero.");
        }

        try {
            const orderIds = getOrdenes(selectedRetiro).map(o => o.orderId);
            const monedaId = moneda === 'USD' ? 2 : 1;

            const res = await api.post('/web-retiros/pagar', {
                ordenRetiro: selectedRetiro.ordenDeRetiro,
                monto: importe,
                monedaId: monedaId,
                metodoPagoId: parseInt(formaPago),
                orderNumbers: orderIds
            });

            if (res.data && res.data.success) {
                alert("Pago guardado exitosamente.");
                setMonto('');
                setFormaPago('');
                fetchData(); // Refrescar lista
            } else {
                alert("No se pudo confirmar el pago.");
            }
        } catch (err) {
            console.error(err);
            alert("Error al procesar el pago.");
        }
    };

    const getOrdenes = (retiro) => {
        return retiro.ordenes || [];
    };

    const calcularTotalUSD = (retiro) => {
        if (!retiro) return 0;
        let totalVal = parseFloat(retiro.totalCost);
        // Si totalCost es NaN, evaluamos suma de ordenes
        if (isNaN(totalVal)) {
            totalVal = 0;
            const ordenes = getOrdenes(retiro);
            ordenes.forEach(o => {
                let cost = parseFloat(o.costoFinal);
                if (isNaN(cost)) cost = 0;

                // Si la moneda de la sub-orden es en pesos (id = 1), pasarlo a USD
                if (o.moneda && o.moneda.id === 1) {
                    cost = cost / cotizacion;
                }
                totalVal += cost;
            });
        }
        return totalVal;
    };

    const displayTotal = (retiro) => {
        const totalUsd = calcularTotalUSD(retiro);
        if (moneda === 'UYU') {
            return `UYU ${(totalUsd * cotizacion).toFixed(2)}`;
        }
        return `USD ${totalUsd.toFixed(2)}`;
    };

    const filteredRetiros = retiros.filter((retiro) => {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();

        // Buscar por orden de retiro (ej. R-60087)
        if (retiro.ordenDeRetiro && retiro.ordenDeRetiro.toLowerCase().includes(term)) {
            return true;
        }

        // Buscar por código o nombre de cliente en las sub-órdenes
        const ordenes = getOrdenes(retiro);
        for (let o of ordenes) {
            // Buscar por el Codigo de la sub-orden ("TWC-2113")
            if (o.codigoOrden && o.codigoOrden.toLowerCase().includes(term)) return true;

            // Buscar por datos del cliente
            if (o.cliente) {
                if (String(o.cliente.id).includes(term)) return true;
                if (o.cliente.codigo && o.cliente.codigo.toLowerCase().includes(term)) return true;
                if (o.cliente.nombreApellido && o.cliente.nombreApellido.toLowerCase().includes(term)) return true;
            }
        }

        return false;
    });

    if (loading && retiros.length === 0) {
        return <div className="p-8 text-center text-zinc-500">Cargando órdenes...</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 lg:p-10 font-sans border border-zinc-100 min-h-full">

            {/* Cabecera / Controles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-8">

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-zinc-800">Seleccionar forma de pago</label>
                    <select
                        className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-700 outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc] appearance-none"
                        value={formaPago}
                        onChange={(e) => setFormaPago(e.target.value)}
                    >
                        <option value="">Seleccione un método</option>
                        {metodosPago.map((m) => (
                            <option key={m.MPaIdMetodoPago} value={m.MPaIdMetodoPago}>
                                {m.MPaDescripcionMetodo}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-zinc-800">Seleccionar Moneda</label>
                    <select
                        className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-700 outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc] appearance-none"
                        value={moneda}
                        onChange={(e) => setMoneda(e.target.value)}
                    >
                        <option value="USD">USD</option>
                        <option value="UYU">UYU</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2 relative">
                    <label className="text-sm font-bold text-zinc-800">Ingrese Monto</label>
                    <input
                        type="number"
                        placeholder=""
                        className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-700 outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc]"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                    />
                </div>

            </div>

            <div className="flex justify-end mb-8">
                <button
                    onClick={handleRealizarPago}
                    className="bg-[#0070bc] hover:bg-[#005a99] text-white font-bold py-2.5 px-8 rounded-full shadow-md transition-transform hover:scale-105"
                >
                    Realizar Pago
                </button>
            </div>

            {/* Banner Cotización */}
            <div className="bg-[#eaf5ff] rounded-2xl py-6 flex flex-col items-center justify-center mb-10 border border-[#cbe5ff]">
                <h3 className="text-lg font-bold text-[#0070bc]">Cotización del Dólar:</h3>
                <p className="text-xl font-black text-zinc-800">1 USD = {cotizacion} UYU</p>
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* Lado Izquierdo: Órdenes para Pagar */}
                <div className="pr-0 lg:pr-10 lg:border-r border-zinc-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h3 className="text-lg font-bold text-zinc-800">Órdenes para Pagar</h3>
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Buscar por Orden o Cliente..."
                                className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-full text-sm focus:outline-none focus:border-[#0070bc] focus:ring-1 focus:ring-[#0070bc]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <i className="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400"></i>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2 pb-2 content-start">
                        {filteredRetiros.length === 0 ? (
                            <p className="text-zinc-500">No hay órdenes pendientes que coincidan con la búsqueda.</p>
                        ) : (
                            filteredRetiros.map((retiro) => {
                                const isSelected = selectedRetiro?.ordenDeRetiro === retiro.ordenDeRetiro;
                                return (
                                    <button
                                        key={retiro.ordenDeRetiro}
                                        onClick={() => setSelectedRetiro(retiro)}
                                        className={`
                                            px-6 py-2.5 rounded-full font-bold border-2 transition-all
                                            ${isSelected
                                                ? 'bg-[#0070bc] border-[#0070bc] text-white shadow-lg'
                                                : 'bg-white border-[#85c3f0] text-[#429fe5] hover:bg-[#eaf5ff]'
                                            }
                                        `}
                                    >
                                        {retiro.ordenDeRetiro}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Lado Derecho: Detalles de la Orden */}
                <div className="pl-0 lg:pl-4">
                    {selectedRetiro ? (
                        <div className="flex flex-col items-center lg:items-end text-center lg:text-right w-full">
                            <div className="flex flex-col lg:flex-row items-center lg:items-end gap-3 justify-end w-full">
                                <span className="text-sm bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full font-bold border border-zinc-200">
                                    En envío: {selectedRetiro.lugarRetiro || 'En local'}
                                </span>
                                <span className="text-sm bg-[#eaf5ff] text-[#0070bc] px-3 py-1 rounded-full font-bold border border-[#cbe5ff]">
                                    {selectedRetiro.estadoRetiro}
                                </span>
                            </div>

                            <h2 className="text-4xl font-black text-[#0070bc] mb-2 mt-4">
                                {selectedRetiro.ordenDeRetiro}
                            </h2>

                            {getOrdenes(selectedRetiro).length > 0 && getOrdenes(selectedRetiro)[0].cliente && (
                                <div className="text-sm text-zinc-600 font-medium mb-2">
                                    Cliente: <span className="font-bold text-zinc-800">{getOrdenes(selectedRetiro)[0].cliente.nombreApellido}</span>
                                    <span className="hidden lg:inline"> | </span><br className="lg:hidden" />
                                    ID: {getOrdenes(selectedRetiro)[0].cliente.id} | Cód: {getOrdenes(selectedRetiro)[0].cliente.codigo}
                                </div>
                            )}

                            <p className="text-[#0070bc] font-bold text-xl mb-8 mt-2">
                                Total a Cobrar: {displayTotal(selectedRetiro)}
                            </p>

                            <h3 className="text-lg font-bold text-zinc-800 mb-6 w-full lg:text-right">Órdenes de Pedido:</h3>
                            <div className="flex flex-col gap-4 w-full items-end">
                                {getOrdenes(selectedRetiro).length > 0 ? (
                                    getOrdenes(selectedRetiro).map((item, i) => {
                                        let finalCost = parseFloat(item.costoFinal);
                                        let curr = item.moneda?.simbolo || "$";
                                        let destTotal = "-";
                                        if (!isNaN(finalCost)) {
                                            destTotal = `Costo total: ${curr} ${finalCost.toFixed(2)}`;
                                            // Si la moneda original es $, y estamos mostrando algo en USD
                                            if (item.moneda?.id === 1) { // UYU
                                                destTotal += ` → USD ${(finalCost / cotizacion).toFixed(2)}`;
                                            }
                                        }

                                        return (
                                            <div
                                                key={i}
                                                className="w-full border-2 border-[#85c3f0] rounded-full px-6 py-3 font-bold text-[#0070bc] flex justify-between lg:gap-4 items-center bg-white"
                                            >
                                                <span>{item.codigoOrden || `Item ${i + 1}`}</span>
                                                <span className="hidden lg:inline">//</span>
                                                <span className="text-right">{destTotal}</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-zinc-500">No hay detalles de órdenes.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                            <p>Seleccione una orden para ver los detalles.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CargaGestionPagosView;
