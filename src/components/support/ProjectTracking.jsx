import React, { useState } from 'react';
import './ProjectTracking.css';

const ProjectTracking = ({ projects, onProjectUpdate, onAddProject, onDeleteProject }) => {
  const [filter, setFilter] = useState('ALL');
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    tech: '',
    priority: 'MEDIA'
  });
  const [newUpdate, setNewUpdate] = useState('');

  const filteredProjects = projects.filter(project => {
    if (filter === 'ALL') return true;
    return project.status === filter;
  });

  const handleAddProject = () => {
    if (newProject.title && newProject.tech) {
      onAddProject({
        ...newProject,
        id: `P-${Date.now()}`,
        status: 'PENDIENTE',
        progress: 0,
        updates: [],
        createdAt: new Date().toISOString()
      });
      setNewProject({ title: '', description: '', tech: '', priority: 'MEDIA' });
    }
  };

  const handleAddUpdate = (projectId) => {
    if (newUpdate.trim()) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const updatedProject = {
          ...project,
          updates: [...project.updates, {
            id: `U-${Date.now()}`,
            text: newUpdate,
            date: new Date().toLocaleDateString('es-ES'),
            time: new Date().toLocaleTimeString('es-ES')
          }]
        };
        onProjectUpdate(projectId, updatedProject);
        setNewUpdate('');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVO': return 'projectTrackingStatusActive';
      case 'COMPLETADO': return 'projectTrackingStatusCompleted';
      case 'PENDIENTE': return 'projectTrackingStatusPending';
      case 'PLANIFICACION': return 'projectTrackingStatusPlanning';
      default: return 'projectTrackingStatusPending';
    }
  };

  const getProgressColor = (progress) => {
    if (progress < 30) return 'projectTrackingProgressLow';
    if (progress < 70) return 'projectTrackingProgressMedium';
    return 'projectTrackingProgressHigh';
  };

  const handleProgressChange = (projectId, newProgress) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      onProjectUpdate(projectId, { ...project, progress: newProgress });
    }
  };

  return (
    <div className="projectTracking">
      {/* Header */}
      <div className="projectTrackingHeader">
        <h3 className="projectTrackingTitle">
          <i className="fa-solid fa-diagram-project"></i>
          Seguimiento de Proyectos
        </h3>
        
        <div className="projectTrackingFilters">
          <button
            className={`projectTrackingFilterButton ${filter === 'ALL' ? 'projectTrackingFilterActive' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            Todos ({projects.length})
          </button>
          <button
            className={`projectTrackingFilterButton ${filter === 'ACTIVO' ? 'projectTrackingFilterActive' : ''}`}
            onClick={() => setFilter('ACTIVO')}
          >
            Activos ({projects.filter(p => p.status === 'ACTIVO').length})
          </button>
          <button
            className={`projectTrackingFilterButton ${filter === 'COMPLETADO' ? 'projectTrackingFilterActive' : ''}`}
            onClick={() => setFilter('COMPLETADO')}
          >
            Completados ({projects.filter(p => p.status === 'COMPLETADO').length})
          </button>
          <button
            className={`projectTrackingFilterButton ${filter === 'PENDIENTE' ? 'projectTrackingFilterActive' : ''}`}
            onClick={() => setFilter('PENDIENTE')}
          >
            Pendientes ({projects.filter(p => p.status === 'PENDIENTE').length})
          </button>
        </div>

        <button className="projectTrackingAddButton" onClick={handleAddProject}>
          <i className="fa-solid fa-plus"></i>
          Nuevo Proyecto
        </button>
      </div>

      {/* New Project Form */}
      <div className="projectTrackingNewForm">
        <h4 className="projectTrackingFormTitle">Crear Nuevo Proyecto</h4>
        <div className="projectTrackingFormGrid">
          <input
            type="text"
            placeholder="Título del proyecto..."
            value={newProject.title}
            onChange={(e) => setNewProject({...newProject, title: e.target.value})}
            className="projectTrackingFormInput"
          />
          <input
            type="text"
            placeholder="Responsable técnico..."
            value={newProject.tech}
            onChange={(e) => setNewProject({...newProject, tech: e.target.value})}
            className="projectTrackingFormInput"
          />
          <select
            value={newProject.priority}
            onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
            className="projectTrackingFormSelect"
          >
            <option value="ALTA">Alta Prioridad</option>
            <option value="MEDIA">Media Prioridad</option>
            <option value="BAJA">Baja Prioridad</option>
          </select>
          <button 
            className="projectTrackingSubmitButton"
            onClick={handleAddProject}
            disabled={!newProject.title || !newProject.tech}
          >
            Crear Proyecto
          </button>
        </div>
        <textarea
          placeholder="Descripción del proyecto..."
          value={newProject.description}
          onChange={(e) => setNewProject({...newProject, description: e.target.value})}
          className="projectTrackingFormTextarea"
        />
      </div>

      {/* Projects Grid */}
      <div className="projectTrackingProjectsGrid">
        {filteredProjects.map(project => (
          <div key={project.id} className="projectTrackingProjectCard">
            {/* Header */}
            <div className="projectTrackingProjectHeader">
              <div className="projectTrackingProjectInfo">
                <span className="projectTrackingProjectId">{project.id}</span>
                <h4 className="projectTrackingProjectTitle">{project.title}</h4>
              </div>
              <div className="projectTrackingProjectMeta">
                <span className="projectTrackingProjectTech">{project.tech}</span>
                <span className={`projectTrackingProjectStatus ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <div className="projectTrackingProjectDescription">
                <p className="projectTrackingDescriptionText">{project.description}</p>
              </div>
            )}

            {/* Progress */}
            <div className="projectTrackingProgressSection">
              <div className="projectTrackingProgressHeader">
                <span className="projectTrackingProgressLabel">Progreso</span>
                <span className="projectTrackingProgressPercentage">{project.progress}%</span>
              </div>
              <div className="projectTrackingProgressBar">
                <div 
                  className={`projectTrackingProgressFill ${getProgressColor(project.progress)}`}
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
              <div className="projectTrackingProgressControls">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={project.progress}
                  onChange={(e) => handleProgressChange(project.id, parseInt(e.target.value))}
                  className="projectTrackingProgressSlider"
                />
              </div>
            </div>

            {/* Updates */}
            <div className="projectTrackingUpdatesSection">
              <h5 className="projectTrackingUpdatesTitle">
                <i className="fa-solid fa-list-check"></i>
                Bitácora de Avances
              </h5>
              
              <div className="projectTrackingUpdatesList">
                {project.updates && project.updates.length > 0 ? (
                  project.updates.map(update => (
                    <div key={update.id} className="projectTrackingUpdateItem">
                      <div className="projectTrackingUpdateDate">
                        {update.date}
                      </div>
                      <div className="projectTrackingUpdateText">
                        {update.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="projectTrackingNoUpdates">No hay avances registrados</p>
                )}
              </div>

              {/* Add Update Form */}
              <div className="projectTrackingUpdateForm">
                <input
                  type="text"
                  placeholder="Registrar nuevo avance..."
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddUpdate(project.id)}
                  className="projectTrackingUpdateInput"
                />
                <button 
                  className="projectTrackingUpdateButton"
                  onClick={() => handleAddUpdate(project.id)}
                  disabled={!newUpdate.trim()}
                >
                  <i className="fa-solid fa-paper-plane"></i>
                  Agregar
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="projectTrackingActions">
              <button 
                className="projectTrackingActionButton"
                onClick={() => setSelectedProject(project)}
              >
                <i className="fa-solid fa-eye"></i>
                Detalles
              </button>
              <button 
                className="projectTrackingActionButton"
                onClick={() => onProjectUpdate(project.id, { ...project, status: 'COMPLETADO', progress: 100 })}
              >
                <i className="fa-solid fa-check"></i>
                Completar
              </button>
              <button 
                className="projectTrackingDeleteButton"
                onClick={() => onDeleteProject(project.id)}
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="projectTrackingEmptyState">
          <i className="fa-solid fa-diagram-project text-gray-300 text-4xl mb-4"></i>
          <h3 className="projectTrackingEmptyTitle">
            {filter === 'ALL' ? 'No hay proyectos registrados' : `No hay proyectos en estado "${filter}"`}
          </h3>
          <p className="projectTrackingEmptyText">
            {filter === 'ALL' 
              ? 'Comienza creando tu primer proyecto' 
              : 'Los proyectos en este estado aparecerán aquí'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectTracking;