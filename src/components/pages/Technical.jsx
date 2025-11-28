import React from 'react';
import { useApp } from '../contexts/AppContext';
import './Technical.module.css';

const Technical = () => {
  const { currentView } = useApp();

  if (currentView !== 'technical') return null;

  return (
    <div className="technical-page">
      <div className="technical-header">
        <h1 className="technical-title">
          <i className="fa-solid fa-screwdriver-wrench"></i>
          Servicio Técnico
        </h1>
        <p className="technical-subtitle">Gestión de máquinas y mantenimiento</p>
      </div>

      <div className="technical-content">
        <div className="technical-grid">
          <div className="technical-card">
            <div className="technical-card-header">
              <i className="fa-solid fa-print technical-card-icon"></i>
              <h3>Inventario de Máquinas</h3>
            </div>
            <p>Gestiona el estado y mantenimiento de todas las máquinas</p>
            <div className="technical-stats">
              <div className="stat">
                <span className="stat-value">12</span>
                <span className="stat-label">Máquinas</span>
              </div>
              <div className="stat">
                <span className="stat-value stat-warning">2</span>
                <span className="stat-label">Con fallas</span>
              </div>
            </div>
          </div>

          <div className="technical-card">
            <div className="technical-card-header">
              <i className="fa-solid fa-ticket technical-card-icon"></i>
              <h3>Sistema de Tickets</h3>
            </div>
            <p>Reporta y sigue problemas técnicos</p>
            <div className="technical-stats">
              <div className="stat">
                <span className="stat-value">8</span>
                <span className="stat-label">Activos</span>
              </div>
              <div className="stat">
                <span className="stat-value stat-success">24</span>
                <span className="stat-label">Resueltos</span>
              </div>
            </div>
          </div>

          <div className="technical-card">
            <div className="technical-card-header">
              <i className="fa-solid fa-list-check technical-card-icon"></i>
              <h3>Proyectos</h3>
            </div>
            <p>Seguimiento de proyectos de mantenimiento</p>
            <div className="technical-stats">
              <div className="stat">
                <span className="stat-value">3</span>
                <span className="stat-label">Activos</span>
              </div>
              <div className="stat">
                <span className="stat-value">65%</span>
                <span className="stat-label">Progreso</span>
              </div>
            </div>
          </div>
        </div>

        <div className="technical-coming-soon">
          <div className="coming-soon-content">
            <i className="fa-solid fa-tools coming-soon-icon"></i>
            <h3>Módulo en Desarrollo</h3>
            <p>El sistema completo de servicio técnico estará disponible próximamente con:</p>
            <ul className="feature-list">
              <li>Gestión completa de máquinas</li>
              <li>Sistema de tickets avanzado</li>
              <li>Planificación de mantenimiento</li>
              <li>Reportes técnicos detallados</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Technical;