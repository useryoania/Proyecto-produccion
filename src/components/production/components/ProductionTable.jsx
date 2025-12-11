import React, { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react'; 
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 

ModuleRegistry.registerModules([ AllCommunityModule ]);

// ❌ ELIMINAMOS "ag-grid.css" (Causa del Error #239)
// Solo dejamos el theme
import "ag-grid-community/styles/ag-theme-quartz.css"; 
import './ProductionTable.module.css'; 

const AG_GRID_LOCALE_ES = {
    filterOoo: 'Filtrar...', equals: 'Igual', notEqual: 'Diferente', contains: 'Contiene', notContains: 'No contiene', startsWith: 'Empieza con', endsWith: 'Termina con', blank: 'Vacío', notBlank: 'No vacío', andCondition: 'Y', orCondition: 'O', loadingOoo: 'Cargando...', noRowsToShow: 'No hay datos', selectAll: 'Seleccionar Todo', searchOoo: 'Buscar...',
};

const ProductionTable = ({ rowData, onRowSelected, onRowClick }) => {

    // --- RENDERIZADORES ---
    const StatusRenderer = (params) => {
        const status = params.value || 'Pendiente';
        const className = `badge-status status-${status.toLowerCase().replace(/\s/g, '-')}`;
        return <span className={className}>{status}</span>;
    };

    const ActionsRenderer = (params) => (
        <div onClick={(e) => { e.stopPropagation(); if (onRowClick) onRowClick(params.data); }}
             style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}
             className="action-icon-hover">
            <i className="fa-regular fa-eye" title="Ver Detalles"></i>
        </div>
    );
    
    const PriorityRenderer = (params) => {
        if (params.value === 'Urgente') return <span className="badge-urgent">URGENTE</span>;
        return <span className="text-normal">Normal</span>;
    };

    const BatchRenderer = (params) => {
        if (!params.value) return <span className="text-gray">-</span>;
        return <span className="badge-batch">{params.value}</span>;
    };

    const FilesRenderer = (params) => (
        <div style={{display:'flex', alignItems:'center', height:'100%'}}>
            <i className="fa-regular fa-file-image" style={{ marginRight: 5, color: '#64748b' }}></i>
            <b>{params.value || 0}</b>
        </div>
    );

    const DateRenderer = (params) => {
        if (!params.value) return '-';
        const date = new Date(params.value);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    // --- CONFIGURACIÓN DE SELECCIÓN (NUEVO EN v35) ---
    // Esto reemplaza checkboxSelection, headerCheckboxSelection y suppressRowClickSelection
    const rowSelection = useMemo(() => {
        return {
            mode: 'multiRow',          // Selección múltiple
            checkboxes: true,          // Mostrar checkboxes en la primera columna
            headerCheckbox: true,      // Checkbox en el encabezado
            enableClickSelection: false // Solo selecciona con el checkbox, no clicando la fila
        };
    }, []);

    // --- COLUMNAS ---
    const columnDefs = useMemo(() => [
        // NOTA: Ya no necesitamos la columna explícita de checkboxes, AG Grid v35 la inyecta con la config de arriba
        {
            headerName: '', 
            width: 50,
            pinned: 'left',
            cellRenderer: ActionsRenderer, // El ojito
            lockPosition: true,
            suppressHeaderMenuButton: true // Reemplazo de suppressMenu
        },
        { field: 'entryDate', headerName: 'Fecha', width: 90, cellRenderer: DateRenderer },
        { field: 'priority', headerName: 'Prio.', width: 90, cellRenderer: PriorityRenderer },
        { field: 'code', headerName: 'Orden', width: 130, cellStyle: { fontWeight: '700', color: '#334155' } },
        { field: 'client', headerName: 'Cliente', width: 150, filter: 'agTextColumnFilter' },
        { field: 'desc', headerName: 'Trabajo', width: 180, filter: 'agTextColumnFilter' },
        
        { field: 'material', headerName: 'Material', flex: 1, minWidth: 250, wrapText: true, autoHeight: true, cellStyle: { lineHeight: '1.5', padding: '8px 0', fontWeight: '500' } },
        
        { field: 'variantCode', headerName: 'Var.', width: 100, cellStyle: { fontFamily: 'monospace', color: '#64748b' } },
        { field: 'magnitude', headerName: 'Cant.', width: 80, cellStyle: { fontWeight: 'bold' } },
        
        { field: 'status', headerName: 'Estado', width: 110, cellRenderer: StatusRenderer }, 

        { field: 'filesCount', headerName: 'Arch.', width: 80, cellRenderer: FilesRenderer },
        { field: 'rollId', headerName: 'Lote', width: 100, cellRenderer: BatchRenderer },
        { field: 'printer', headerName: 'Máquina', width: 120 },
        { field: 'note', headerName: 'Nota', width: 100, tooltipField: 'note' }
    ], [onRowClick]);

    const defaultColDef = useMemo(() => ({
        sortable: true, filter: true, resizable: true, headerClass: 'production-header', cellClass: 'production-cell'
    }), []);

    const onSelectionChanged = useCallback((event) => {
        const selectedRows = event.api.getSelectedRows();
        const selectedIds = selectedRows.map(r => r.id);
        if (onRowSelected) onRowSelected(selectedIds);
    }, [onRowSelected]);

    return (
        <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                
                // 👇 NUEVA CONFIGURACIÓN DE SELECCIÓN v35
                rowSelection={rowSelection}
                
                pagination={true}
                paginationPageSize={20}
                onSelectionChanged={onSelectionChanged}
                
                // Quitamos props obsoletos como suppressRowClickSelection
                localeText={AG_GRID_LOCALE_ES}
            />
        </div>
    );
};

export default ProductionTable;