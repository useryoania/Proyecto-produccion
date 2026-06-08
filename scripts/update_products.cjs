const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/pages/ProductsIntegration.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const newComponent = `// ─── Componente Principal ─────────────────────────────────────────────────────
const ProductsIntegration = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading]   = useState(false);
    const [search, setSearch]     = useState('');
    const [editing, setEditing]   = useState(null);
    const [selectedNode, setSelectedNode] = useState('all'); // 'all', 'sup||X', 'grp||X||Y'
    const [expanded, setExpanded] = useState({});

    const load = useCallback(() => {
        setLoading(true);
        api.get('/products-integration/local')
            .then(res => setArticles(res.data))
            .catch(() => toast.error('Error al cargar artículos'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggle = (key, e) => {
        if(e) e.stopPropagation();
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Árbol SupFlia → Grupo
    const tree = useMemo(() => {
        const supMap = {};
        articles.forEach(a => {
            const sup = (a.SupFlia  || '').trim() || '(Sin Familia)';
            const grp = (a.Grupo    || '').trim() || '(Sin Grupo)';

            if (!supMap[sup]) supMap[sup] = { count: 0, grupos: {} };
            supMap[sup].count++;
            
            if (!supMap[sup].grupos[grp]) {
                supMap[sup].grupos[grp] = { 
                    nombre: a.DescripcionGrupo || '', 
                    count: 0 
                };
            }
            supMap[sup].grupos[grp].count++;
        });
        return supMap;
    }, [articles]);

    const handleSaved = (formData) => {
        setArticles(prev => {
            const idx = prev.findIndex(a => a.CodArticulo?.trim() === formData.codArticulo.trim());
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = {
                    ...updated[idx],
                    Descripcion:     formData.descripcion,
                    CodStock:        formData.codStock,
                    Grupo:           formData.grupo,
                    SupFlia:         formData.supFlia,
                    Mostrar:         formData.mostrar ? 1 : 0,
                    anchoimprimible: parseFloat(formData.anchoImprimible) || 0,
                    LLEVAPAPEL:      formData.llevaPapel ? 1 : 0,
                    MonIdMoneda:     formData.monIdMoneda !== '' ? parseInt(formData.monIdMoneda) : null,
                    producto_maestro_id: formData.producto_maestro_id !== '' ? parseInt(formData.producto_maestro_id) : null,
                    url_imagen:      formData.url_imagen || updated[idx].url_imagen
                };
                return updated;
            }
            load(); return prev;
        });
        setEditing(null);
    };

    const supKeys = Object.keys(tree).sort();

    // Filtro para el Grid Principal
    const displayArticles = useMemo(() => {
        let list = articles;
        
        // Filtro por texto
        const s = search.toLowerCase().trim();
        if (s) {
            list = list.filter(a =>
                (a.CodArticulo || '').toLowerCase().includes(s) ||
                (a.Descripcion || '').toLowerCase().includes(s) ||
                String(a.ProIdProducto || '').includes(s) ||
                String(a.IDProdReact  || '').includes(s) ||
                (a.CodStock || '').toLowerCase().includes(s)
            );
        }

        // Filtro por sidebar
        if (selectedNode === 'all') return list;
        
        const parts = selectedNode.split('||');
        if (parts[0] === 'sup') {
            return list.filter(a => (a.SupFlia || '').trim() === parts[1]);
        }
        if (parts[0] === 'grp') {
            return list.filter(a => (a.SupFlia || '').trim() === parts[1] && (a.Grupo || '').trim() === parts[2]);
        }
        return list;
    }, [articles, search, selectedNode]);

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <i className="fa-solid fa-box-open text-xl"></i>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo y WMS</h1>
                        <p className="text-sm font-semibold text-slate-400">
                            Gestiona productos y vinculaciones desde un solo lugar.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={load} className="px-4 py-2.5 text-xs font-bold bg-white border-2 border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm" title="Recargar">
                        <i className="fa-solid fa-rotate"></i>
                    </button>
                    <button onClick={() => setEditing({})} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all">
                        <i className="fa-solid fa-plus"></i> Nuevo
                    </button>
                </div>
            </div>

            {/* Layout a 2 columnas */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Sidebar */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 text-sm">Categorias / Familias</h2>
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md">{supKeys.length} Familias</span>
                    </div>
                    
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input className="w-full pl-8 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                                placeholder="Filtrar productos..."
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {/* Boton "Todos los productos" */}
                        <div 
                            className={\`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors \${selectedNode === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}\`}
                            onClick={() => setSelectedNode('all')}
                        >
                            <div className="flex items-center gap-3">
                                <i className="fa-solid fa-globe text-sm opacity-80"></i>
                                <span className="text-sm font-bold">Todos los Productos</span>
                            </div>
                            <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-md \${selectedNode === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}\`}>{articles.length}</span>
                        </div>

                        {/* Arbol */}
                        {supKeys.map(sup => {
                            const supKey = \`sup||\${sup}\`;
                            const isSelected = selectedNode === supKey;
                            const isExpanded = !!expanded[supKey];
                            const grpKeys = Object.keys(tree[sup].grupos).sort();

                            return (
                                <div key={supKey} className="mt-2">
                                    <div 
                                        className={\`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors \${isSelected ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}\`}
                                        onClick={() => setSelectedNode(supKey)}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <i 
                                                className={\`fa-solid \${isExpanded ? 'fa-folder-open' : 'fa-folder'} text-sm \${isSelected ? 'opacity-90' : 'text-amber-400'}\`}
                                                onClick={(e) => toggle(supKey, e)}
                                            ></i>
                                            <span className="text-sm font-bold truncate">Familia {sup}</span>
                                        </div>
                                        <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 \${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}\`}>{tree[sup].count}</span>
                                    </div>

                                    {/* Grupos */}
                                    {isExpanded && (
                                        <div className="ml-5 mt-1 border-l-2 border-slate-100 pl-2 space-y-1">
                                            {grpKeys.map(grp => {
                                                const grpKey = \`grp||\${sup}||\${grp}\`;
                                                const isGrpSelected = selectedNode === grpKey;
                                                const gInfo = tree[sup].grupos[grp];
                                                const gLabel = gInfo.nombre ? \`\${grp} - \${gInfo.nombre}\` : grp;

                                                return (
                                                    <div 
                                                        key={grpKey} 
                                                        className={\`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors \${isGrpSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}\`}
                                                        onClick={() => setSelectedNode(grpKey)}
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <i className={\`fa-solid fa-layer-group text-[10px] \${isGrpSelected ? 'text-blue-500' : 'text-slate-300'}\`}></i>
                                                            <span className="text-xs truncate" title={gLabel}>{gLabel}</span>
                                                        </div>
                                                        <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 \${isGrpSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}\`}>{gInfo.count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content (Grid) */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-4 text-blue-500"></i>
                            <p className="font-bold">Cargando catálogo...</p>
                        </div>
                    ) : displayArticles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <i className="fa-solid fa-box-open text-6xl mb-4 text-slate-200"></i>
                            <p className="font-bold text-lg text-slate-500">No se encontraron artículos</p>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800">
                                    {selectedNode === 'all' && 'Todos los Productos'}
                                    {selectedNode.startsWith('sup') && \`Familia \${selectedNode.split('||')[1]}\`}
                                    {selectedNode.startsWith('grp') && \`Grupo \${selectedNode.split('||')[2]}\`}
                                </h2>
                                <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{displayArticles.length} resultados</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                                {displayArticles.map(art => (
                                    <ArticleCard
                                        key={art.ProIdProducto ?? art.CodArticulo}
                                        art={art}
                                        onEdit={setEditing}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Modal */}
            {editing !== null && (
                <EditModal
                    article={Object.keys(editing).length === 0 ? null : editing}
                    allArticles={articles}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
};

export default ProductsIntegration;
`;

const index = content.indexOf('// ─── Componente Principal ─────────────────────────────────────────────────────');
if (index !== -1) {
    const newFile = content.substring(0, index) + newComponent;
    fs.writeFileSync(filePath, newFile, 'utf8');
    console.log("File updated successfully.");
} else {
    console.error("Could not find the component to replace.");
}
