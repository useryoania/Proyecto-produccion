import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const MultiAreaSelector = ({ areas, selected, onChange, placeholder = 'Seleccionar Áreas', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleToggle = (code) => {
        if (selected.includes(code)) {
            onChange(selected.filter(c => c !== code));
        } else {
            onChange([...selected, code]);
        }
    };

    const handleToggleAll = () => {
        if (selected.length === areas.length) {
            onChange([]);
        } else {
            onChange(areas.map(a => a.AreaID || a.code)); // Support both formats if needed, usually AreaID/code from api
        }
    };

    // Normalize area id access
    const getAreaId = (area) => area.AreaID || area.code;

    return (
        <div className="relative inline-block text-left z-30 w-full" ref={wrapperRef}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`bg-white border text-slate-700 border-slate-300 rounded p-2 w-full text-sm font-medium flex justify-between items-center shadow-sm transition-colors ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:border-blue-400'}`}
                type="button"
                disabled={disabled}
            >
                <span className="truncate">
                    {disabled && areas.length > 0
                        ? (areas.find(a => selected.includes(a.AreaID || a.code))?.Nombre || areas.find(a => selected.includes(a.AreaID || a.code))?.name || placeholder)
                        : selected.length === 0 ? placeholder :
                            selected.length === areas.length ? 'Todas las Áreas' :
                                `${selected.length} Seleccionadas`}
                </span>
                {!disabled && <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-xl p-2 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100 mb-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={selected.length === areas.length && areas.length > 0}
                                onChange={handleToggleAll}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-slate-700">Seleccionar Todas</span>
                        </label>
                    </div>
                    <div className="space-y-1">
                        {areas.map(area => {
                            const id = getAreaId(area);
                            return (
                                <label key={id} className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer select-none transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(id)}
                                        onChange={() => handleToggle(id)}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-600 truncate">{area.Nombre || area.name}</span>
                                    {(area.Categoria || area.category) && <span className="text-[10px] bg-slate-100 text-slate-400 px-1 rounded ml-auto">{area.Categoria || area.category}</span>}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
