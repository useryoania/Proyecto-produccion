import { useState, useEffect } from 'react';
import { User, Phone, MapPin, FileText, Building, ChevronDown, Truck } from 'lucide-react';

const inputClass = "w-full pl-10 pr-4 py-3 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 placeholder-zinc-500 focus:placeholder-zinc-100";
const selectClass = "w-full pl-10 pr-10 py-3 bg-brand-dark border border-brand-cyan rounded-xl focus:ring-1 focus:ring-custom-cyan focus:border-custom-cyan transition-all outline-none font-semibold text-zinc-100 appearance-none cursor-pointer";
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

const SelectArrow = () => (
    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
        <ChevronDown size={16} />
    </div>
);

// Export style constants for pages that need them (e.g. password fields)
export { inputClass, selectClass, labelClass, iconClass };

/**
 * Shared nomenclator hook — fetches departments, localities, agencies.
 * @param {Function} fetchFn  A function like (url) => Promise<data>  
 *   where data is already parsed JSON. This lets both the main app (raw fetch)
 *   and the client portal (apiClient.get) provide their own fetcher.
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
 * 
 * Props:
 *  - form: object with { nombre, apellido, telefono, razonSocial, rut, documento, direccion, departamentoId, localidadId, agenciaId }
 *  - set(key): returns onChange handler
 *  - fieldErrors: object with field-level error messages
 *  - handleBlur(key): returns onBlur handler (optional)
 *  - departments, localities, agencies: nomenclator arrays
 *  - isMontevideo: boolean
 *  - placeholders: optional object to override default placeholder text per field
 */
export const ClientFormFields = ({ form, set, fieldErrors = {}, handleBlur, departments, localities, agencies, isMontevideo, placeholders = {} }) => {
    const blur = handleBlur || (() => () => { });

    // Default placeholders for registration; overridden by the placeholders prop (e.g. with current DB values in edit mode)
    const ph = {
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '099123456',
        razonSocial: 'Opcional',
        rut: 'Opcional',
        documento: 'Sin puntos ni guiones',
        direccion: 'Calle 123, Ciudad',
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
                <Field label="Departamento" icon={MapPin} required error={fieldErrors.departamentoId}>
                    <select
                        className={`${selectClass} ${!form.departamentoId ? 'text-slate-400' : ''} ${fieldErrors.departamentoId ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`}
                        value={form.departamentoId}
                        onChange={set('departamentoId')}
                        onBlur={blur('departamentoId')}
                    >
                        <option value="">Seleccionar...</option>
                        {departments.map(d => (
                            <option key={d.ID} value={d.ID}>{d.Nombre}</option>
                        ))}
                    </select>
                    <SelectArrow />
                </Field>
                <Field label="Localidad" icon={MapPin} required error={fieldErrors.localidadId}>
                    <select
                        className={`${selectClass} ${!form.localidadId ? 'text-slate-400' : ''} ${fieldErrors.localidadId ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`}
                        value={form.localidadId}
                        onChange={set('localidadId')}
                        onBlur={blur('localidadId')}
                        disabled={!form.departamentoId}
                    >
                        <option value="">{form.departamentoId ? 'Seleccionar...' : 'Localidad'}</option>
                        {localities.map(l => (
                            <option key={l.ID} value={l.ID}>{l.Nombre}</option>
                        ))}
                    </select>
                    <SelectArrow />
                </Field>
            </div>

            {/* Agencia - solo si NO es Montevideo */}
            {form.departamentoId && !isMontevideo && (
                <Field label="Agencia" icon={Truck} required error={fieldErrors.agenciaId}>
                    <select
                        className={`${selectClass} ${!form.agenciaId ? 'text-slate-400' : ''} ${fieldErrors.agenciaId ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`}
                        value={form.agenciaId}
                        onChange={set('agenciaId')}
                        onBlur={blur('agenciaId')}
                    >
                        <option value="">Seleccionar agencia...</option>
                        {agencies.map(a => (
                            <option key={a.ID} value={a.ID}>{a.Nombre}</option>
                        ))}
                    </select>
                    <SelectArrow />
                </Field>
            )}
        </>
    );
};
