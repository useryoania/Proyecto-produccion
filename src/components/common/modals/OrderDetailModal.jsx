import React from 'react';
import styles from './OrderDetailModal.module.css';

const OrderDetailModal = ({ order, isOpen, onClose, onStatusChange }) => {
  if (!isOpen || !order) return null;

  const steps = [
    { name: 'Ingreso', status: 'completed', icon: 'fa-check' },
    { name: 'Diseño', status: 'completed', icon: 'fa-check' },
    { name: 'Producción', status: 'active', icon: 'fa-print' },
    { name: 'Empaque', status: 'pending', icon: 'fa-box' }
  ];

  const getStepClass = (step, index) => {
    if (step.status === 'completed') return styles.stepCompleted;
    if (step.status === 'active') return styles.stepActive;
    return styles.stepPending;
  };

  const getStepIcon = (step) => {
    if (step.status === 'completed') return 'fa-solid fa-check';
    if (step.status === 'active') return 'fa-solid fa-print text-lg animate-pulse';
    return 'fa-solid fa-box';
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>
              <i className="fa-solid fa-map-location-dot text-blue-600"></i>
              Hoja de Ruta
            </h2>
            <p className={styles.orderCode}>ORD-{order.id}</p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Progress Steps */}
          <div className={styles.progressContainer}>
            <div className={styles.progressLine}></div>
            {steps.map((step, index) => (
              <div key={index} className={styles.stepContainer}>
                <div className={`${styles.stepCircle} ${getStepClass(step, index)}`}>
                  <i className={getStepIcon(step)}></i>
                </div>
                <p className={styles.stepLabel}>{step.name}</p>
              </div>
            ))}
          </div>

          {/* Order Details */}
          <div className={styles.detailsGrid}>
            <div className={styles.detailCard}>
              <h4 className={styles.detailTitle}>Detalles</h4>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Cliente:</span>
                <span className={styles.detailValue}>{order.client}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Trabajo:</span>
                <span className={styles.detailValue}>{order.desc}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Área:</span>
                <span className={styles.detailValue}>{order.area}</span>
              </div>
              {order.variant && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Variante:</span>
                  <span className={styles.detailValue}>{order.variant}</span>
                </div>
              )}
            </div>

            <div className={styles.detailCard}>
              <h4 className={styles.detailTitle}>Estado</h4>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Status:</span>
                <span className={styles.statusBadge}>{order.status}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Progreso:</span>
                <span className={styles.progressValue}>{order.progress || 0}%</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Prioridad:</span>
                <span className={styles.priorityBadge}>{order.priority}</span>
              </div>
              {order.printer && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Impresora:</span>
                  <span className={styles.detailValue}>{order.printer}</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {order.note && (
            <div className={styles.notesSection}>
              <h4 className={styles.notesTitle}>Notas</h4>
              <p className={styles.notesText}>{order.note}</p>
            </div>
          )}

          {/* Files Section */}
          {order.filesData && order.filesData.length > 0 && (
            <div className={styles.filesSection}>
              <h4 className={styles.filesTitle}>Archivos</h4>
              <div className={styles.filesList}>
                {order.filesData.map((file, index) => (
                  <div key={index} className={styles.fileItem}>
                    <i className="fa-solid fa-file-pdf text-red-500"></i>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileInfo}>
                      {file.copies} copias • {file.meters}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>
            Cerrar
          </button>
          <button className={styles.primaryButton}>
            <i className="fa-solid fa-edit mr-2"></i>
            Editar Orden
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;