import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { User, Lock, Mail, Eye, EyeOff, Phone, MapPin, FileText, Building, ChevronDown, Truck } from 'lucide-react';
import { API_URL } from '../../services/apiClient';

const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 focus:bg-white transition-all outline-none font-semibold text-slate-700 placeholder-slate-400";
const selectClass = "w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 focus:bg-white transition-all outline-none font-semibold text-slate-700 appearance-none cursor-pointer";
const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider ml-1";
const iconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-600 transition-colors";

const Field = ({ label, icon: Icon, required, error, children }) => (
    <div className="space-y-1">
        <label className={labelClass}>
            {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="relative group">
            <div className={iconClass}><Icon size={18} /></div>
            {children}
        </div>
        {error && <p className="text-red-500 text-xs font-semibold ml-1 mt-0.5">{error}</p>}
    </div>
);

const SelectArrow = () => (
    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
        <ChevronDown size={16} />
    </div>
);

const RegisterPage = () => {
    const [form, setForm] = useState({
        idCliente: '', email: '', password: '', confirmPassword: '',
        nombre: '', apellido: '', telefono: '',
        razonSocial: '', rut: '', documento: '',
        direccion: '', departamentoId: '', localidadId: '', agenciaId: ''
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Nomenclator data
    const [departments, setDepartments] = useState([]);
    const [localities, setLocalities] = useState([]);
    const [agencies, setAgencies] = useState([]);

    // Determine if selected department is Montevideo
    const selectedDept = departments.find(d => String(d.ID) === String(form.departamentoId));
    const isMontevideo = selectedDept?.Nombre?.toLowerCase()?.includes('montevideo');

    // Fetch departments on mount
    useEffect(() => {
        fetch(`${API_URL}/nomenclators/departments`)
            .then(r => r.json())
            .then(data => { if (data.success) setDepartments(data.data); })
            .catch(() => { });
    }, []);

    // Fetch agencies on mount
    useEffect(() => {
        fetch(`${API_URL}/nomenclators/agencies`)
            .then(r => r.json())
            .then(data => { if (data.success) setAgencies(data.data); })
            .catch(() => { });
    }, []);

    // Fetch localities when department changes
    useEffect(() => {
        if (!form.departamentoId) {
            setLocalities([]);
            return;
        }
        fetch(`${API_URL}/nomenclators/localities/${form.departamentoId}`)
            .then(r => r.json())
            .then(data => { if (data.success) setLocalities(data.data); })
            .catch(() => { });
    }, [form.departamentoId]);

    // Clear agencia when switching to Montevideo
    useEffect(() => {
        if (isMontevideo) {
            setForm(f => ({ ...f, agenciaId: '' }));
        }
    }, [isMontevideo]);

    const set = (key) => (e) => {
        const val = e.target.value;
        setForm(f => {
            const next = { ...f, [key]: val };
            // Reset localidad when department changes
            if (key === 'departamentoId') {
                next.localidadId = '';
                next.agenciaId = '';
            }
            return next;
        });
        if (fieldErrors[key]) {
            setFieldErrors(fe => ({ ...fe, [key]: '' }));
        }
    };

    const validateField = (key, value) => {
        const v = typeof value === 'string' ? value.trim() : String(value || '');
        const required = ['idCliente', 'email', 'password', 'confirmPassword', 'nombre', 'apellido', 'telefono', 'direccion', 'departamentoId', 'localidadId'];

        // Agencia is required only when NOT Montevideo
        if (key === 'agenciaId' && !isMontevideo && !v) {
            return 'Seleccioná una agencia';
        }

        if (required.includes(key) && !v) {
            return 'Este campo es obligatorio';
        }

        switch (key) {
            case 'email':
                if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
                    return 'Email inválido';
                break;
            case 'password':
                if (v && v.length < 4)
                    return 'Mínimo 4 caracteres';
                break;
            case 'confirmPassword':
                if (v && v !== form.password)
                    return 'Las contraseñas no coinciden';
                break;
            case 'telefono':
                if (v && !/^[+\d\s()-]{6,20}$/.test(v))
                    return 'Teléfono inválido';
                break;
        }
        return '';
    };

    const handleBlur = (key) => () => {
        const err = validateField(key, form[key]);
        setFieldErrors(fe => ({ ...fe, [key]: err }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate all fields
        const allKeys = Object.keys(form);
        const errors = {};
        let hasError = false;
        for (const key of allKeys) {
            const err = validateField(key, form[key]);
            if (err) {
                errors[key] = err;
                hasError = true;
            }
        }
        setFieldErrors(errors);

        if (hasError) {
            setError('Corregí los errores marcados en el formulario.');
            return;
        }

        // Resolve names from IDs for text fields
        const depName = selectedDept?.Nombre || '';
        const locName = localities.find(l => String(l.ID) === String(form.localidadId))?.Nombre || '';
        const ageName = agencies.find(a => String(a.ID) === String(form.agenciaId))?.Nombre || '';

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/web-auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idcliente: form.idCliente,
                    name: form.nombre,
                    email: form.email,
                    password: form.password,
                    company: form.razonSocial,
                    phone: form.telefono,
                    address: form.direccion,
                    ruc: form.rut,
                    fantasyName: `${form.nombre} ${form.apellido}`,
                    documento: form.documento,
                    departamentoId: form.departamentoId ? parseInt(form.departamentoId) : null,
                    localidadId: form.localidadId ? parseInt(form.localidadId) : null,
                    agenciaId: form.agenciaId ? parseInt(form.agenciaId) : null,
                    localidad: locName,
                    agencia: ageName,
                    formaEnvioId: isMontevideo ? 1 : 2
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess('¡Cuenta creada exitosamente! Redirigiendo al login...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(data.message || data.error || 'Error al registrar la cuenta.');
            }
        } catch (err) {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    // Override global body overflow:hidden for this page
    useEffect(() => {
        document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = 'hidden'; };
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 relative font-sans py-10 px-4">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 via-magenta-500 to-yellow-400 z-50"></div>

            <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/50 w-full max-w-lg border border-slate-100 relative z-10 mx-auto">
                <div className="flex flex-col items-center mb-6">
                    <img src="/assets/images/logo.png" alt="Logo" className="w-48 h-auto mb-4 object-contain" />
                    <h2 className="text-xl font-bold text-slate-800">Crear cuenta</h2>
                    <p className="text-sm text-slate-400">Registrate con tu ID de Cliente</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* ID de Cliente */}
                    <Field label="ID de Cliente" icon={User} required error={fieldErrors.idCliente}>
                        <input type="text" className={`${inputClass} ${fieldErrors.idCliente ? 'border-red-400 focus:ring-red-300' : ''}`} placeholder="Ej: Kasak-1899" value={form.idCliente} onChange={set('idCliente')} onBlur={handleBlur('idCliente')} />
                    </Field>

                    {/* Email */}
                    <Field label="Email" icon={Mail} required error={fieldErrors.email}>
                        <input type="email" className={`${inputClass} ${fieldErrors.email ? 'border-red-400 focus:ring-red-300' : ''}`} placeholder="tu@email.com" value={form.email} onChange={set('email')} onBlur={handleBlur('email')} />
                    </Field>

                    {/* Contraseña | Confirmar Contraseña */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className={labelClass}>Contraseña <span className="text-red-400">*</span></label>
                            <div className="relative group">
                                <div className={iconClass}><Lock size={18} /></div>
                                <input type={showPassword ? "text" : "password"} className={`${inputClass} ${fieldErrors.password ? 'border-red-400 focus:ring-red-300' : ''}`} placeholder="••••••••" value={form.password} onChange={set('password')} onBlur={handleBlur('password')} />
                            </div>
                            {fieldErrors.password && <p className="text-red-500 text-xs font-semibold ml-1 mt-0.5">{fieldErrors.password}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>Confirmar <span className="text-red-400">*</span></label>
                            <div className="relative group">
                                <div className={iconClass}><Lock size={18} /></div>
                                <input type={showPassword ? "text" : "password"} className={`${inputClass} ${fieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-300' : ''}`} placeholder="••••••••" value={form.confirmPassword} onChange={set('confirmPassword')} onBlur={handleBlur('confirmPassword')} />
                                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && <p className="text-red-500 text-xs font-semibold ml-1 mt-0.5">{fieldErrors.confirmPassword}</p>}
                        </div>
                    </div>

                    {/* Nombre | Apellido */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Nombre" icon={User} required error={fieldErrors.nombre}>
                            <input type="text" className={`${inputClass} ${fieldErrors.nombre ? 'border-red-400 focus:ring-red-300' : ''}`} placeholder="Juan" value={form.nombre} onChange={set('nombre')} onBlur={handleBlur('nombre')} />
                        </Field>
                        <Field label="Apellido" icon={User} required error={fieldErrors.apellido}>
                            <input type="text" className={`${inputClass} ${fieldErrors.apellido ? 'border-red-400 focus:ring-red-300' : ''}`} placeholder="Pérez" value={form.apellido} onChange={set('apellido')} onBlur={handleBlur('apellido')} />
                        </Field>
                    </div>

                    {/* Teléfono */}
                    <Field label="Teléfono" icon={Phone} required error={fieldErrors.telefono}>
                        <input type="text" className={`${inputClass} ${fieldErrors.telefono ? 'border-red-400 focus:ring-red-300' : ''}`} placeholder="099123456" value={form.telefono} onChange={set('telefono')} onBlur={handleBlur('telefono')} />
                    </Field>

                    {/* Razón Social */}
                    <Field label="Razón Social" icon={Building}>
                        <input type="text" className={inputClass} placeholder="Opcional" value={form.razonSocial} onChange={set('razonSocial')} />
                    </Field>

                    {/* RUT */}
                    <Field label="RUT" icon={FileText}>
                        <input type="text" className={inputClass} placeholder="Opcional" value={form.rut} maxLength={12} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, rut: v })); }} />
                    </Field>

                    {/* Documento de identidad */}
                    <Field label="Documento de identidad" icon={FileText}>
                        <input type="text" className={inputClass} placeholder="Sin puntos ni guiones" value={form.documento} maxLength={8} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, documento: v })); }} />
                    </Field>

                    {/* Dirección */}
                    <Field label="Dirección" icon={MapPin} required error={fieldErrors.direccion}>
                        <input type="text" className={`${inputClass} ${fieldErrors.direccion ? 'border-red-400 focus:ring-red-300' : ''}`} placeholder="Calle 123, Ciudad" value={form.direccion} onChange={set('direccion')} onBlur={handleBlur('direccion')} />
                    </Field>

                    {/* Departamento | Localidad */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Departamento" icon={MapPin} required error={fieldErrors.departamentoId}>
                            <select
                                className={`${selectClass} ${!form.departamentoId ? 'text-slate-400' : ''} ${fieldErrors.departamentoId ? 'border-red-400 focus:ring-red-300' : ''}`}
                                value={form.departamentoId}
                                onChange={set('departamentoId')}
                                onBlur={handleBlur('departamentoId')}
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
                                className={`${selectClass} ${!form.localidadId ? 'text-slate-400' : ''} ${fieldErrors.localidadId ? 'border-red-400 focus:ring-red-300' : ''}`}
                                value={form.localidadId}
                                onChange={set('localidadId')}
                                onBlur={handleBlur('localidadId')}
                                disabled={!form.departamentoId}
                            >
                                <option value="">{form.departamentoId ? 'Seleccionar...' : 'Elegí depto. primero'}</option>
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
                                className={`${selectClass} ${!form.agenciaId ? 'text-slate-400' : ''} ${fieldErrors.agenciaId ? 'border-red-400 focus:ring-red-300' : ''}`}
                                value={form.agenciaId}
                                onChange={set('agenciaId')}
                                onBlur={handleBlur('agenciaId')}
                            >
                                <option value="">Seleccionar agencia...</option>
                                {agencies.map(a => (
                                    <option key={a.ID} value={a.ID}>{a.Nombre}</option>
                                ))}
                            </select>
                            <SelectArrow />
                        </Field>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-100">
                            <i className="fa-solid fa-circle-check"></i>
                            {success}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2"
                        isLoading={isLoading}
                    >
                        Crear Cuenta
                    </Button>

                    <p className="text-center text-sm text-slate-500">
                        ¿Ya tenés cuenta?{' '}
                        <a href="/login" className="font-bold text-cyan-600 hover:text-cyan-700 transition-colors">
                            Iniciá sesión
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;
