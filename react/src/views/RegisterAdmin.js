import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../aspecto/Register.css';

const RegisterUser = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(''); // Almacena el rol seleccionado
  const [roles, setRoles] = useState([]); // Almacena los roles obtenidos de la base de datos
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Llamada al backend para obtener los roles
    const fetchRoles = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apilogin/roles`);
        if (response.ok) {
          const data = await response.json();
          setRoles(data); // Guardamos los roles en el estado
        } else {
          console.error('Error al obtener roles');
        }
      } catch (error) {
        console.error('Error al conectarse con el backend:', error);
      }
    };

    fetchRoles();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/apilogin/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          role,
          adminSecret, // Enviamos el código de administración
        }),
      });

      if (response.ok) {
        setSuccessMessage('Usuario creado con éxito');
        setTimeout(() => navigate('/login'), 2000); // Redirige al login después de 2 segundos
      } else {
        const data = await response.json();
        setError(data.error || 'Error al crear el usuario');
      }
    } catch (err) {
      setError('Error en la conexión');
    }
  };

  return (
    <div className="full-screen-container">
      <div className="register-container">
        <h2 className="register-title">Registrar Usuario</h2>
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese un nombre de usuario"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese una contraseña"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme la contraseña"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="role">Rol</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="">Seleccione un rol</option>
              {roles.map((rol) => (
                <option key={rol.RolIdRol} value={rol.RolDescripcionRol}>
                  {rol.RolDescripcionRol}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="adminSecret">Código de Administración</label>
            <input
              type="password"
              id="adminSecret"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="Ingrese el código de administración"
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          {successMessage && <p className="success">{successMessage}</p>}
          <button type="submit" className="register-button">Registrar</button>
        </form>
      </div>
    </div>
  );
};

export default RegisterUser;
