import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Calculator } from 'lucide-react';
import api from '../../services/apiClient';
import { toast } from 'sonner';

export default function CfeEditModal({ doc, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [clientes, setClientes] = useState([]);
    
    const [formData, setFormData] = useState({
        CliIdCliente: doc.CliIdCliente || 1,
        MonIdMoneda: doc.MonIdMoneda,
        DocSubtotal: Number(doc.DocSubtotal) || 0,
        DocImpuestos: Number(doc.DocImpuestos) || 0,
        DocTotal: Number(doc.DocTotal) || 0
    });

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const res = await api.get('/contabilidad/clientes-activos?tipo=todos');
                const clientesData = Array.isArray(res.data) ? res.data : (res.data.data || []);
                setClientes(clientesData);
            } catch (err) {
                toast.error('Error cargando clientes');
            }
        };
        fetchClientes();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const numValue = name.startsWith('Doc') ? parseFloat(value) || 0 : parseInt(value);
        
        setFormData(prev => {
            const newData = { ...prev, [name]: numValue };
            
            // Auto-calculate if modifying subtotal or total
            if (name === 'DocSubtotal') {
                newData.DocImpuestos = parseFloat((numValue * 0.22).toFixed(2));
                newData.DocTotal = parseFloat((numValue + newData.DocImpuestos).toFixed(2));
            } else if (name === 'DocTotal') {
                newData.DocSubtotal = parseFloat((numValue / 1.22).toFixed(2));
                newData.DocImpuestos = parseFloat((numValue - newData.DocSubtotal).toFixed(2));
            }
            
            return newData;
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put(`/contabilidad/cfe/documentos/${doc.DocIdDocumento}`, formData);
            toast.success('Factura editada y contabilizada correctamente');
            onSuccess();
        } catch (err) {
            toast.error('Error al editar: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <div className="flex items-center space-x-2">
                        <Edit2 className="w-5 h-5 text-yellow-600" />
                        <h3 className="text-lg font-bold text-gray-800">
                            Editar Factura Borrador
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4">
                        Editando documento <strong>{doc.DocSerie}-{doc.DocNumero}</strong>. 
                        Los cambios actualizarán también el asiento contable en el Libro Mayor.
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                        <select 
                            name="CliIdCliente"
                            value={formData.CliIdCliente}
                            onChange={handleChange}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                        >
                            <option value={1}>Consumidor Final (1)</option>
                            {clientes.map(c => (
                                <option key={c.CodCliente} value={c.CodCliente}>
                                    {c.NombreFantasia || c.Nombre} {c.CioRuc ? `(RUT: ${c.CioRuc})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                        <select 
                            name="MonIdMoneda"
                            value={formData.MonIdMoneda}
                            onChange={handleChange}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                        >
                            <option value={1}>UYU - Pesos Uruguayos</option>
                            <option value={2}>USD - Dólares Americanos</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                                Subtotal Neto
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                                <input 
                                    type="number" 
                                    name="DocSubtotal"
                                    value={formData.DocSubtotal}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 pl-7 border"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                IVA (Calculado 22%)
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                                <input 
                                    type="number" 
                                    name="DocImpuestos"
                                    value={formData.DocImpuestos}
                                    readOnly
                                    className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 p-2 pl-7 border"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1 flex justify-between items-center">
                            <span>TOTAL CON IMPUESTOS</span>
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex items-center">
                                <Calculator className="w-3 h-3 mr-1" /> Auto-cálculo
                            </span>
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-gray-700">$</span>
                            <input 
                                type="number" 
                                name="DocTotal"
                                value={formData.DocTotal}
                                onChange={handleChange}
                                className="w-full rounded-md border-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 pl-7 border-2 text-lg font-bold"
                            />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center px-5 py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <><Save className="w-5 h-5 mr-2" /> Guardar y Sincronizar</>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
