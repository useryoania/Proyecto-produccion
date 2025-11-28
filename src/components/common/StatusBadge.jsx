import React from 'react';
import './StatusBadge.css';

const StatusBadge = ({ 
  status, 
  type = 'status', 
  size = 'default',
  showIcon = true,
  className = '',
  children 
}) => {
  const getStatusConfig = () => {
    if (type === 'priority') {
      switch (status?.toUpperCase()) {
        case 'ALTA':
        case 'HIGH':
        case 'URGENTE':
          return {
            class: 'statusBadgeHigh',
            icon: 'fa-solid fa-exclamation-triangle',
            text: status
          };
        case 'MEDIA':
        case 'MEDIUM':
        case 'NORMAL':
          return {
            class: 'statusBadgeMedium',
            icon: 'fa-solid fa-minus',
            text: status
          };
        case 'BAJA':
        case 'LOW':
        case 'MINIMA':
          return {
            class: 'statusBadgeLow',
            icon: 'fa-solid fa-arrow-down',
            text: status
          };
        default:
          return {
            class: 'statusBadgeNeutral',
            icon: 'fa-solid fa-circle',
            text: status
          };
      }
    }

    // Default status types
    switch (status?.toUpperCase()) {
      case 'COMPLETADO':
      case 'FINALIZADO':
      case 'ENTREGADO':
      case 'SUCCESS':
      case 'OK':
      case 'ACTIVE':
        return {
          class: 'statusBadgeSuccess',
          icon: 'fa-solid fa-check-circle',
          text: status
        };
      
      case 'PENDIENTE':
      case 'ESPERA':
      case 'WAITING':
      case 'PENDING':
        return {
          class: 'statusBadgeWarning',
          icon: 'fa-solid fa-clock',
          text: status
        };
      
      case 'ERROR':
      case 'FALLA':
      case 'FAILED':
      case 'CANCELADO':
        return {
          class: 'statusBadgeError',
          icon: 'fa-solid fa-times-circle',
          text: status
        };
      
      case 'EN_PROCESO':
      case 'PROCESANDO':
      case 'IMPRIMIENDO':
      case 'IN_PROGRESS':
        return {
          class: 'statusBadgeInfo',
          icon: 'fa-solid fa-play-circle',
          text: status
        };
      
      case 'PAUSADO':
      case 'DETENIDO':
      case 'STOPPED':
        return {
          class: 'statusBadgeNeutral',
          icon: 'fa-solid fa-pause-circle',
          text: status
        };
      
      default:
        return {
          class: 'statusBadgeNeutral',
          icon: 'fa-solid fa-circle',
          text: status || 'Desconocido'
        };
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'statusBadgeSmall';
      case 'large': return 'statusBadgeLarge';
      default: return '';
    }
  };

  const config = getStatusConfig();
  const sizeClass = getSizeClass();

  return (
    <span className={`statusBadge ${config.class} ${sizeClass} ${className}`}>
      {showIcon && <i className={config.icon}></i>}
      {children || config.text}
    </span>
  );
};

// Componentes predefinidos para uso común
export const SuccessBadge = ({ children, ...props }) => (
  <StatusBadge status="SUCCESS" {...props}>
    {children}
  </StatusBadge>
);

export const WarningBadge = ({ children, ...props }) => (
  <StatusBadge status="PENDIENTE" {...props}>
    {children}
  </StatusBadge>
);

export const ErrorBadge = ({ children, ...props }) => (
  <StatusBadge status="ERROR" {...props}>
    {children}
  </StatusBadge>
);

export const InfoBadge = ({ children, ...props }) => (
  <StatusBadge status="EN_PROCESO" {...props}>
    {children}
  </StatusBadge>
);

export const PriorityBadge = ({ priority, ...props }) => (
  <StatusBadge status={priority} type="priority" {...props} />
);

export default StatusBadge;