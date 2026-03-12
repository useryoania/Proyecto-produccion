import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import Lottie from 'lottie-react';
import loadingAnim from '../../assets/animations/loading.json';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/apiClient'; // Assuming user comes from here
import { CheckCircle, AlertCircle, ChevronRight, Truck, CreditCard, Download, MapPin, MapPinCheck, Package, PackageCheck, Trash2, Plus, ArrowLeft } from 'lucide-react';

import { CustomButton } from '../pautas/CustomButton';
import { CustomSelect } from '../pautas/CustomSelect';
import { FormInput } from '../pautas/FormInput';

export const PickupView = () => {
    const { user } = useAuth();
    const [selectedOrders, setSelectedOrders] = useState(() => {
        try {
            const saved = sessionStorage.getItem('pickup_selected');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [readyOrders, setReadyOrders] = useState([]);
    const [pickupCode, setPickupCode] = useState(() => {
        return sessionStorage.getItem('pickup_code') || null;
    });
    const [searchParams, setSearchParams] = useSearchParams();
    const step = searchParams.get('step') || 'selection';
    const setStep = (newStep) => {
        if (newStep === 'selection') {
            searchParams.delete('step');
        } else {
            searchParams.set('step', newStep);
        }
        setSearchParams(searchParams, { replace: true });
    };
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [confirmedWithoutPayment, setConfirmedWithoutPayment] = useState(false);

    // Shipping/confirmation state
    const [shippingData, setShippingData] = useState(null);
    const [selectedFormaEnvio, setSelectedFormaEnvio] = useState(null);
    const [selectedAgencia, setSelectedAgencia] = useState(null);
    const [selectedDireccion, setSelectedDireccion] = useState('');
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [newAlias, setNewAlias] = useState('');
    const [newDireccion, setNewDireccion] = useState('');
    const [newCiudad, setNewCiudad] = useState('');
    const [newLocalidad, setNewLocalidad] = useState('');
    const [loadingShipping, setLoadingShipping] = useState(false);
    const addAddressRef = useRef(null);

    useEffect(() => {
        const loadPickupOrders = async () => {
            setFetching(true);
            try {
                const res = await apiClient.get('/web-orders/pickup-orders');
                if (res.success) {
                    setReadyOrders(res.data);
                    // Limpiar seleccionadas que ya no existen
                    const validIds = new Set(res.data.map(o => o.id));
                    setSelectedOrders(prev => {
                        const filtered = prev.filter(id => validIds.has(id));
                        if (filtered.length !== prev.length) {
                            sessionStorage.setItem('pickup_selected', JSON.stringify(filtered));
                        }
                        return filtered;
                    });
                }
            } catch (error) {
                console.error("Error loading pickup orders:", error);
            } finally {
                setFetching(false);
            }
        };
        loadPickupOrders();
    }, []);

    // Persist selected orders in sessionStorage
    useEffect(() => {
        sessionStorage.setItem('pickup_selected', JSON.stringify(selectedOrders));
    }, [selectedOrders]);

    // Auto-load shipping data when on confirmation step (e.g. after refresh)
    useEffect(() => {
        if (step === 'confirmation' && !shippingData) {
            (async () => {
                setLoadingShipping(true);
                try {
                    const res = await apiClient.get('/web-orders/shipping-data');
                    if (res.success) {
                        setShippingData(res.data);
                        setSelectedFormaEnvio(res.data.defaultFormaEnvioID || res.data.formasEnvio[0]?.ID);
                        setSelectedAgencia(res.data.defaultAgenciaID || res.data.agencias[0]?.ID);
                        setSelectedDireccion(res.data.defaultDireccion || '');
                    }
                } catch (e) { console.error('Error cargando datos de envío:', e); }
                setLoadingShipping(false);
            })();
        }
    }, [step]);

    const handleToggleOrder = (orderId) => {
        if (selectedOrders.includes(orderId)) {
            setSelectedOrders(selectedOrders.filter(id => id !== orderId));
        } else {
            // Verificar que no se mezclen monedas
            const orderToAdd = readyOrders.find(o => o.id === orderId);
            if (orderToAdd && selectedOrders.length > 0) {
                const firstSelected = readyOrders.find(o => o.id === selectedOrders[0]);
                if (firstSelected && orderToAdd.currency !== firstSelected.currency) {
                    alert("⚠️ No es posible mezclar pagos en Dólares y Pesos Uruguayos en una misma transacción.\n\nPor favor, selecciona únicamente órdenes que compartan la misma moneda (ej: solo Dólares o solo Pesos) para poder redirigirte a la pasarela.");
                    return; // Bloquea la selección mixta
                }
            }
            setSelectedOrders([...selectedOrders, orderId]);
        }
    };

    const totalAmount = readyOrders
        .filter(o => selectedOrders.includes(o.id))
        .reduce((sum, o) => sum + (o.isPaid ? 0 : o.amount), 0);

    const activeCurrency = selectedOrders.length > 0
        ? readyOrders.find(o => o.id === selectedOrders[0])?.currency || '$'
        : '$';

    const downloadReceipt = async (code) => {
        try {
            const token = localStorage.getItem('auth_token');
            const ordersToPrint = readyOrders.filter(o => selectedOrders.includes(o.id));
            const total = ordersToPrint.reduce((sum, o) => sum + o.amount, 0).toFixed(2);

            const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

            const response = await fetch(`${API_URL}/web-orders/pickup-orders/pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiptId: code || pickupCode,
                    orders: ordersToPrint,
                    clientName: user?.name,
                    total: total
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `retiro-${code || pickupCode}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } else {
                console.error("Error generating PDF");
            }
        } catch (error) {
            console.error("Download error:", error);
        }
    };

    const handleCreatePickup = async () => {
        setLoading(true);
        try {
            const ordersPayload = selectedOrders.map(selId => {
                const order = readyOrders.find(o => o.id === selId);
                if (!order) return null;
                const orderNum = order.id.replace('#', '');
                return {
                    OrdIdOrden: order.rawId,
                    orderNumber: orderNum,
                    ordNombreTrabajo: order.desc.split(' - ').pop() || order.desc,
                    meters: String(order.quantityStr || ""),
                    MonSimbolo: order.currency === 'USD' ? 'USD' : '$',
                    costo: Number(Number(order.amount || 0).toFixed(2)),
                    estado: order.originalStatus,
                    tipodecliente: order.clientType || "Comun",
                    pago: order.isPaid ? 'Pagado' : 'No realizado',
                    checked: true,
                    clientId: order.clientId || 'N/A',
                    contact: order.contact || '',
                    costWithCurrency: `${order.currency === 'USD' ? 'USD' : '$'} ${typeof order.amount === 'number' ? order.amount.toFixed(2) : '0.00'}`
                };
            }).filter(Boolean);

            const formaEnvioId = selectedFormaEnvio || shippingData?.defaultFormaEnvioID || 5;
            const esEncomienda = shippingData?.formasEnvio?.find(f => f.ID === formaEnvioId)?.Nombre?.toLowerCase().includes('encomienda');

            const payload = {
                orders: ordersPayload,
                totalCost: Number((totalAmount || 0).toFixed(2)),
                lugarRetiro: esEncomienda ? 2 : 1
            };

            const res = await apiClient.post('/web-orders/pickup-orders/create', payload);

            if (res.success) {
                const code = res.data?.OReIdOrdenRetiro || res.data?.codigoRetiro || `RET-${Math.floor(Math.random() * 9000) + 1000}`;
                setPickupCode(code);
                sessionStorage.setItem('pickup_code', String(code));
                return code;
            } else {
                alert(res.error || "Error al crear retiro");
                return null;
            }
        } catch (error) {
            console.error(error);
            alert("Error al conectar con el servidor: " + error.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Guardar datos de envío en el retiro
    const saveShippingData = async (code) => {
        const retiroId = code || pickupCode;
        if (!retiroId) return;

        const formaEnvioId = selectedFormaEnvio || shippingData?.defaultFormaEnvioID;
        const esEncomienda = shippingData?.formasEnvio?.find(f => f.ID === formaEnvioId)?.Nombre?.toLowerCase().includes('encomienda');

        // Resolver departamento y localidad desde la dirección seleccionada
        let dir = selectedDireccion || '';
        let depto = '';
        let loc = '';
        const savedDir = shippingData?.direccionesGuardadas?.find(d => d.Direccion === selectedDireccion);
        if (savedDir) {
            depto = savedDir.Ciudad || '';
            loc = savedDir.Localidad || '';
        }

        try {
            await apiClient.patch(`/web-orders/pickup-orders/${retiroId}/shipping`, {
                lugarRetiro: esEncomienda ? 2 : 1,
                agenciaId: esEncomienda ? selectedAgencia : null,
                direccion: esEncomienda ? dir : null,
                departamento: esEncomienda ? depto : null,
                localidad: esEncomienda ? loc : null
            });
        } catch (e) {
            console.error('Error guardando datos de envío:', e);
        }
    };

    const handleProceed = async () => {
        // Flujo Handy: crear link de pago con datos del retiro ya creado
        if (!pickupCode) {
            alert('No hay retiro creado.');
            return;
        }
        setLoading(true);
        try {
            // Guardar datos de envío antes de ir a pagar
            await saveShippingData();

            const ordersPayload = selectedOrders.map(selId => {
                const order = readyOrders.find(o => o.id === selId);
                if (!order) return null;
                return {
                    id: order.id,
                    rawId: order.rawId,
                    orderNumber: order.id.replace('#', ''),
                    desc: order.desc,
                    amount: order.amount,
                };
            }).filter(Boolean);

            const payload = {
                ordenRetiro: pickupCode,
                totalAmount: totalAmount,
                activeCurrency: activeCurrency,
                bultosJSON: JSON.stringify(ordersPayload)
            };

            const res = await apiClient.post('/web-retiros/payment', payload);

            if (res.success && res.url) {
                window.open(res.url, '_blank');
                window.location.href = `/portal/payment-status?txId=${res.transactionId}`;
            } else {
                alert("No se pudo generar el link de pago: " + (res.error || ""));
            }
        } catch (err) {
            console.error("Error al ir a pagar:", err);
            alert("Ocurrió un error al contactar la pasarela de pagos.");
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = (e) => {
        e.preventDefault();
        handleCreatePickup();
    };

    if (step === 'success') {
        return (
            <div className="animate-fade-in flex flex-col min-h-[80vh]">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <CheckCircle size={48} strokeWidth={1} className="text-green-400" />
                    <div>
                        <h2 className="text-3xl font-bold text-zinc-300 uppercase tracking-tight">
                            Retiro <span className="text-custom-cyan">RW-{pickupCode}</span>
                        </h2>
                        <p className="text-zinc-500 uppercase text-sm">
                            {confirmedWithoutPayment ? 'Creado — Pendiente de pago' : 'Habilitado'}
                        </p>
                    </div>
                </div>

                {/* Código de retiro — centrado */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="max-w-xs w-full rounded-xl bg-brand-dark border border-zinc-700 p-6 text-center">
                        <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Código de Retiro</p>
                        <p className="text-3xl font-mono font-black text-custom-cyan tracking-widest">RW-{pickupCode}</p>
                    </div>

                    <p className="text-zinc-500 text-sm text-center max-w-sm">
                        {confirmedWithoutPayment
                            ? 'Tu retiro ha sido registrado y está pendiente de pago. Podés abonar en mostrador o desde la sección de pagos pendientes.'
                            : user?.hasCredit
                                ? 'El importe ha sido cargado a tu Cuenta Corriente. Ya puedes pasar por el mostrador de entregas.'
                                : 'El pago se ha procesado correctamente. Ya puedes pasar por el mostrador de entregas.'
                        }
                    </p>
                </div>

                {/* Botones */}
                <div className="flex justify-between items-center">
                    <CustomButton
                        onClick={() => downloadReceipt(pickupCode)}
                        variant="secondary"
                        icon={Download}
                        className="py-3 px-6 !bg-transparent !text-zinc-100 !shadow-none border border-zinc-800 hover:!border-zinc-600 hover:!bg-brand-dark/50"
                        whileHover={{ scale: 1 }}
                        whileTap={{ scale: 1 }}
                    >
                        Descargar Comprobante
                    </CustomButton>

                    <CustomButton
                        onClick={() => { setStep('selection'); setSelectedOrders([]); setConfirmedWithoutPayment(false); }}
                        variant="secondary"
                        icon={ArrowLeft}
                        className="py-3 px-6 !bg-transparent !text-zinc-100 !shadow-none border border-brand-cyan/40 hover:!border-brand-cyan hover:!bg-brand-cyan/5"
                        whileHover={{ scale: 1 }}
                        whileTap={{ scale: 1 }}
                    >
                        Volver a retiros
                    </CustomButton>
                </div>
            </div>
        );
    }

    if (fetching) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh]">
                <Lottie animationData={loadingAnim} loop style={{ width: 250, height: 250 }} />
                <span className="font-bold uppercase -mt-20 animate-pulse">Buscando órdenes listas...</span>
            </div>
        );
    }

    // ========================
    // STEP: CONFIRMATION
    // ========================
    const selectedOrdersData = readyOrders.filter(o => selectedOrders.includes(o.id));
    const isEncomienda = shippingData?.formasEnvio?.find(f => f.ID === selectedFormaEnvio)?.Nombre?.toLowerCase().includes('encomienda');

    const handleAddAddress = async () => {
        if (!newDireccion.trim()) return;
        try {
            const res = await apiClient.post('/web-orders/saved-addresses', {
                alias: newAlias.trim(),
                direccion: newDireccion.trim(),
                agenciaID: selectedAgencia,
                ciudad: newCiudad.trim(),
                localidad: newLocalidad.trim()
            });
            if (res.success) {
                setShippingData(prev => ({
                    ...prev,
                    direccionesGuardadas: [...(prev.direccionesGuardadas || []), res.data]
                }));
                setSelectedDireccion(res.data.Direccion);
                setNewAlias('');
                setNewDireccion('');
                setNewCiudad('');
                setNewLocalidad('');
                setShowAddAddress(false);
            } else {
                alert(res.error || 'Error al guardar');
            }
        } catch (e) { alert('Error al guardar dirección'); }
    };

    const handleDeleteAddress = async (id) => {
        const result = await Swal.fire({
            title: '¿Eliminar dirección?',
            text: 'Se quitará de tu lista. Podés volver a agregarla más tarde.',
            background: '#212121',
            color: '#e4e4e7',
            showCancelButton: true,
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#3f3f46',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-xl border border-zinc-700',
                title: '!text-lg !font-bold',
                htmlContainer: '!text-sm !text-zinc-400',
            }
        });
        if (!result.isConfirmed) return;
        try {
            const res = await apiClient.delete(`/web-orders/saved-addresses/${id}`);
            if (res.success) {
                setShippingData(prev => ({
                    ...prev,
                    direccionesGuardadas: prev.direccionesGuardadas.filter(d => d.ID !== id)
                }));
            }
        } catch (e) { console.error(e); }
    };

    if (step === 'confirmation') return (
        <div className="animate-fade-in space-y-6">
            <button onClick={() => { setSelectedOrders([]); sessionStorage.removeItem('pickup_selected'); setStep('selection'); }} className="mb-2 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors">
                <ChevronRight className="rotate-180" size={20} /> Volver
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <PackageCheck size={48} strokeWidth={1} className="text-brand-gold" />
                <div>
                    <h2 className="text-3xl font-bold text-zinc-300 uppercase tracking-tight">Retiro <span className="text-custom-cyan">RW-{pickupCode}</span></h2>
                    <p className="text-zinc-500 uppercase text-sm">Revisá los datos y elegí forma de envío.</p>
                </div>
            </div>

            {/* Resumen de órdenes */}
            <div className="overflow-hidden rounded-xl shadow-lg shadow-black/20">
                <div className="p-5 border-b border-zinc-700 bg-custom-dark">
                    <h3 className="font-bold text-zinc-100 uppercase text-xs tracking-wider">Órdenes Seleccionadas</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                    {selectedOrdersData.map(o => (
                        <div key={o.id} className="p-4 flex justify-between items-center bg-brand-dark">
                            <div>
                                <span className="font-mono font-bold text-sm text-zinc-100">{o.id}</span>
                                <p className="text-sm text-zinc-400 mt-0.5">{o.desc}</p>
                            </div>
                            <span className="font-bold text-custom-cyan">
                                {o.currency === 'USD' ? 'US$' : '$'} {(o.amount || 0).toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="p-5 border-t border-zinc-700 bg-custom-dark flex justify-between items-center">
                    <span className="font-bold text-zinc-500 uppercase text-sm">Total</span>
                    <span className="text-2xl font-black text-zinc-100">
                        {activeCurrency === 'USD' ? 'US$' : '$'} {(totalAmount || 0).toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Forma de envío */}
            {shippingData && (
                <div className="space-y-5 p-6 rounded-xl bg-custom-dark shadow-lg shadow-black/20">
                    <h3 className="font-bold text-zinc-100 flex items-center gap-2 uppercase text-xs tracking-wider">
                        <Truck size={24} strokeWidth={2} className="text-brand-gold" /> Forma de Envío
                    </h3>

                    <CustomSelect
                        value={selectedFormaEnvio}
                        onChange={(val) => setSelectedFormaEnvio(Number(val))}
                        options={shippingData.formasEnvio.map(f => ({ value: f.ID, label: f.Nombre }))}
                        placeholder="Seleccionar forma de envío..."
                    />

                    {/* Si es encomienda: agencia + dirección */}
                    {isEncomienda && (
                        <div className="space-y-4 pt-2">
                            {/* Agencia */}
                            <div>
                                <label className="block text-sm font-bold text-zinc-500 mb-2 uppercase">Agencia</label>
                                <CustomSelect
                                    value={selectedAgencia}
                                    onChange={(val) => setSelectedAgencia(Number(val))}
                                    options={shippingData.agencias.map(a => ({ value: a.ID, label: a.Nombre }))}
                                    placeholder="Seleccionar agencia..."
                                />
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="block text-sm font-bold text-zinc-500 mb-2 uppercase">Dirección de Envío <span className="text-zinc-600 font-normal">({(shippingData.direccionesGuardadas?.length || 0) + (shippingData.defaultDireccion ? 1 : 0)}/3)</span></label>
                                {(shippingData.defaultDireccion || shippingData.direccionesGuardadas?.length > 0) ? (
                                    <div className="space-y-2">
                                        {/* Dirección principal */}
                                        {shippingData.defaultDireccion && (
                                            <label
                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedDireccion === shippingData.defaultDireccion ? 'border-brand-cyan/40 bg-brand-cyan/5' : 'border-zinc-700 hover:border-zinc-500'}`}
                                                onClick={() => setSelectedDireccion(shippingData.defaultDireccion)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {selectedDireccion === shippingData.defaultDireccion
                                                        ? <MapPinCheck size={24} strokeWidth={1.5} className="flex-shrink-0 text-custom-cyan" />
                                                        : <MapPin size={24} strokeWidth={1.5} className="flex-shrink-0 text-zinc-500" />
                                                    }
                                                    <div className="flex flex-col justify-center">
                                                        <span className="text-sm font-bold text-zinc-200">Principal</span>
                                                        <p className="text-sm text-zinc-400">{shippingData.defaultDireccion}</p>
                                                    </div>
                                                </div>
                                            </label>
                                        )}

                                        {/* Direcciones guardadas */}
                                        {shippingData.direccionesGuardadas?.map((d, idx) => (
                                            <div
                                                key={d.ID}
                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedDireccion === d.Direccion ? 'border-brand-cyan/40 bg-brand-cyan/5' : 'border-zinc-700 hover:border-zinc-500'}`}
                                                onClick={() => setSelectedDireccion(d.Direccion)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {selectedDireccion === d.Direccion
                                                        ? <MapPinCheck size={24} strokeWidth={1.5} className="flex-shrink-0 text-custom-cyan" />
                                                        : <MapPin size={24} strokeWidth={1.5} className="flex-shrink-0 text-zinc-500" />
                                                    }
                                                    <div className="flex flex-col justify-center">
                                                        <span className="text-sm font-bold text-zinc-200">{d.Alias || 'Dirección guardada'}</span>
                                                        <p className="text-sm text-zinc-400">
                                                            {d.Direccion}
                                                            {d.Ciudad ? `, ${d.Ciudad}` : ''}
                                                            {d.Localidad ? ` (${d.Localidad})` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                {(idx > 0 || shippingData.defaultDireccion) && (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteAddress(d.ID); }}
                                                        className="text-zinc-600 hover:text-brand-magenta transition-colors p-1"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-500 italic">No tenés direcciones guardadas. Agregá una abajo.</p>
                                )}
                            </div>

                            {/* Agregar nueva dirección */}
                            {((shippingData.direccionesGuardadas?.length || 0) + (shippingData.defaultDireccion ? 1 : 0)) < 3 && (
                                <div>
                                    {!showAddAddress ? (
                                        <button
                                            onClick={() => { setShowAddAddress(true); setTimeout(() => addAddressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }}
                                            className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            <Plus size={16} /> Agregar nueva dirección
                                        </button>
                                    ) : (
                                        <div ref={addAddressRef} className="space-y-3 p-4 bg-custom-dark rounded-xl border border-zinc-700">
                                            <input
                                                type="text"
                                                placeholder='Alias (ej: "Oficina")'
                                                value={newAlias}
                                                onChange={e => setNewAlias(e.target.value)}
                                                className="w-full p-2.5 border border-zinc-700 rounded-lg text-sm bg-brand-dark text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-cyan/30"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Dirección completa"
                                                value={newDireccion}
                                                onChange={e => setNewDireccion(e.target.value)}
                                                className="w-full p-2.5 border border-zinc-700 rounded-lg text-sm bg-brand-dark text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-cyan/30"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <CustomSelect
                                                    value={newCiudad}
                                                    onChange={(val) => {
                                                        setNewCiudad(val);
                                                        // Auto-seleccionar si hay una sola localidad
                                                        const dept = shippingData.departamentos?.find(d => d.Nombre === val);
                                                        const locs = dept ? shippingData.localidades?.filter(l => l.DepartamentoID === dept.ID) : [];
                                                        setNewLocalidad(locs?.length === 1 ? locs[0].Nombre : '');
                                                    }}
                                                    options={[
                                                        { value: '', label: 'Departamento...' },
                                                        ...(shippingData.departamentos?.map(d => ({ value: d.Nombre, label: d.Nombre })) || [])
                                                    ]}
                                                    placeholder="Departamento..."
                                                    size="small"
                                                    direction="up"
                                                />
                                                <CustomSelect
                                                    value={newLocalidad}
                                                    onChange={(val) => setNewLocalidad(val)}
                                                    options={[
                                                        { value: '', label: 'Localidad...' },
                                                        ...(() => {
                                                            const dept = shippingData.departamentos?.find(d => d.Nombre === newCiudad);
                                                            if (!dept) return [];
                                                            return shippingData.localidades?.filter(l => l.DepartamentoID === dept.ID).map(l => ({ value: l.Nombre, label: l.Nombre })) || [];
                                                        })()
                                                    ]}
                                                    placeholder="Localidad..."
                                                    size="small"
                                                    direction="up"
                                                    disabled={!newCiudad}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <CustomButton onClick={handleAddAddress} variant="primary" className="text-sm py-2 px-4 !bg-transparent !text-zinc-100 !shadow-none border border-zinc-800 hover:!border-brand-cyan/40 hover:!bg-brand-cyan/5" whileHover={{ scale: 1 }} whileTap={{ scale: 1 }}>
                                                    Guardar
                                                </CustomButton>
                                                <button onClick={() => { setShowAddAddress(false); setNewAlias(''); setNewDireccion(''); setNewCiudad(''); setNewLocalidad(''); }} className="text-sm text-zinc-500 hover:text-zinc-300">
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Botones finales */}
            <div className="flex justify-between items-center">
                <CustomButton
                    onClick={async () => {
                        await saveShippingData();
                        downloadReceipt(pickupCode);
                    }}
                    variant="secondary"
                    icon={Download}
                    className="py-3 px-6 !bg-transparent !text-zinc-100 !shadow-none border border-zinc-800 hover:!border-zinc-600 hover:!bg-brand-dark/50"
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 1 }}
                >
                    Descargar Comprobante
                </CustomButton>

                <div className="flex items-center gap-3">
                    <CustomButton
                        onClick={async () => {
                            setLoading(true);
                            try {
                                await saveShippingData();
                                setConfirmedWithoutPayment(true);
                                setStep('success');
                                sessionStorage.removeItem('pickup_selected');
                                sessionStorage.removeItem('pickup_code');
                            } catch (err) {
                                console.error('Error al confirmar retiro:', err);
                                alert('Error al confirmar el retiro.');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        isLoading={loading}
                        variant="secondary"
                        icon={PackageCheck}
                        className="py-3 px-6 !bg-transparent !text-zinc-100 !shadow-none border border-brand-gold/40 hover:!border-brand-gold hover:!bg-brand-gold/5"
                        whileHover={{ scale: 1 }}
                        whileTap={{ scale: 1 }}
                    >
                        Confirmar retiro
                    </CustomButton>

                    {totalAmount > 0 && (
                        <CustomButton
                            onClick={handleProceed}
                            isLoading={loading}
                            variant="primary"
                            icon={CreditCard}
                            className="py-3 px-8 text-lg !bg-transparent !text-zinc-100 !shadow-none border border-brand-cyan/40 hover:!bg-brand-cyan/5 hover:!border-brand-cyan"
                            whileHover={{ scale: 1 }}
                            whileTap={{ scale: 1 }}
                        >
                            Ir a Pagar
                        </CustomButton>
                    )}
                </div>
            </div>
        </div>
    );

    // ========================
    // STEP: SELECTION (default)
    // ========================
    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <Package size={48} strokeWidth={1} className="text-brand-gold" />
                <div>
                    <h2 className="text-3xl font-bold text-zinc-300 uppercase">Gestión de <span className="text-custom-cyan">Retiros</span></h2>
                    <p className="text-zinc-500 uppercase text-sm">Selecciona las órdenes que deseas retirar.</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl shadow-lg shadow-black/20">
                {/* Desktop: Tabla */}
                <div className="hidden md:block">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-custom-dark border-b border-zinc-700">
                            <tr>
                                <th className="py-4 px-4 w-14 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded border-zinc-600 cursor-pointer accent-[#006E97]"
                                        checked={readyOrders.length > 0 && selectedOrders.length === readyOrders.length}
                                        onChange={() => {
                                            if (selectedOrders.length === readyOrders.length) {
                                                setSelectedOrders([]);
                                            } else {
                                                // Seleccionar todas de la misma moneda que la primera
                                                const firstCurrency = readyOrders[0]?.currency;
                                                const allSameCurrency = readyOrders.every(o => o.currency === firstCurrency);
                                                if (allSameCurrency) {
                                                    setSelectedOrders(readyOrders.map(o => o.id));
                                                } else {
                                                    alert("⚠️ Hay órdenes en distintas monedas. Seleccionalas manualmente.");
                                                }
                                            }
                                        }}
                                    />
                                </th>
                                <th className="p-4 text-xs font-bold text-zinc-100 uppercase tracking-wider text-center">Orden ID</th>
                                <th className="p-4 text-xs font-bold text-zinc-100 uppercase tracking-wider">Descripción</th>
                                <th className="p-4 text-xs font-bold text-zinc-100 uppercase tracking-wider text-center">Artículos</th>
                                <th className="p-4 text-xs font-bold text-zinc-100 uppercase tracking-wider text-center">Cantidad</th>
                                <th className="p-4 text-xs font-bold text-zinc-100 uppercase tracking-wider text-center">Fecha</th>
                                <th className="p-4 pr-6 text-xs font-bold text-zinc-100 text-right uppercase tracking-wider">Importe</th>
                                {/* <th className="p-4 text-sm font-bold text-zinc-100 text-center">Estado</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {readyOrders.map((order, idx) => (
                                <tr
                                    key={`${order.id}-${idx}`}
                                    onClick={() => handleToggleOrder(order.id)}
                                    className={`border-b border-zinc-800 transition-all cursor-pointer ${selectedOrders.includes(order.id) ? 'bg-[#1a2c30] shadow-[inset_3px_0_0_#006E97]' : 'bg-brand-dark hover:bg-[#1a1a1a]'}`}
                                >
                                    <td className="py-4 px-4 border-r border-zinc-800">
                                        <div className="flex items-center justify-center h-full">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-zinc-600 cursor-pointer accent-[#006E97]"
                                                checked={selectedOrders.includes(order.id)}
                                                readOnly
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono font-medium text-sm text-zinc-100 border-r border-zinc-800 text-center">{order.id}</td>
                                    <td className="p-4 text-sm text-zinc-300 border-r border-zinc-800">{order.desc}</td>
                                    <td className="p-4 text-sm text-zinc-400 border-r border-zinc-800 text-center">{order.article || '-'}</td>
                                    <td className="p-4 text-sm text-zinc-400 border-r border-zinc-800 text-center">{order.quantityStr || order.quantity || '-'}</td>
                                    <td className="p-4 text-sm text-zinc-400 border-r border-zinc-800 text-center">{order.date}</td>
                                    <td className="p-4 pr-6 text-right font-medium">
                                        {order.isPaid ? (
                                            <span className="text-green-400 flex items-center justify-end gap-1">
                                                <CheckCircle size={14} /> Pagado
                                            </span>
                                        ) : (
                                            <span className="text-custom-cyan">{`${order.currency === 'USD' ? 'US$' : '$'} ${(order.amount || 0).toFixed(2)}`}</span>
                                        )}
                                    </td>
                                    {/* <td className="p-4 text-center">
                                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${order.isPaid ? 'text-green-400' : 'text-custom-cyan'}`}>
                                            {order.status}
                                        </span>
                                    </td> */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile: Cards */}
                <div className="md:hidden divide-y divide-zinc-800">
                    {readyOrders.map((order, idx) => (
                        <div
                            key={`mobile-${order.id}-${idx}`}
                            onClick={() => handleToggleOrder(order.id)}
                            className={`p-4 flex items-start gap-3 cursor-pointer transition-all ${selectedOrders.includes(order.id) ? 'bg-[#1a2c30] shadow-[inset_3px_0_0_#006E97]' : 'bg-brand-dark hover:bg-[#1a1a1a]'}`}
                        >
                            <input
                                type="checkbox"
                                className="w-5 h-5 mt-0.5 rounded border-zinc-600 cursor-pointer accent-[#006E97]"
                                checked={selectedOrders.includes(order.id)}
                                readOnly
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-mono font-bold text-sm text-zinc-100">{order.id}</span>
                                    {/* <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${order.isPaid ? 'text-green-400' : 'text-custom-cyan'}`}>
                                        {order.status}
                                    </span> */}
                                </div>
                                <p className="text-sm text-zinc-400 truncate">{order.desc}</p>
                                <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                                    <span>{order.date}</span>
                                    <span className="font-medium">
                                        {order.isPaid ? (
                                            <span className="text-green-400 flex items-center gap-1">
                                                <CheckCircle size={12} /> Pagado
                                            </span>
                                        ) : (
                                            <span className="text-custom-cyan">{`${order.currency === 'USD' ? 'US$' : '$'} ${(order.amount || 0).toFixed(2)}`}</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-custom-dark border-t border-brand-dark flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-custom-cyan">
                        <span className="font-bold text-zinc-200">{selectedOrders.length}</span> órdenes seleccionadas
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs text-custom-cyan uppercase font-bold">Total a Pagar</p>
                            <p className="text-2xl font-bold text-zinc-200">
                                {activeCurrency === 'USD' ? 'US$' : '$'} {(totalAmount || 0).toFixed(2)}
                            </p>
                        </div>
                        <CustomButton
                            onClick={async () => {
                                // 1. Crear retiro
                                const code = await handleCreatePickup();
                                if (!code) return;

                                // 2. Cargar datos de envío
                                setLoadingShipping(true);
                                try {
                                    const res = await apiClient.get('/web-orders/shipping-data');
                                    if (res.success) {
                                        setShippingData(res.data);
                                        setSelectedFormaEnvio(res.data.defaultFormaEnvioID || res.data.formasEnvio[0]?.ID);
                                        setSelectedAgencia(res.data.defaultAgenciaID || res.data.agencias[0]?.ID);
                                        setSelectedDireccion(res.data.defaultDireccion || '');
                                    }
                                } catch (e) {
                                    console.error('Error cargando datos de envío:', e);
                                }
                                setLoadingShipping(false);

                                // 3. Ir a confirmación
                                setStep('confirmation');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={selectedOrders.length === 0}
                            isLoading={loading || loadingShipping}
                            variant="primary"
                            icon={ChevronRight}
                            className="py-3 px-6 !bg-transparent !text-zinc-100 !shadow-none border border-brand-cyan/40 hover:!bg-brand-cyan/5 hover:!border-brand-cyan"
                            style={{}}
                            whileHover={{ scale: 1 }}
                            whileTap={{ scale: 1 }}
                        >
                            Crear Retiro
                        </CustomButton>
                    </div>
                </div>
            </div>

            {user?.hasCredit && (
                <div className="flex items-center gap-3 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
                    <CheckCircle size={20} />
                    <p className="text-sm">Tu cuenta corriente está habilitada. Puedes retirar sin pago inmediato.</p>
                </div>
            )}
        </div>
    );
};
