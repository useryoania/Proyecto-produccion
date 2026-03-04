import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../aspecto/Login.css';
import userIcon from '../imagenes/user.svg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apilogin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
  
      if (response.ok) {
        const data = await response.json();
  
        // Guardar token y rol en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role); // Guardar el rol del usuario
  
        alert('Login exitoso');
        navigate('/'); // Redirige al inicio
        window.location.reload(); // Recarga la página para actualizar el Navbar
      } else {
        setError('Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error en la conexión');
    }
  };
  

  const handleRegisterRedirect = () => {
    navigate('/register-admin'); // Redirige a la página de registro de administrador
  };

  return (
    <div className="full-screen-container">
      <div className="login-container">
        <div className="login-box">
          <div className="login-icon">
            <img src={userIcon} alt="User Icon" />
          </div>
          <h2 className="login-title">Iniciar Sesión</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="login-button">Ingresar</button>
            <button type="button" className="register-button" onClick={handleRegisterRedirect}>
              Crear Usuario
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
