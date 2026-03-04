import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../aspecto/Navbar.css';

// Importa los íconos
import infoIcon from '../iconos/informacion.svg';
import graficaIcon from '../iconos/data.svg';
import depositoIcon from '../iconos/BaseDeposito.svg';
import camionIcon from '../iconos/carga_de_deposito.svg';
import estrellaIcon from '../iconos/clientes_especiales.svg';
import dineroIcon from '../iconos/precios_de_productos.svg';
import descuentoIcon from '../iconos/descuento_y_recargos.svg';
import facturaIcon from '../iconos/Factura_clientes_semanales.svg';
import ticketIcon from '../iconos/tiket_de_entrega.svg';
import autogestionIcon from '../iconos/auto_gestion.svg';
import entregadepedido from '../iconos/entrega_de_pedido.svg';
import ORDENES_DE_RETIRO from '../iconos/ORDENES_DE_RETIRO.svg';
import aviso from '../iconos/aviso.svg';
import ODR from '../iconos/papelODR.svg';
import Caja from '../iconos/caja.svg';
import cerrarSesionIcon from '../iconos/cerrar_sesion.svg';
import EntregaCoordinada from '../iconos/Entrega_coordinada.svg';

// Constantes de Rutas Permitidas para Ocultar Navbar
const NAVBAR_HIDE_ROUTES = ['/ticket_autogestion', '/pantalla_de_recepcion'];

function Navbar() {
  const [isActive, setIsActive] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVisible, setIsVisible] = useState(() => {
    const savedVisibility = localStorage.getItem('navbarVisibility');
    return savedVisibility !== null ? JSON.parse(savedVisibility) : true;
  });
  const [userRole, setUserRole] = useState(null);

  const navRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Determina si el Navbar debe ser ocultable
  const isNavbarHideRoute = NAVBAR_HIDE_ROUTES.includes(location.pathname);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    setIsAuthenticated(!!token);
    setUserRole(role);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === '7' && isNavbarHideRoute) {
        setIsVisible((prev) => !prev); // Alternar visibilidad del Navbar
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isNavbarHideRoute]);

  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setIsActive(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setUserRole(null);
    alert('Sesión cerrada');
    navigate('/login');
  };

  const routes = [
    { path: '/about', icon: infoIcon, label: 'Acerca de', roles: ['Super Usuario', 'Administrativo/a', 'Cajero/a', 'Atención al Cliente', 'OP Depósito'], showInNavbar: true },
    { path: '/data', icon: graficaIcon, label: 'Datos', roles: ['Super Usuario', 'Administrativo/a'], showInNavbar: true },
    { path: '/BaseDeposito', icon: depositoIcon, label: 'Depósito', roles: ['Super Usuario', 'Administrativo/a', 'Cajero/a', 'Atención al Cliente', 'OP Depósito'], showInNavbar: true },
    { path: '/ControlVentas', icon: depositoIcon, label: 'ControlVentas', roles: ['Super Usuario'], showInNavbar: true },
    { path: '/carga_de_deposito', icon: camionIcon, label: 'Carga', roles: ['Super Usuario', 'Administrativo/a', 'OP Depósito'], showInNavbar: true },
    { path: '/cliente', icon: estrellaIcon, label: 'Clientes', roles: ['Super Usuario', 'Administrativo/a'], showInNavbar: true },
    { path: '/precios_de_productos', icon: dineroIcon, label: 'Precios', roles: ['Super Usuario', 'Administrativo/a','Cajero/a'], showInNavbar: true },
    { path: '/descuento_y_recargos', icon: descuentoIcon, label: 'Descuento', roles: ['Super Usuario', 'Administrativo/a'], showInNavbar: true },
    { path: '/Factura_clientes_semanales', icon: facturaIcon, label: 'Factura', roles: ['Super Usuario', 'Administrativo/a'], showInNavbar: true },
    { path: '/tiket_de_entrega', icon: ticketIcon, label: 'Entrega', roles: ['Super Usuario', 'Administrativo/a', 'Cajero/a', 'Atención al Cliente'], showInNavbar: true },
    { path: '/entrega_de_pedido', icon: ORDENES_DE_RETIRO, label: 'Entrega de Pedido', roles: ['Super Usuario', 'Administrativo/a', 'OP Depósito'], showInNavbar: true },
    { path: '/aviso', icon: aviso, label: 'Aviso', roles: ['Super Usuario', 'Administrativo/a', 'Cajero/a', 'Atención al Cliente'], showInNavbar: true },
    { path: '/ordenes_de_retiro', icon: ODR, label: 'ODR', roles: ['Super Usuario', 'Administrativo/a','Cajero/a'], showInNavbar: true },
    { path: '/Caja', icon: Caja, label: 'Caja', roles: ['Super Usuario', 'Administrativo/a', 'Cajero/a'], showInNavbar: true },
    { path: '/ticket_autogestion', icon: autogestionIcon, label: 'Auto Gestión', roles: ['Super Usuario', 'Administrativo/a','Publico','Atención al Cliente','Cajero/a'], showInNavbar: true },
    { path: '/RecepcionDeEntrega', icon: entregadepedido, label: 'Recepción de Entrega', roles: ['Super Usuario', 'Administrativo/a', 'OP Depósito'], showInNavbar: true },
    { path: '/pantalla_de_recepcion', icon: null, label: 'Recepción', roles: ['Super Usuario', 'Administrativo/a', 'Publico'], showInNavbar: false },
    { path: '/entrega_coordinada', icon: EntregaCoordinada, label: 'Entrega Coordinada', roles: ['Super Usuario', 'Administrativo/a', 'Publico'], showInNavbar: true },
  ];

  const handleNavbarClick = (e) => {
    if (e.target.closest('.link-icon')) {
      return;
    }
    setIsActive(!isActive);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <nav
      ref={navRef}
      className={`navbar ${isActive ? 'active' : ''}`}
      onClick={handleNavbarClick}
      style={{ overflowY: 'auto', top: 0, maxHeight: '100vh', cursor: 'pointer' }}
    >
      <ul id="menu" className={isActive ? 'expanded' : 'collapsed'}>
        {isAuthenticated &&
          routes
          .filter(route => route.showInNavbar && route.roles.includes(userRole))
          .map((route, index) => (
            <li key={index}>
              <Link to={route.path} className="link-icon">
                {route.icon && <img src={route.icon} alt={route.label} style={{ width: '24px', height: '24px' }} />}
                {isActive && <span style={{ fontSize: '12px' }}>{route.label}</span>}
              </Link>
            </li>
          ))}
          {isAuthenticated && (
            <li>
              <img
                src={cerrarSesionIcon}
                alt="Cerrar Sesión"
                onClick={handleLogout}
                className="logout-button link-icon"
                style={{ width: '24px', height: '24px' }}
              />
              {isActive && <span>Cerrar Sesión</span>}
            </li>
          )}
      </ul>
    </nav>
  );
}

export default Navbar;
