import { useState, useEffect } from 'react';
import { User, Phone, MapPin, FileText, Building, ChevronDown, Truck } from 'lucide-react';
import { CustomSelect } from '../../client-portal/pautas/CustomSelect';

const inputClass = "w-full pl-10 pr-4 py-3 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 focus:placeholder-zinc-100";
const selectClass = "w-full pl-10 pr-10 py-3 bg-brand-dark border border-zinc-700 rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 appearance-none cursor-pointer hover:border-zinc-500";
const labelClass = "text-xs font-bold text-zinc-100 uppercase tracking-wider ml-1";
const iconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-cyan group-focus-within:text-custom-cyan transition-colors";

export const Field = ({ label, icon: Icon, required, error, children }) => (
    <div className="space-y-1">
        <label className={labelClass}>
            {label} {required && <span className="text-custom-magenta">*</span>}
        </label>
        <div className="relative group">
            <div className={iconClass}><Icon size={18} /></div>
            {children}
        </div>
        {error && <p className="text-custom-magenta text-xs font-semibold ml-1 mt-0.5">{error}</p>}
    </div>
);

// Export style constants for pages that need them (e.g. password fields)
export { inputClass, selectClass, labelClass, iconClass };

/**
 * Shared nomenclator hook — fetches departments, localities, agencies.
 */
export const useNomenclators = (departamentoId, fetchFn) => {
    const [departments, setDepartments] = useState([]);
    const [localities, setLocalities] = useState([]);
    const [agencies, setAgencies] = useState([]);

    useEffect(() => {
        fetchFn('/nomenclators/departments')
            .then(data => { if (data.success) setDepartments(data.data); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        fetchFn('/nomenclators/agencies')
            .then(data => { if (data.success) setAgencies(data.data); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (!departamentoId) { setLocalities([]); return; }
        fetchFn(`/nomenclators/localities/${departamentoId}`)
            .then(data => { if (data.success) setLocalities(data.data); })
            .catch(() => { });
    }, [departamentoId]);

    return { departments, localities, agencies };
};

/**
 * Shared form fields for client data.
 */
export const ClientFormFields = ({ form, set, fieldErrors = {}, handleBlur, departments, localities, agencies, isMontevideo, placeholders = {} }) => {
    const blur = handleBlur || (() => () => { });

    // Auto-select locality when only one exists for the chosen department
    useEffect(() => {
        if (localities.length === 1 && !form.localidadId) {
            set('localidadId')({ target: { value: String(localities[0].ID) } });
        }
    }, [localities]);

    // Bridge CustomSelect onChange (passes value directly) to set() handler (expects e.target.value)
    const selectSet = (key) => (val) => set(key)({ target: { value: val } });

    const ph = {
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '099123456',
        razonSocial: 'Opcional',
        rut: 'Opcional',
        documento: 'Sin puntos ni guiones',
        direccion: 'Calle 1234',
        ...placeholders,
    };

    return (
        <>
            {/* Nombre | Apellido */}
            <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" icon={User} required error={fieldErrors.nombre}>
                    <input type="text" className={`${inputClass} ${fieldErrors.nombre ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`} placeholder={ph.nombre} value={form.nombre} onChange={set('nombre')} onBlur={blur('nombre')} />
                </Field>
                <Field label="Apellido" icon={User} required error={fieldErrors.apellido}>
                    <input type="text" className={`${inputClass} ${fieldErrors.apellido ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`} placeholder={ph.apellido} value={form.apellido} onChange={set('apellido')} onBlur={blur('apellido')} />
                </Field>
            </div>

            {/* Teléfono */}
            <Field label="Teléfono" icon={Phone} required error={fieldErrors.telefono}>
                <input type="text" className={`${inputClass} ${fieldErrors.telefono ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`} placeholder={ph.telefono} value={form.telefono} onChange={set('telefono')} onBlur={blur('telefono')} />
            </Field>

            {/* Razón Social */}
            <Field label="Razón Social" icon={Building}>
                <input type="text" className={inputClass} placeholder={ph.razonSocial} value={form.razonSocial} onChange={set('razonSocial')} />
            </Field>

            {/* RUT */}
            <Field label="RUT" icon={FileText}>
                <input type="text" className={inputClass} placeholder={ph.rut} value={form.rut} maxLength={12} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set('rut')({ target: { value: v } }); }} />
            </Field>

            {/* Documento de identidad */}
            <Field label="Documento de identidad" icon={FileText}>
                <input type="text" className={inputClass} placeholder={ph.documento} value={form.documento} maxLength={8} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set('documento')({ target: { value: v } }); }} />
            </Field>

            {/* Dirección */}
            <Field label="Dirección" icon={MapPin} required error={fieldErrors.direccion}>
                <input type="text" className={`${inputClass} ${fieldErrors.direccion ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`} placeholder={ph.direccion} value={form.direccion} onChange={set('direccion')} onBlur={blur('direccion')} />
            </Field>

            {/* Departamento | Localidad */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className={labelClass}>
                        Departamento <span className="text-custom-magenta">*</span>
                    </label>
                    <CustomSelect
                        value={form.departamentoId}
                        onChange={selectSet('departamentoId')}
                        options={departments.map(d => ({ value: String(d.ID), label: d.Nombre }))}
                        placeholder="Seleccionar..."
                        size="small"
                        direction="up"
                        className="!border-brand-cyan font-semibold"
                    />
                    {fieldErrors.departamentoId && <p className="text-custom-magenta text-xs font-semibold ml-1 mt-0.5">{fieldErrors.departamentoId}</p>}
                </div>
                <div className="space-y-1">
                    <label className={labelClass}>
                        Localidad <span className="text-custom-magenta">*</span>
                    </label>
                    <CustomSelect
                        value={form.localidadId}
                        onChange={selectSet('localidadId')}
                        options={localities.map(l => ({ value: String(l.ID), label: l.Nombre }))}
                        placeholder={form.departamentoId ? 'Seleccionar...' : 'Localidad'}
                        size="small"
                        direction="up"
                        disabled={!form.departamentoId}
                        className="!border-brand-cyan font-semibold"
                    />
                    {fieldErrors.localidadId && <p className="text-custom-magenta text-xs font-semibold ml-1 mt-0.5">{fieldErrors.localidadId}</p>}
                </div>
            </div>

            {/* Agencia - solo si NO es Montevideo */}
            {form.departamentoId && !isMontevideo && (
                <div className="space-y-1">
                    <label className={labelClass}>
                        Agencia <span className="text-custom-magenta">*</span>
                    </label>
                    <CustomSelect
                        value={form.agenciaId}
                        onChange={selectSet('agenciaId')}
                        options={agencies.map(a => ({ value: String(a.ID), label: a.Nombre }))}
                        placeholder="Seleccionar agencia..."
                        direction="up"
                        className="!border-brand-cyan font-semibold"
                    />
                    {fieldErrors.agenciaId && <p className="text-custom-magenta text-xs font-semibold ml-1 mt-0.5">{fieldErrors.agenciaId}</p>}
                </div>
            )}
        </>
    );
};
