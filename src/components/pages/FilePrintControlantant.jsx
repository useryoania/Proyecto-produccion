import React, { useState, useEffect, useMemo } from 'react';
import styles from './FilePrintControl.module.css';

// --- FILA DE ARCHIVO AGRUPADO POR MATERIAL ---
const GroupedFileRow = ({ group, onAction, selectedRoll }) => {
    const totalFiles = group.files.length;
    const filesControlled = group.files.filter(f => f.status !== 'Pendiente' && f.status !== null).length;
    const isDone = totalFiles === filesControlled;
    const isControlEnabled = group.files.some(f => !f.roll || String(f.roll) === String(selectedRoll));

    const handleBatchOK = () => {
        const ids = group.files.filter(f => f.status === 'Pendiente').map(f => f.id);
        ids.forEach(id => onAction(id, 'OK'));
    };

    if (isDone) return (
        <div className={styles.rowDone}>
            <i className="fa-solid fa-check-circle"></i> {group.name} - <small>{group.material}</small>
            <span className={styles.tagOK}>Controlado</span>
        </div>
    );

    return (
        <div className={`${styles.fileRow} ${!isControlEnabled ? styles.disabledAction : ''}`}>
            <div className={styles.fileInfo}>
                <div className={styles.fileName}>{group.name} {!isControlEnabled && <span className={styles.inactiveTag}>(Otro Rollo)</span>}</div>
                <div className={styles.fileMeta}>
                    <span className={styles.materialTag}>{group.material}</span>
                    <span className={styles.badge}>{filesControlled}/{totalFiles} OK</span>
                </div>
            </div>
            <div className={styles.actions}>
                <button className={styles.btnFail} onClick={() => onAction(group.files[0].id, 'FALLA')} disabled={!isControlEnabled}>FALLA</button>
                <button className={styles.btnOk} onClick={handleBatchOK} disabled={!isControlEnabled}>OK ({totalFiles - filesControlled})</button>
            </div>
        </div>
    );
};

// --- PANEL DE TRAZABILIDAD ---
const TraceabilityPanel = ({ data, onClose }) => (
    <div className={styles.traceabilityOverlay}>
        <div className={styles.traceabilityPanel}>
            <div className={styles.panelHeader}>
                <h2>Trazabilidad</h2>
                <button onClick={onClose} className={styles.btnClosePanel}>X</button>
            </div>
            <div className={styles.orderList}>
                {Object.values(data).map(order => (
                    <div key={order.subOrderCode} className={styles.traceOrderCard}>
                        <h4>Orden: {order.subOrderCode} <span className={styles.rollTag}>R: {order.roll}</span></h4>
                        {order.files.map(f => (
                            <div key={f.id} className={styles.traceFileRow}>
                                <span>{f.name}</span>
                                <span className={f.status === 'Finalizado' ? styles.statusOk : styles.statusPending}>{f.status}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const FilePrintControl = ({ areaCode }) => {
    const [ordersList, setOrdersList] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderFiles, setOrderFiles] = useState([]);
    const [rollFilter, setRollFilter] = useState('');
    const [showTraceability, setShowTraceability] = useState(false);

    const API = "http://localhost:5000/api/production-file-control";

    const loadList = async () => {
        try {
            const res = await fetch(`${API}/ready?area=${areaCode}`);
            if (res.ok) setOrdersList(await res.json());
        } catch (e) { console.error("Servidor no responde", e); }
    };

    useEffect(() => { loadList(); }, [areaCode]);

    const sidebarGroups = useMemo(() => {
        const groups = {};
        ordersList.forEach(item => {
            if (rollFilter && String(item.roll) !== String(rollFilter)) return;
            const key = item.subOrderCode || 'S/N';
            if (!groups[key]) groups[key] = { ...item, baseCode: key, totalFiles: 0 };
            groups[key].totalFiles += 1;
        });
        return Object.values(groups).sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
    }, [ordersList, rollFilter]);

    useEffect(() => {
        if (!selectedOrder) return;
        fetch(`${API}/ready?machineId=${selectedOrder.machineId || ''}`)
            .then(res => res.json())
            .then(data => setOrderFiles(data.filter(f => String(f.subOrderCode) === String(selectedOrder.baseCode))));
    }, [selectedOrder]);

    const groupedMaterials = useMemo(() => {
        const groups = {};
        orderFiles.forEach(f => {
            const key = `${f.material}|${f.name}`;
            if (!groups[key]) groups[key] = { material: f.material, name: f.name, files: [], roll: f.roll };
            groups[key].files.push(f);
        });
        return Object.values(groups);
    }, [orderFiles]);

    const handleAction = async (fileId, action) => {
        const obs = action === 'FALLA' ? prompt("Observaciones:") : "";
        await fetch(`${API}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId, action, observations: obs, orderId: selectedOrder.subOrderId, areaId: areaCode, machineId: selectedOrder.machineId })
        });
        loadList();
    };

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <select value={rollFilter} onChange={e => setRollFilter(e.target.value)} className={styles.rollSelect}>
                    <option value="">Filtrar Rollo (Todos los activos)</option>
                    {[...new Set(ordersList.map(o => o.roll))].filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className={styles.list}>
                    {sidebarGroups.map(g => (
                        <div key={g.baseCode} className={`${styles.card} ${selectedOrder?.baseCode === g.baseCode ? styles.active : ''}`} onClick={() => setSelectedOrder(g)}>
                            <strong>#{g.baseCode}</strong> - {g.client} <br/>
                            <small>R: {g.roll} | Sec: {g.sequence}</small>
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles.main}>
                {selectedOrder ? (
                    <>
                        <div className={styles.detailHeader}>
                            <h1>Orden #{selectedOrder.baseCode}</h1>
                            <button onClick={() => setShowTraceability(true)} className={styles.btnTraceability}>Ver Trazabilidad</button>
                        </div>
                        {groupedMaterials.map((g, i) => <GroupedFileRow key={i} group={g} onAction={handleAction} selectedRoll={selectedOrder.roll} />)}
                    </>
                ) : <h2>Seleccione una orden activa</h2>}
            </div>
            {showTraceability && <TraceabilityPanel data={groupedMaterials} onClose={() => setShowTraceability(false)} />}
        </div>
    );
};

export default FilePrintControlant;