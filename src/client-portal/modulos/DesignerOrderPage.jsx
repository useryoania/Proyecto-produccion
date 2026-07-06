import React from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import OrderForm from './OrderForm';
import { Palette, ArrowLeft } from 'lucide-react';

/**
 * OrderForm en modo diseñador: crea un pedido EN NOMBRE del cliente elegido.
 * El cliente impersonado viaja en el header X-Cliente-CodCliente (lo agrega apiClient/fileService
 * leyendo localStorage.designer_cliente) y el backend valida el vínculo en cada request.
 */
export const DesignerOrderPage = () => {
    const { serviceId } = useParams();
    const navigate = useNavigate();

    let cliente = null;
    try { cliente = JSON.parse(localStorage.getItem('designer_cliente') || 'null'); } catch { /* noop */ }

    // Sin cliente elegido no hay modo impersonado → volver al home del diseñador
    if (!cliente?.codCliente) return <Navigate to="/portal/estudio" replace />;

    const salir = () => {
        localStorage.removeItem('designer_cliente');
        navigate('/portal/estudio');
    };

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Banner fijo de impersonación */}
            <div className="sticky top-0 z-50 bg-cyan-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
                    <Palette size={15} />
                    Estás creando un pedido para: <span className="bg-white/20 px-2 py-0.5 rounded-lg">{cliente.nombre}</span>
                    {cliente.idCliente && <span className="font-mono text-white/70 normal-case">({cliente.idCliente})</span>}
                </div>
                <button onClick={salir} className="flex items-center gap-1.5 text-[11px] font-bold bg-white/10 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors">
                    <ArrowLeft size={12} /> Volver a mis clientes
                </button>
            </div>

            <OrderForm serviceId={serviceId} />
        </div>
    );
};

export default DesignerOrderPage;
