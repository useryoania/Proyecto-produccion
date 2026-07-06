import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/apiClient';
import { Palette, CheckCircle } from 'lucide-react';

/**
 * Registro público de diseñadores. La cuenta queda pendiente de aprobación por USER
 * (Disenadores.Aprobado = 0); una vez aprobada, el diseñador entra por el login normal.
 */
export const DesignerRegister = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ nombre: '', email: '', telefono: '', password: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.nombre.trim() || !form.email.trim() || !form.password) {
            return setError('Nombre, email y contraseña son obligatorios.');
        }
        if (form.password !== form.confirm) {
            return setError('Las contraseñas no coinciden.');
        }
        setLoading(true);
        try {
            await apiClient.post('/web-designer/register', {
                nombre: form.nombre,
                email: form.email,
                telefono: form.telefono,
                password: form.password,
            });
            setDone(true);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Error en el registro.');
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
                <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-100 text-center">
                    <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-lg font-black text-gray-800 mb-2">¡Registro enviado!</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Tu cuenta de diseñador queda <b>pendiente de aprobación por USER</b>.
                        Te avisaremos cuando esté activa y puedas ingresar con tu email y contraseña.
                    </p>
                    <button onClick={() => navigate('/login')} className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors">
                        Ir al login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-100">
                <div className="flex items-center gap-3 mb-1">
                    <Palette size={28} className="text-cyan-500" />
                    <h2 className="text-lg font-black text-gray-800 uppercase">Registro de Diseñador</h2>
                </div>
                <p className="text-xs text-gray-500 mb-6">
                    Creá tu cuenta para subir pedidos en nombre de los clientes que te autoricen desde su perfil.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input type="text" placeholder="Nombre y apellido *" value={form.nombre} onChange={set('nombre')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-400" />
                    <input type="email" placeholder="Email * (va a ser tu usuario)" value={form.email} onChange={set('email')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-400" />
                    <input type="tel" placeholder="Teléfono" value={form.telefono} onChange={set('telefono')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-400" />
                    <input type="password" placeholder="Contraseña *" value={form.password} onChange={set('password')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-400" />
                    <input type="password" placeholder="Repetir contraseña *" value={form.confirm} onChange={set('confirm')}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-400" />

                    {error && <p className="text-xs font-bold text-red-500">{error}</p>}

                    <button type="submit" disabled={loading}
                        className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50 mt-1">
                        {loading ? 'Enviando...' : 'Registrarme como diseñador'}
                    </button>
                    <button type="button" onClick={() => navigate('/login')}
                        className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                        Ya tengo cuenta → Ir al login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DesignerRegister;
