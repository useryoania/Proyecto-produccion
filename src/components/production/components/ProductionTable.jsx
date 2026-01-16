import React, { useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

// Imports de estilos eliminados para evitar conflictos con AG Grid v33 Theming API

const AG_GRID_LOCALE_ES = {
    filterOoo: 'Filtrar...', equals: 'Igual', notEqual: 'Diferente', contains: 'Contiene', notContains: 'No contiene', startsWith: 'Empieza con', endsWith: 'Termina con', blank: 'Vacío', notBlank: 'No vacío', andCondition: 'Y', orCondition: 'O', loadingOoo: 'Cargando...', noRowsToShow: 'No hay datos', selectAll: 'Seleccionar Todo', searchOoo: 'Buscar órdenes...',
};

const ProductionTable = ({ rowData, onRowSelected, onRowClick, columnDefs: propColumnDefs }) => {

    // --- RENDERIZADORES ---
    const StatusRenderer = (params) => {
        const status = params.value || 'Pendiente';

        let colorClass = "bg-slate-100 text-slate-500 border-slate-200";
        const s = status.toLowerCase();

        if (s.includes('imprimiendo') || s.includes('proceso')) colorClass = "bg-blue-50 text-blue-600 border-blue-200";
        else if (s.includes('detenido') || s.includes('falla')) colorClass = "bg-red-50 text-red-600 border-red-200";
        else if (s.includes('finalizado') || s.includes('entregado') || s.includes('ok')) colorClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
        else if (s.includes('pendiente')) colorClass = "bg-slate-50 text-slate-500 border-slate-200";

        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${colorClass} inline-block text-center min-w-[80px]`}>
                {status}
            </span>
        );
    };

    const ActionsRenderer = (params) => (
        <div onClick={(e) => { e.stopPropagation(); if (onRowClick) onRowClick(params.data); }}
            className="flex items-center justify-center h-full cursor-pointer text-slate-400 hover:text-blue-500 transition-colors group">
            <i className="fa-regular fa-eye group-hover:scale-110 transition-transform"></i>
        </div>
    );

    const PriorityRenderer = (params) => {
        if (params.value === 'Urgente') {
            return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-wide">URGENTE</span>;
        }
        return <span className="text-xs text-slate-500 font-medium">Normal</span>;
    };

    const BatchRenderer = (params) => {
        if (!params.value) return <span className="text-slate-300">-</span>;
        return (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                {params.value}
            </span>
        );
    };

    const FilesRenderer = (params) => (
        <div className="flex items-center h-full text-slate-600 gap-1.5">
            <i className="fa-regular fa-file-image text-slate-400"></i>
            <b className="text-xs">{params.value || 0}</b>
        </div>
    );

    const DateRenderer = (params) => {
        if (!params.value) return '-';
        const date = new Date(params.value);
        return <span className="text-xs font-mono text-slate-500">{date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>;
    };

    // --- CONFIGURACIÓN DE SELECCIÓN ---
    const rowSelection = useMemo(() => ({
        mode: 'multiRow',
        checkboxes: true,
        headerCheckbox: true,
        enableClickSelection: false
    }), []);

    // --- COLUMNAS ---
    const internalColumnDefs = useMemo(() => [
        {
            headerName: '',
            width: 50,
            pinned: 'left',
            cellRenderer: ActionsRenderer,
            lockPosition: true,
            suppressHeaderMenuButton: true,
            cellClass: 'flex items-center justify-center'
        },
        { field: 'entryDate', headerName: 'Fecha', width: 90, cellRenderer: DateRenderer },
        { field: 'priority', headerName: 'Prio.', width: 100, cellRenderer: PriorityRenderer },
        { field: 'code', headerName: 'Orden', width: 130, cellClass: 'font-bold text-slate-700' },
        { field: 'client', headerName: 'Cliente', width: 150, filter: 'agTextColumnFilter', cellClass: 'font-semibold text-slate-600' },
        { field: 'desc', headerName: 'Trabajo', width: 180, filter: 'agTextColumnFilter', cellClass: 'italic text-slate-500 text-xs' },

        { field: 'material', headerName: 'Material', flex: 1, minWidth: 250, wrapText: true, autoHeight: true, cellClass: 'leading-tight py-2 font-medium text-slate-700' },

        { field: 'variantCode', headerName: 'Var.', width: 100, cellClass: 'font-mono text-xs text-slate-400' },
        { field: 'magnitude', headerName: 'Cant.', width: 80, cellClass: 'font-bold text-slate-800' },

        { field: 'status', headerName: 'Estado', width: 120, cellRenderer: StatusRenderer, cellClass: 'flex items-center' },
        { field: 'areaStatus', headerName: 'Est. Área', width: 100, cellClass: 'text-[10px] font-bold text-slate-600 uppercase flex items-center tracking-tight' },

        { field: 'filesCount', headerName: 'Arch.', width: 80, cellRenderer: FilesRenderer },
        { field: 'rollId', headerName: 'Lote', width: 120, cellRenderer: BatchRenderer, cellClass: 'flex items-center' },
        { field: 'printer', headerName: 'Máquina', width: 120, cellClass: 'text-xs text-slate-500' },
        { field: 'ink', headerName: 'Tinta', width: 100, filter: true, cellClass: 'text-[10px] font-bold text-purple-600 uppercase tracking-wide' }, // NEW
        { field: 'note', headerName: 'Nota', width: 100, tooltipField: 'note', cellClass: 'text-xs italic text-amber-600' },
        { field: 'observations', headerName: 'Observaciones', width: 200, tooltipField: 'observations', cellClass: 'text-xs italic text-slate-500' }
    ], [onRowClick]);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: true,
        resizable: true,
        headerClass: 'bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200',
        cellClass: 'text-sm text-slate-700 border-b border-slate-50 flex items-center'
    }), []);

    const onSelectionChanged = useCallback((event) => {
        const selectedRows = event.api.getSelectedRows();
        const selectedIds = selectedRows.map(r => r.id);
        if (onRowSelected) onRowSelected(selectedIds);
    }, [onRowSelected]);

    // Debug
    console.log("📊 [ProductionTable] Rendering with rows:", rowData?.length);

    return (
        <div
            className="ag-theme-quartz w-full shadow-sm rounded-lg overflow-hidden border border-slate-200 bg-white"
            style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}
        >
            {/* INYECTAMOS ESTILOS GLOBALES PARA AG-GRID Y TAILWIND MIX */}
            <style>{`
                .ag-theme-quartz .ag-root-wrapper { border: none; }
                .ag-theme-quartz .ag-header { background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; height: 48px !important; min-height: 48px !important; }
                .ag-theme-quartz .ag-header-cell { padding-left: 12px; padding-right: 12px; }
                .ag-theme-quartz .ag-row { border-bottom: 1px solid #f1f5f9; }
                .ag-theme-quartz .ag-row-hover { background-color: #f8fafc; }
                .ag-theme-quartz .ag-row-selected { background-color: #eff6ff !important; }
                
                /* Custom Scrollbar */
                .ag-body-viewport::-webkit-scrollbar { width: 8px; height: 8px; }
                .ag-body-viewport::-webkit-scrollbar-track { background: transparent; }
                .ag-body-viewport::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .ag-body-viewport::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>

            <AgGridReact
                rowData={rowData}
                columnDefs={propColumnDefs || internalColumnDefs}
                defaultColDef={defaultColDef}
                rowSelection={rowSelection}
                pagination={true}
                paginationPageSize={20}
                onSelectionChanged={onSelectionChanged}
                localeText={AG_GRID_LOCALE_ES}
                rowHeight={48}
                headerHeight={48}
            />
        </div>
    );
};

export default ProductionTable;