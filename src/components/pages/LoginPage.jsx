import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button.jsx';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Por favor, completa todos los campos.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError('Credenciales inválidas. Por favor, intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans">

            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 via-magenta-500 to-yellow-400 z-50"></div>
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-200 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute top-40 -left-20 w-72 h-72 bg-magenta-200 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-yellow-100 rounded-full blur-3xl opacity-40"></div>

            <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/50 w-full max-w-md border border-slate-100 relative z-10 backdrop-blur-sm bg-white/90">
                <div className="flex flex-col items-center mb-8">
                    <img src="/assets/images/logo.png" alt="User Logo" className="w-64 h-auto mb-4 object-contain" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Usuario</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-600 transition-colors">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 focus:bg-white transition-all outline-none font-semibold text-slate-700 placeholder-slate-400"
                                placeholder="Ingresá tu usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Contraseña</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-magenta-600 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-magenta-300 focus:border-magenta-400 focus:bg-white transition-all outline-none font-semibold text-slate-700 placeholder-slate-400"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 animate-pulse">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-2"
                        isLoading={isLoading}
                    >
                        Ingresar al Sistema <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Sistema de Producción v2.0
                    </p>
                    <div className="flex justify-center gap-2 mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-magenta-500"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;