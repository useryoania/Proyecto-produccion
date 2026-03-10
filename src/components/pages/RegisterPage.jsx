import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { User, Lock, Mail, Eye, EyeOff, UserCheck, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { API_URL } from '../../services/apiClient';
import { ClientFormFields, Field, useNomenclators, inputClass, iconClass } from '../shared/ClientFormFields';
import { Logo } from '../Logo.jsx'

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
    const [hadVendedor, setHadVendedor] = useState(false);
    const [vendedores, setVendedores] = useState([]);
    const [selectedVendedorId, setSelectedVendedorId] = useState('');
    const [selectedVendedorName, setSelectedVendedorName] = useState('');
    const navigate = useNavigate();

    // Nomenclator data via shared hook
    const fetchFn = async (url) => {
        const r = await fetch(`${API_URL}${url}`);
        return r.json();
    };
    const { departments, localities, agencies } = useNomenclators(form.departamentoId, fetchFn);

    // Determine if selected department is Montevideo
    const selectedDept = departments.find(d => String(d.ID) === String(form.departamentoId));
    const isMontevideo = selectedDept?.Nombre?.toLowerCase()?.includes('montevideo');

    // Clear agencia when switching to Montevideo
    useEffect(() => {
        if (isMontevideo) {
            setForm(f => ({ ...f, agenciaId: '' }));
        }
    }, [isMontevideo]);

    // Fetch vendedores when department changes
    useEffect(() => {
        if (form.departamentoId) {
            fetch(`${API_URL}/nomenclators/vendedores-by-department/${form.departamentoId}`)
                .then(r => r.json())
                .then(data => {
                    if (data.success) setVendedores(data.data);
                    else setVendedores([]);
                })
                .catch(() => setVendedores([]));
        } else {
            setVendedores([]);
        }
        setSelectedVendedorId('');
    }, [form.departamentoId]);

    const set = (key) => (e) => {
        const val = e.target.value;
        setForm(f => {
            const next = { ...f, [key]: val };
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
                    formaEnvioId: isMontevideo ? 1 : 2,
                    manualVendedorId: hadVendedor && selectedVendedorId ? selectedVendedorId : null
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
        <div className="min-h-screen bg-custom-dark relative font-sans py-10 px-4">
            <div className="bg-custom-dark p-10 rounded-3xl w-full max-w-lg border border-slate-100 relative z-10 mx-auto">
                <div className="flex flex-col items-center mb-6">
                    <Logo className="h-32 w-auto text-white" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* ID de Cliente */}
                    <Field label="ID de Cliente" icon={User} required error={fieldErrors.idCliente}>
                        <input type="text" className={`${inputClass} ${fieldErrors.idCliente ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`} placeholder="Ej: Tu ID" value={form.idCliente} onChange={set('idCliente')} onBlur={handleBlur('idCliente')} />
                    </Field>

                    {/* Email */}
                    <Field label="Email" icon={Mail} required error={fieldErrors.email}>
                        <input type="email" className={`${inputClass} ${fieldErrors.email ? 'border-custom-magenta focus:ring-brand-magenta focus:border-custom-magenta' : ''}`} placeholder="tu@email.com" value={form.email} onChange={set('email')} onBlur={handleBlur('email')} />
                    </Field>

                    {/* Contraseña | Confirmar Contraseña */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-100 uppercase tracking-wider ml-1">Contraseña <span className="text-custom-magenta">*</span></label>
                            <div className="relative group">
                                <div className={iconClass}><Lock size={18} /></div>
                                <input type={showPassword ? "text" : "password"} className={`${inputClass} ${fieldErrors.password ? 'border-custom-magenta focus:ring-custom-magenta focus:border-custom-magenta' : ''}`} placeholder="********" value={form.password} onChange={set('password')} onBlur={handleBlur('password')} />
                            </div>
                            {fieldErrors.password && <p className="text-custom-magenta text-xs font-semibold ml-1 mt-0.5">{fieldErrors.password}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-100 uppercase tracking-wider ml-1">Confirmar <span className="text-custom-magenta">*</span></label>
                            <div className="relative group">
                                <div className={iconClass}><Lock size={18} /></div>
                                <input type={showPassword ? "text" : "password"} className={`${inputClass} ${fieldErrors.confirmPassword ? 'border-custom-magenta focus:ring-custom-magenta focus:border-custom-magenta' : ''}`} placeholder="********" value={form.confirmPassword} onChange={set('confirmPassword')} onBlur={handleBlur('confirmPassword')} />
                                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-cyan hover:text-custom-cyan cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && <p className="text-custom-magenta text-xs font-semibold ml-1 mt-0.5">{fieldErrors.confirmPassword}</p>}
                        </div>
                    </div>

                    {/* Shared client fields */}
                    <ClientFormFields
                        form={form}
                        set={set}
                        fieldErrors={fieldErrors}
                        handleBlur={handleBlur}
                        departments={departments}
                        localities={localities}
                        agencies={agencies}
                        isMontevideo={isMontevideo}
                    />

                    {/* Vendedor checkbox + SweetAlert picker */}
                    <div className={`bg-brand-dark border border-brand-cyan rounded-2xl p-4 space-y-3 ${!form.departamentoId || !form.localidadId ? 'opacity-50' : ''}`}>
                        <label className={`flex items-center gap-3 select-none ${!form.departamentoId || !form.localidadId ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={hadVendedor}
                                disabled={!form.departamentoId || !form.localidadId}
                                onChange={async (e) => {
                                    if (e.target.checked) {
                                        if (vendedores.length === 0) {
                                            Swal.fire({ title: 'Sin asesores', text: 'No hay asesores disponibles para este departamento.', icon: 'info', background: '#212121', color: '#f4f4f5' });
                                            return;
                                        }
                                        // Build HTML grid with photos
                                        const asesorModules = import.meta.glob('/src/assets/images/asesores/*.svg', { eager: true });
                                        const grid = vendedores.map(v => {
                                            const key = Object.keys(asesorModules).find(k => k.includes(String(v.Cedula)));
                                            const imgUrl = key ? asesorModules[key].default : '';
                                            return `<div class="swal-asesor" data-id="${v.ID}" data-nombre="${v.Nombre}" style="display:flex;align-items:center;gap:14px;padding:14px 18px;border:1px solid #006E97;border-radius:50px;cursor:pointer;transition:all 0.2s;background:#212121;">
                                                ${imgUrl ? `<img src="${imgUrl}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0" />` : `<div style="width:64px;height:64px;border-radius:50%;background:#006E97;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#f4f4f5;font-weight:bold;font-size:22px">${v.Nombre.charAt(0)}</div>`}
                                                <span style="font-weight:600;color:#f4f4f5;font-size:15px">${v.Nombre}</span>
                                            </div>`;
                                        }).join('');

                                        const selected = await new Promise((resolve) => {
                                            Swal.fire({
                                                title: 'Seleccioná tu asesor',
                                                html: `<div style="display:flex;flex-direction:column;gap:8px;max-height:420px;overflow-y:auto;padding:4px">${grid}</div>`,
                                                showConfirmButton: false,
                                                showCancelButton: true,
                                                cancelButtonText: 'Cancelar',
                                                background: '#19181B',
                                                color: '#f4f4f5',
                                                didOpen: () => {
                                                    const items = Swal.getPopup().querySelectorAll('.swal-asesor');
                                                    items.forEach(el => {
                                                        el.addEventListener('mouseenter', () => { el.style.background = '#006E97'; el.style.borderColor = '#00AEEF'; });
                                                        el.addEventListener('mouseleave', () => { el.style.background = '#212121'; el.style.borderColor = '#006E97'; });
                                                        el.addEventListener('click', () => {
                                                            resolve({ id: el.dataset.id, nombre: el.dataset.nombre });
                                                            Swal.close();
                                                        });
                                                    });
                                                },
                                            }).then((result) => {
                                                if (result.dismiss) resolve(null);
                                            });
                                        });

                                        if (selected) {
                                            setHadVendedor(true);
                                            setSelectedVendedorId(selected.id);
                                            setSelectedVendedorName(selected.nombre);
                                        }
                                        // If cancelled, don't check
                                    } else {
                                        setHadVendedor(false);
                                        setSelectedVendedorId('');
                                        setSelectedVendedorName('');
                                    }
                                }}
                                className="w-4 h-4 rounded border-brand-cyan text-custom-cyan focus:ring-custom-cyan disabled:cursor-not-allowed"
                            />
                            <span className="text-sm font-semibold text-zinc-300">¿Fuiste atendido por algún asesor?</span>
                        </label>

                        {hadVendedor && selectedVendedorName && (
                            <div className="flex items-center gap-3 mt-2 p-3 bg-brand-dark border border-custom-cyan rounded-xl">
                                <UserCheck size={18} className="text-custom-cyan" />
                                <span className="text-sm font-semibold text-zinc-100">{selectedVendedorName}</span>
                                <button type="button" className="ml-auto text-xs text-zinc-500 hover:text-custom-magenta" onClick={() => { setHadVendedor(false); setSelectedVendedorId(''); setSelectedVendedorName(''); }}>✕</button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-custom-magenta p-3 rounded-xl text-xs font-bold flex items-center gap-2 justify-center animate-pulse">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-100">
                            <CheckCircle2 size={14} />
                            {success}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full py-3.5 bg-brand-cyan hover:bg-custom-cyan text-zinc-100 rounded-xl font-bold shadow-lg shadow-zinc-900 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2"
                        isLoading={isLoading}
                    >
                        Crear Cuenta
                    </Button>

                    <p className="text-center text-sm text-zinc-500">
                        ¿Ya tenés cuenta?{' '}
                        <a href="/login" className="font-bold text-brand-cyan hover:text-custom-cyan transition-colors">
                            Iniciá sesión
                        </a>
                    </p>
                </form>
            </div >
        </div >
    );
};

export default RegisterPage;
