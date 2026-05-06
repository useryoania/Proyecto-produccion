import React from 'react';
import { Scissors, Trash2 } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { CustomSelect } from '../../../pautas/CustomSelect';

export const BordadoTechnicalUI = ({
    serviceId, garmentQuantity, setGarmentQuantity,
    bocetoFile, setBocetoFile,
    ponchadoFiles, setPonchadoFiles,
    globalMaterial, handleGlobalMaterialChange,
    serviceInfo, userStock,
    handleSpecializedFileUpload,
    handleMultipleSpecializedFileUpload,
    compact = false,
    // Props para modo complemento
    isComplement = false,
    compMaterial = '', setCompMaterial = null,
    compVariant = '', setCompVariant = null,
    compVariants = [], compMaterials = [],
    uniqueVariants = [], dynamicMaterials = [],
    serviceSubType = '', handleSubTypeChange = null
}) => {
    // Determinamos qué datos mostrar según si es standalone o complemento
    const isStandalone = serviceId === 'bordado';
    const displayVariants = isStandalone ? uniqueVariants : compVariants;
    const displayMaterials = isStandalone ? dynamicMaterials : compMaterials;

    const currentVariant = isStandalone ? serviceSubType : compVariant;
    const currentMaterial = isStandalone ? globalMaterial : compMaterial;

    const onVariantChange = isStandalone ? handleSubTypeChange : setCompVariant;
    const onMaterialChange = isStandalone ? handleGlobalMaterialChange : setCompMaterial;

    return (
        <div className={`animate-in slide-in-from-top duration-500 ${compact ? 'mb-0' : 'mb-8'}`}>
            <div className={`${compact ? 'bg-zinc-900/40 p-6' : 'bg-zinc-900/60 p-8'} rounded-[2rem] border border-zinc-700/50 relative overflow-hidden`}>
                {!compact && (
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-gold">
                        <Scissors size={120} />
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    {!compact && <span className="px-3 py-1 bg-brand-gold text-zinc-900 text-[10px] font-black rounded-lg">PASO 1</span>}
                    <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">{compact ? 'Especificaciones Técnicas' : 'Especificaciones de Bordado'}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                    <div className="md:col-span-12 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest">Tipo / Variante *</label>
                                <CustomSelect
                                    value={currentVariant}
                                    onChange={(val) => onVariantChange(val)}
                                    options={displayVariants.map(v => ({ value: v, label: v }))}
                                    placeholder="Seleccionar tipo..."
                                    variant="black"
                                    className="h-[55px]"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest">Prenda (Soporte) *</label>
                                <CustomSelect
                                    value={currentMaterial}
                                    onChange={(val) => onMaterialChange(val)}
                                    options={(displayVariants.length > 0 ? displayMaterials : (isStandalone ? (serviceInfo?.materials || []) : []) || userStock || []).map(mat => {
                                        const label = mat.Material || mat.name || mat;
                                        const val = mat.Material || mat.name || mat;
                                        return { value: val, label: label };
                                    })}
                                    placeholder="Seleccionar prenda..."
                                    variant="black"
                                    className="h-[55px]"
                                />
                            </div>

                            <div className="md:col-span-2 lg:col-span-1">
                                <label className="block text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest">Cantidad Total *</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Cant."
                                    className="w-full h-[55px] px-4 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl font-black text-lg text-zinc-100 outline-none focus:border-brand-gold transition-all"
                                    value={garmentQuantity}
                                    onChange={(e) => setGarmentQuantity(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest text-center">Logos a Bordar (Uno o más)</label>
                                <FileUploadZone
                                    id="bordado-logo"
                                    label="SUBIR LOGOS"
                                    onFileSelected={(f) => handleMultipleSpecializedFileUpload(f)}
                                    selectedFile={ponchadoFiles.length > 0}
                                    color="emerald"
                                    multiple={true}
                                />
                                {ponchadoFiles.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                                        {ponchadoFiles.map((f, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-zinc-800/50 border border-emerald-500/30 px-4 py-2 rounded-xl">
                                                <span className="text-[10px] font-bold text-zinc-300 max-w-[100px] truncate">{f.name}</span>
                                                <button
                                                    onClick={() => setPonchadoFiles(ponchadoFiles.filter((_, i) => i !== idx))}
                                                    className="text-emerald-500 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-black text-zinc-500 mb-2 tracking-widest text-center">Boceto / Ubicación</label>
                                <FileUploadZone
                                    id="bordado-boceto"
                                    label="UBICACIÓN VISUAL"
                                    onFileSelected={(f) => handleSpecializedFileUpload(f)}
                                    selectedFile={bocetoFile}
                                    color="blue"
                                />
                                {bocetoFile && (
                                    <div className="mt-3 flex justify-center">
                                        <div className="flex items-center gap-2 bg-zinc-800/50 border border-blue-500/30 px-4 py-2 rounded-xl">
                                            <span className="text-[10px] font-bold text-zinc-300 max-w-[150px] truncate">{bocetoFile.name}</span>
                                            <button
                                                onClick={() => setBocetoFile(null)}
                                                className="text-blue-500 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BordadoTechnicalUI;
