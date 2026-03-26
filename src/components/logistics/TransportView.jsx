import React, { useState, useEffect, useRef } from 'react';
import api, { logisticsService } from '../../services/api';
import { toast } from 'sonner';

const TransportView = () => {
    const [transports, setTransports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await logisticsService.getActiveTransports();
            setTransports(data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar transportes');
        } finally {
            setLoading(false);
        }
    };

    // MODAL STATE
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [modalFiles, setModalFiles] = useState([]); // [{id, file}]
    const [bultoMappings, setBultoMappings] = useState({}); // { [bultoId]: { checked: boolean, fileId: 'none' | id } }

    const openUploadModal = async (transport) => {
        setLoading(true);
        try {
            const details = await logisticsService.getRemitoByCode(transport.CodigoRemito);
            setModalData({ transport, items: details.items });

            const initialMap = {};
            details.items.forEach(i => {
                if (i.BultoEstado !== 'ENTREGADO') {
                    initialMap[i.BultoID] = { checked: false, fileId: 'none' };
                }
            });
            setBultoMappings(initialMap);
            setModalFiles([{ id: Date.now(), file: null }]); // Start with 1 empty file slot
            setIsModalOpen(true);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar detalle del remito');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDelivery = async () => {
        const checkedBultos = Object.entries(bultoMappings).filter(([k, v]) => v.checked);
        if (checkedBultos.length === 0) return toast.error('Debes seleccionar al menos un bulto para procesar');

        setLoading(true);
        try {
            // Group selected bultos by fileId
            const groupsFromUI = {};
            checkedBultos.forEach(([bultoId, map]) => {
                if (!groupsFromUI[map.fileId]) groupsFromUI[map.fileId] = [];
                groupsFromUI[map.fileId].push(bultoId);
            });

            // Send sequentially
            for (const [fileId, bultosIds] of Object.entries(groupsFromUI)) {
                const formData = new FormData();
                if (fileId !== 'none') {
                    const fileObj = modalFiles.find(mf => mf.id.toString() === fileId.toString())?.file;
                    if (fileObj) formData.append('comprobante', fileObj);
                }
                formData.append('bultosIds', JSON.stringify(bultosIds));

                await logisticsService.confirmDeliveryWithProof(modalData.transport.CodigoRemito, formData);
            }

            toast.success('Entregas procesadas con éxito ✅');
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Error al subir comprobante(s)');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async (transport) => {
        try {
            // Unconditionally fetch full data for Hoja de Despacho format
            const resApi = await api.get('/apiordenesRetiro/remito/' + transport.CodigoRemito);
            const sel = resApi.data;
            
            if (!sel || sel.length === 0) {
                return toast.warning('No se encontraron órdenes en este remito para imprimir.');
            }
            
            const remitoCode = transport.CodigoRemito;
            const fecha = new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' });
            // Agrupar por agencia (agenciaNombre o 'Sin Agencia / Retiro Local')
            const grupos = {};
            sel.forEach(enc => {
                const agKey = enc.agenciaNombre || enc.lugarRetiro || 'Sin Agencia / Retiro Local';
                if (!grupos[agKey]) grupos[agKey] = [];
                grupos[agKey].push(enc);
            });

            const renderFila = (enc) => {
                const ordenesList = (enc.orders || []).map((o, i) =>
                    `<tr>
                        <td style="padding:5px 8px;font-size:12px;">${i + 1}</td>
                        <td style="padding:5px 8px;font-size:12px;font-weight:700;">${o.orderNumber || '-'}</td>
                        <td style="padding:5px 8px;font-size:12px;color:#475569;">${o.orderEstado || '-'}</td>
                        <td style="padding:5px 8px;font-size:12px;text-align:right;font-weight:700;color:#0070bc;">${o.orderCosto || '-'}</td>
                    </tr>`).join('');
                const ordTable = enc.orders?.length > 0
                    ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;">
                        <thead><tr style="background:#f8fafc;">
                            <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">#</th>
                            <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">Cód. Orden</th>
                            <th style="padding:5px 8px;font-size:11px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">Estado</th>
                            <th style="padding:5px 8px;font-size:11px;text-align:right;color:#64748b;border-bottom:1px solid #e2e8f0;">Importe</th>
                        </tr></thead><tbody>${ordenesList}</tbody>
                    </table>`
                    : '<span style="font-size:12px;color:#aaa;">Sin órdenes registradas</span>';

                return `<tr style="border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    <td style="padding:10px 8px;font-size:13px;font-weight:900;color:#1e293b;white-space:nowrap;">${enc.ordenDeRetiro}</td>
                    <td style="padding:10px 8px;">
                        <div style="font-size:13px;font-weight:700;">${enc.CliNombre || '-'}</div>
                        <div style="font-size:11px;color:#64748b;">${enc.CliCodigoCliente || ''} &bull; ${enc.TClDescripcion || ''}</div>
                        ${enc.CliTelefono ? `<div style="font-size:11px;color:#64748b;">&#128222; ${enc.CliTelefono}</div>` : ''}
                    </td>
                    <td style="padding:10px 8px;">
                        ${enc.departamentoEnvio ? `<div style="font-size:12px;"><strong>Dpto:</strong> ${enc.departamentoEnvio}</div>` : ''}
                        ${enc.localidadEnvio ? `<div style="font-size:12px;"><strong>Localidad:</strong> ${enc.localidadEnvio}</div>` : ''}
                        ${enc.direccionEnvio ? `<div style="font-size:12px;"><strong>Dir:</strong> ${enc.direccionEnvio}</div>` : ''}
                        ${(!enc.departamentoEnvio && !enc.localidadEnvio && !enc.direccionEnvio) ? `<span style="color:#aaa;font-size:11px;">—</span>` : ''}
                    </td>
                    <td style="padding:10px 8px;">${ordTable}</td>
                    <td style="padding:10px 8px;text-align:center;">
                        <span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;
                            border:1.5px solid ${enc.pagorealizado === 1 ? '#16a34a' : '#dc2626'};
                            color:${enc.pagorealizado === 1 ? '#16a34a' : '#dc2626'};">
                            ${enc.pagorealizado === 1 ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                    </td>
                </tr>`;
            };

            const seccionesHtml = Object.entries(grupos).map(([agencia, ordenes]) => `
                <div style="margin-bottom:24px;page-break-inside:avoid;">
                    <div style="background:#0070bc;color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-size:13px;font-weight:900;letter-spacing:.5px;">
                        &#128666; ${agencia} &nbsp;<span style="font-size:11px;font-weight:400;opacity:.85;">(${ordenes.length} retiro${ordenes.length > 1 ? 's' : ''})</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
                        <thead><tr style="background:#f1f5f9;">
                            <th style="padding:7px 8px;font-size:11px;text-align:left;color:#334155;border-bottom:2px solid #e2e8f0;">Retiro</th>
                            <th style="padding:7px 8px;font-size:11px;text-align:left;color:#334155;border-bottom:2px solid #e2e8f0;">Cliente</th>
                            <th style="padding:7px 8px;font-size:11px;text-align:left;color:#334155;border-bottom:2px solid #e2e8f0;">Destino</th>
                            <th style="padding:7px 8px;font-size:11px;text-align:left;color:#334155;border-bottom:2px solid #e2e8f0;">Órdenes</th>
                            <th style="padding:7px 8px;font-size:11px;text-align:center;color:#334155;border-bottom:2px solid #e2e8f0;">Pago</th>
                        </tr></thead>
                        <tbody>${ordenes.map(renderFila).join('')}</tbody>
                    </table>
                </div>`).join('');

            const firmasHtml = `
                <div style="margin-top:40px;page-break-inside:avoid;">
                    <div style="display:flex;justify-content:space-around;gap:24px;">
                        <div style="flex:1;text-align:center;">
                            <div style="border-top:1.5px solid #334155;padding-top:8px;margin-top:50px;">
                                <div style="font-size:13px;font-weight:700;">Firma Entrega</div>
                                <div style="font-size:11px;color:#64748b;margin-top:2px;">Responsable despacho</div>
                            </div>
                        </div>
                        <div style="flex:1;text-align:center;">
                            <div style="border-top:1.5px solid #334155;padding-top:8px;margin-top:50px;">
                                <div style="font-size:13px;font-weight:700;">Firma Recibe</div>
                                <div style="font-size:11px;color:#64748b;margin-top:2px;">Transportista / Agencia</div>
                            </div>
                        </div>
                        <div style="flex:1;text-align:center;">
                            <div style="border-top:1.5px solid #334155;padding-top:8px;margin-top:50px;">
                                <div style="font-size:13px;font-weight:700;">Confirma Comprobante</div>
                                <div style="font-size:11px;color:#64748b;margin-top:2px;">Aclaración y sello</div>
                            </div>
                        </div>
                    </div>
                </div>`;

            const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
            <title>Reporte Despacho &mdash; USER</title>
            <style>
                *{box-sizing:border-box;margin:0;padding:0;}
                body{font-family:'Segoe UI',Calibri,sans-serif;padding:28px 32px;color:#1e293b;font-size:13px;}
                @media print{body{padding:14px 16px;} button{display:none!important;}}
            </style></head><body>
            <div style="border-bottom:3px solid #0070bc;padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end;">
                <div style="display:flex;align-items:center;gap:20px;">
                    <div>
                        <div style="font-size:24px;font-weight:900;color:#0070bc;letter-spacing:1px;">USER</div>
                        <div style="font-size:15px;font-weight:700;color:#475569;">Logística &mdash; Hoja de Despacho</div>
                    </div>
                    ${remitoCode ?
                    `<div style="text-align:center;border-left:2px solid #e2e8f0;padding-left:20px;margin-left:5px;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(remitoCode)}" style="width:60px;height:60px;mix-blend-mode:multiply;" />
                        <div style="font-size:11px;font-weight:900;color:#1e293b;margin-top:2px;">${remitoCode}</div>
                    </div>` : ''}
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;color:#94a3b8;">${fecha}</div>
                    <div style="font-size:12px;color:#94a3b8;"><strong style="color:#1e293b;">${sel.length}</strong> retiros &bull; <strong style="color:#1e293b;">${Object.keys(grupos).length}</strong> agencia(s)</div>
                </div>
            </div>
            ${seccionesHtml}
            ${firmasHtml}
            <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
                USER &mdash; Sistema de Gestión Logística &mdash; Documento interno
            </div>
            <div style="text-align:center;margin-top:16px;">
                <button onclick="window.print()" style="background:#0070bc;color:#fff;border:none;padding:9px 30px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">&#128438; Imprimir Reporte</button>
            </div>
            </body></html>`;
            
            const win = window.open('', '_blank', 'width=1050,height=950');
            if (win) { 
                win.document.write(html); 
                win.document.close(); 
                win.focus(); 
                setTimeout(() => win.print(), 700); 
            }

        } catch (err) {
            console.error(err);
            toast.error("Error al generar remito");
        }
    };

    const [filterStatus, setFilterStatus] = useState('ACTIVE'); // 'ACTIVE' | 'ALL'

    const filtered = transports.filter(t => {
        const matchesSearch = (t.CodigoRemito || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.Observaciones || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterStatus === 'ACTIVE') {
            return ['EN_TRANSITO', 'EN_TRANSITO_PARCIAL', 'ESPERANDO_RETIRO'].includes(t.Estado);
        }
        return true;
    });

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Transporte en Curso</h2>
                    <p className="text-slate-500 text-sm">Mercadería en poder de transportistas</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-bold">
                        <button
                            onClick={() => setFilterStatus('ACTIVE')}
                            className={`px-3 py-1 rounded transition-all ${filterStatus === 'ACTIVE' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            En Viaje
                        </button>
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className={`px-3 py-1 rounded transition-all ${filterStatus === 'ALL' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Todos
                        </button>
                    </div>
                    <button onClick={loadData} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 relative max-w-sm">
                <i className="fa-solid fa-search absolute left-3 top-3 text-slate-400"></i>
                <input
                    type="text"
                    placeholder="Buscar por remito, chofer..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Cargando...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <i className="fa-solid fa-road text-4xl text-slate-300 mb-3"></i>
                        <p className="text-slate-500">No hay vehículos registrados con este filtro.</p>
                    </div>
                ) : (
                    filtered.map(t => (
                        <div key={t.EnvioID} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center hover:shadow-md transition-shadow 
                            ${t.Estado.includes('RECIBIDO') ? 'border-slate-200 opacity-75' : 'border-indigo-100'}`}>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-lg text-slate-800 bg-indigo-50 px-2 rounded border border-indigo-100">{t.CodigoRemito}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase
                                        ${t.Estado === 'ESPERANDO_RETIRO' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                            t.Estado.includes('RECIBIDO') ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        {t.Estado.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-600 mt-2">
                                    <i className="fa-solid fa-user-tag text-slate-400 mr-2"></i>
                                    {/* Mostrar solo la parte del transportista si es muy larga la obs */}
                                    <span className="font-medium text-slate-800">{t.Observaciones}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    <i className="fa-solid fa-clock mr-1"></i>
                                    Salida: {new Date(t.Fecha).toLocaleString()} | {t.TotalBultos} Bultos
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                                <div className="text-2xl font-black text-slate-200">
                                    <i className="fa-solid fa-truck-fast"></i>
                                </div>
                                <button
                                    onClick={() => handlePrint(t)}
                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-bold transition-colors flex items-center gap-1"
                                >
                                    <i className="fa-solid fa-print"></i>
                                    Reimprimir
                                </button>
                                {t.Estado !== 'ENTREGADO' && (
                                    <button
                                        onClick={() => openUploadModal(t)}
                                        className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1 rounded-full font-bold transition-colors flex items-center gap-1 mt-2"
                                        title="Seleccionar bultos y subir comprobante"
                                    >
                                        <i className="fa-solid fa-list-check"></i>
                                        Cerrar / Upload
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* UPLOAD PROOF MODAL */}
            {isModalOpen && modalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                <i className="fa-solid fa-truck-ramp-box text-emerald-600 mr-2"></i>
                                Gestionar Entregas - {modalData.transport.CodigoRemito}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                            {/* COL ARCHIVOS */}
                            <div className="w-full md:w-1/3 bg-slate-50 p-5 border-r border-slate-200 overflow-y-auto">

                                {/* HISTORIAL DE ARCHIVOS YA SUBIDOS */}
                                {(() => {
                                    const prevPaths = Array.from(new Set(modalData.items.filter(i => i.ComprobantePath).map(i => i.ComprobantePath)));
                                    if (prevPaths.length === 0) return null;
                                    return (
                                        <div className="mb-6">
                                            <h4 className="font-bold text-slate-700 text-sm mb-2"><i className="fa-solid fa-clock-rotate-left mr-1"></i> Subidos Previamente</h4>
                                            {prevPaths.map(path => {
                                                const fileName = path.split('/').pop();
                                                const bultosAsociados = modalData.items.filter(i => i.ComprobantePath === path);
                                                return (
                                                    <div key={path} className="bg-white p-2.5 rounded-lg border border-slate-200 mb-2 shadow-sm">
                                                        <a href={`http://localhost:5038${path}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 truncate block bg-indigo-50 p-1.5 rounded" title={fileName}>
                                                            <i className="fa-solid fa-file-arrow-down mr-1"></i> {fileName}
                                                        </a>
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {bultosAsociados.map(b => (
                                                                <span key={b.BultoID} className="bg-slate-100 border border-slate-200 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-bold">{b.CodigoEtiqueta}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                })()}

                                <div className="flex justify-between items-center mb-4 pt-2 border-t border-slate-200">
                                    <h4 className="font-bold text-slate-700">Comprobantes Nuevos</h4>
                                    <button
                                        onClick={() => setModalFiles([...modalFiles, { id: Date.now(), file: null }])}
                                        className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold hover:bg-indigo-200"
                                    >
                                        + Agregar
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {modalFiles.map((mf, index) => (
                                        <div key={mf.id} className="bg-white p-3 rounded-lg border shadow-sm relative">
                                            {modalFiles.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        const newFiles = modalFiles.filter(f => f.id !== mf.id);
                                                        setModalFiles(newFiles);
                                                        const newMappings = { ...bultoMappings };
                                                        Object.keys(newMappings).forEach(k => {
                                                            if (newMappings[k].fileId === mf.id) newMappings[k].fileId = 'none';
                                                        });
                                                        setBultoMappings(newMappings);
                                                    }}
                                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            )}
                                            <label className="text-xs font-bold text-indigo-600 mb-1 block">Archivo {index + 1}</label>
                                            <input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={e => {
                                                    const newArr = [...modalFiles];
                                                    const idx = newArr.findIndex(x => x.id === mf.id);
                                                    newArr[idx].file = e.target.files[0];
                                                    setModalFiles(newArr);
                                                }}
                                                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                    {modalFiles.length === 0 && (
                                        <p className="text-xs text-slate-400 italic text-center py-4">Sin comprobantes asociados.</p>
                                    )}
                                </div>
                            </div>

                            {/* COL BULTOS */}
                            <div className="w-full md:w-2/3 p-5 overflow-y-auto">
                                <h4 className="font-bold text-slate-700 mb-2">2. Bultos de esta tanda</h4>
                                <p className="text-xs text-slate-500 mb-4">Marcá los entregados y asigales a qué archivo de la izquierda corresponden.</p>

                                <div className="space-y-2">
                                    {modalData.items.map(item => {
                                        const isDelivered = item.BultoEstado === 'ENTREGADO';

                                        if (isDelivered) {
                                            const fname = item.ComprobantePath ? item.ComprobantePath.split('/').pop() : 'Sin archivo';
                                            return (
                                                <div key={item.BultoID} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border bg-slate-50 opacity-60">
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-500">{item.CodigoEtiqueta}</p>
                                                        <p className="text-xs text-slate-400">{item.Descripcion || 'Sin desc'}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end mt-2 sm:mt-0">
                                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase mb-1">Ya Entregado</span>
                                                        <span className="text-[10px] text-slate-400 font-bold break-all" title={fname}><i className="fa-solid fa-file"></i> {fname}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const map = bultoMappings[item.BultoID] || { checked: false, fileId: 'none' };

                                        return (
                                            <div key={item.BultoID} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border transition-all ${map.checked ? 'border-emerald-300 bg-emerald-50/30 shadow-sm' : 'bg-white hover:border-slate-300'}`}>
                                                <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={map.checked}
                                                        onChange={(e) => {
                                                            const newMap = { ...bultoMappings };
                                                            const isChecked = e.target.checked;
                                                            // si se clickea y no tenia archivo, asignar automatico al primero si hay
                                                            let fId = map.fileId;
                                                            if (isChecked && fId === 'none' && modalFiles.length > 0) {
                                                                fId = modalFiles[0].id;
                                                            }
                                                            newMap[item.BultoID] = { ...map, checked: isChecked, fileId: fId };
                                                            setBultoMappings(newMap);
                                                        }}
                                                        className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                                    />
                                                    <div>
                                                        <p className={`font-bold text-sm ${map.checked ? 'text-emerald-700' : 'text-slate-700'}`}>{item.CodigoEtiqueta}</p>
                                                        <p className="text-xs text-slate-500">{item.Descripcion || 'Sin desc'}</p>
                                                    </div>
                                                </label>

                                                {/* SELECTOR DE ARCHIVO */}
                                                <div className="mt-3 sm:mt-0 w-full sm:w-48 ml-8 sm:ml-0">
                                                    <select
                                                        disabled={!map.checked}
                                                        value={map.fileId}
                                                        onChange={(e) => {
                                                            const newMap = { ...bultoMappings };
                                                            newMap[item.BultoID] = { ...map, fileId: e.target.value === 'none' ? 'none' : e.target.value };
                                                            setBultoMappings(newMap);
                                                        }}
                                                        className="w-full text-[11px] p-2 rounded-md border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500 font-bold"
                                                    >
                                                        <option value="none" className="text-slate-400">--- Sin Archivo ---</option>
                                                        {modalFiles.map((mf, i) => (
                                                            <option key={mf.id} value={mf.id} className="text-slate-700">
                                                                Archivo {i + 1} {mf.file ? `(${mf.file.name})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200 text-sm">
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelivery}
                                disabled={Object.values(bultoMappings).filter(m => m.checked).length === 0 || loading}
                                className="px-6 py-2 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                            >
                                {loading && <i className="fa-solid fa-spinner fa-spin"></i>}
                                Procesar Seleccionados
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransportView;
