import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertCircle, Search, Send, FileOutput, Plus, Eye, Edit, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import api from '../../services/apiClient';
import FacturacionManualModal from './FacturacionManualModal';
import CfePreviewModal from './CfePreviewModal';
import CfeEditModal from './CfeEditModal';

const getStatusBadge = (status) => {
    switch(status) {
        case 'PENDIENTE': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">Pendiente DGI</span>;
        case 'ACEPTADO_DGI': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">Aceptado DGI</span>;
        case 'RECHAZADO_DGI': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">Rechazado</span>;
        default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">{status}</span>;
    }
};

const getTipoDocName = (tipo) => {
    switch(tipo) {
        case 'FACTURA': return 'Factura de Crédito';
        case 'E-TICKET': return 'e-Ticket';
        case 'FACTURA_CICLO': return 'Factura de Ciclo';
        case 'NOTA_CREDITO': return 'Nota de Crédito';
        case 'NOTA_DEBITO': return 'Nota de Débito';
        default: return tipo;
    }
};

const ContabilidadBandejaCFE = () => {
    const { token } = useAuth();
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [error, setError] = useState('');
    const [showFacturaModal, setShowFacturaModal] = useState(false);
    
    // Modals
    const [previewDoc, setPreviewDoc] = useState(null);
    const [editDoc, setEditDoc] = useState(null);

    // Filtros
    const [filtros, setFiltros] = useState({
        fechaDesde: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fechaHasta: new Date().toISOString().split('T')[0],
        estado: '',
        tipo: ''
    });

    const fetchDocumentos = async () => {
        setLoading(true);
        setError('');
        try {
            const queryParams = new URLSearchParams();
            if (filtros.fechaDesde) queryParams.append('fechaDesde', filtros.fechaDesde);
            if (filtros.fechaHasta) queryParams.append('fechaHasta', filtros.fechaHasta);
            if (filtros.estado) queryParams.append('estado', filtros.estado);
            if (filtros.tipo) queryParams.append('tipo', filtros.tipo);
            const { data } = await api.get(`/contabilidad/cfe/documentos?${queryParams.toString()}`);
            setDocs(data);
        } catch (err) {
            setError('Error al cargar documentos CFE: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocumentos();
        // eslint-disable-next-line
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
    };

    const handleEnviarDGI = async (doc) => {
        if (!window.confirm(`¿Seguro que deseas enviar el documento ${doc.DocNumero} a DGI? Una vez aceptado no podrá modificarse.`)) return;
        
        try {
            setSendingId(doc.DocIdDocumento);
            const { data } = await api.post(`/contabilidad/cfe/documentos/${doc.DocIdDocumento}/enviar`);
            toast.success(`Enviado correctamente. CAE: ${data.cae}`);
            fetchDocumentos(); // Recargar lista
        } catch (err) {
            toast.error('Error enviando a DGI: ' + (err.response?.data?.error || err.message));
        } finally {
            setSendingId(null);
        }
    };

    const handleAnular = async (doc) => {
        // [PROVISIONAL] Habilitado a petición del usuario.
        // if (doc.DocPagado) {
        //     toast.error('No se puede anular porque esta factura ya fue pagada en Caja. Debes anular el cobro desde la Caja.');
        //     return;
        // }
        if (!window.confirm(`¿Seguro que deseas ANULAR la factura ${doc.DocSerie}-${doc.DocNumero}? Esto revertirá el asiento contable.`)) return;
        
        try {
            await api.put(`/contabilidad/cfe/documentos/${doc.DocIdDocumento}/anular`);
            toast.success('Factura anulada correctamente');
            fetchDocumentos();
        } catch (err) {
            toast.error('Error anulando: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-800">
                        Bandeja de Facturación Electrónica (CFE)
                    </h2>
                </div>
                <button
                    onClick={() => setShowFacturaModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Nueva Factura Manual
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                    <Search className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-700">Filtros de Búsqueda</h3>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                            <input 
                                type="date" 
                                name="fechaDesde" 
                                value={filtros.fechaDesde} 
                                onChange={handleFilterChange}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                            <input 
                                type="date" 
                                name="fechaHasta" 
                                value={filtros.fechaHasta} 
                                onChange={handleFilterChange}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado DGI</label>
                            <select 
                                name="estado" 
                                value={filtros.estado} 
                                onChange={handleFilterChange}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                            >
                                <option value="">Todos</option>
                                <option value="PENDIENTE">Pendientes de Envío</option>
                                <option value="ACEPTADO_DGI">Aceptados por DGI</option>
                                <option value="RECHAZADO_DGI">Rechazados</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                            <select 
                                name="tipo" 
                                value={filtros.tipo} 
                                onChange={handleFilterChange}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
                            >
                                <option value="">Todos</option>
                                <option value="FACTURA">Factura de Crédito</option>
                                <option value="FACTURA_CICLO">Factura de Ciclo</option>
                                <option value="E-TICKET">e-Ticket de Caja</option>
                                <option value="NOTA_CREDITO">Nota de Crédito</option>
                            </select>
                        </div>
                        <div>
                            <button 
                                onClick={fetchDocumentos} 
                                disabled={loading}
                                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {loading ? (
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : 'Buscar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nro Interno</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado DGI</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nro Oficial / CAE</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {docs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                                        No se encontraron documentos contables para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                docs.map(doc => (
                                    <tr key={doc.DocIdDocumento} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(doc.DocFechaEmision).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {getTipoDocName(doc.DocTipo)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            {doc.DocSerie}-{doc.DocNumero}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="text-gray-900">
                                                {doc.StringIDCliente && <span className="text-indigo-600 font-bold mr-1">[{doc.StringIDCliente.trim()}]</span>}
                                                {doc.CliNombreFantasia || doc.CliRazonSocial || 'Consumidor Final'}
                                            </div>
                                            {doc.CliRUT && <div className="text-xs text-gray-400">RUT: {doc.CliRUT}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            {doc.MonIdMoneda === 1 ? 'UYU ' : 'USD '}
                                            {Number(doc.DocTotal).toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(doc.CfeEstado)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {doc.CfeEstado === 'ACEPTADO_DGI' ? (
                                                <div>
                                                    <div className="font-semibold text-gray-900">{doc.CfeNumeroOficial}</div>
                                                    <div className="text-xs text-gray-400">CAE: {doc.CfeCAE}</div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            {doc.CfeEstado === 'PENDIENTE' ? (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button
                                                        onClick={() => setPreviewDoc(doc)}
                                                        className="text-gray-500 hover:text-blue-600 transition-colors"
                                                        title="Visualizar Ticket"
                                                    >
                                                        <Eye className="h-5 w-5" />
                                                    </button>
                                                    {/* [PROVISIONAL] Habilitado editar sin importar si está pagado */}
                                                    <button
                                                        onClick={() => setEditDoc(doc)}
                                                        className="text-gray-500 hover:text-yellow-600 transition-colors"
                                                        title="Editar Factura"
                                                    >
                                                        <Edit className="h-5 w-5" />
                                                    </button>
                                                    {/* [PROVISIONAL] Habilitado anular sin importar si está pagado */}
                                                    <button
                                                        onClick={() => handleAnular(doc)}
                                                        className="text-gray-500 hover:text-red-600 transition-colors"
                                                        title="Anular Factura"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEnviarDGI(doc)}
                                                        disabled={sendingId === doc.DocIdDocumento}
                                                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                                        title="Enviar a DGI"
                                                    >
                                                        {sendingId === doc.DocIdDocumento ? (
                                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <Send className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : doc.CfeEstado === 'ANULADO' ? (
                                                <span className="text-gray-400 font-semibold italic text-xs">ANULADA</span>
                                            ) : (
                                                <button 
                                                    onClick={() => window.open(doc.CfeUrlImpresion, '_blank')}
                                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    title="Descargar PDF Oficial"
                                                >
                                                    <FileOutput className="mr-1.5 h-3.5 w-3.5 text-red-500" /> PDF
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showFacturaModal && (
                <FacturacionManualModal 
                    onClose={() => setShowFacturaModal(false)}
                    onSuccess={() => {
                        setShowFacturaModal(false);
                        fetchDocumentos();
                    }}
                />
            )}

            {previewDoc && (
                <CfePreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
            )}

            {editDoc && (
                <CfeEditModal 
                    doc={editDoc} 
                    onClose={() => setEditDoc(null)}
                    onSuccess={() => {
                        setEditDoc(null);
                        fetchDocumentos();
                    }}
                />
            )}
        </div>
    );
};

export default ContabilidadBandejaCFE;
