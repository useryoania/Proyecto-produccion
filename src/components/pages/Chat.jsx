import React from 'react';
import styles from './Chat.module.css';

const Chat = ({ onSwitchTab }) => {
  return (
    <div className={styles.chatPage}>
      <div className={styles.chatHeader}>
        <button 
          onClick={() => onSwitchTab('dashboard')} 
          className={styles.backButton}
        >
          <i className="fa-solid fa-arrow-left"></i> Volver
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.chatTitle}>
            <i className="fa-solid fa-comments"></i>
            Chat Global
          </h1>
          <p className={styles.chatSubtitle}>Comunicación en tiempo real</p>
        </div>
      </div>

      <div className={styles.chatContainer}>
        <aside className={styles.chatSidebar}>
          <div className={styles.sidebarContent}>
            <div className={styles.chatSidebarHeader}>
              <h3>Conversaciones</h3>
              <button className={styles.newChatButton}>
                <i className="fa-solid fa-plus"></i>
              </button>
            </div>
            
            <div className={styles.conversationList}>
              <div className={`${styles.conversationItem} ${styles.active}`}>
                <div className={styles.conversationAvatar}>
                  <i className="fa-solid fa-users"></i>
                </div>
                <div className={styles.conversationInfo}>
                  <h4>General</h4>
                  <p>Último mensaje: Hola a todos</p>
                </div>
                <span className={styles.conversationTime}>10:30</span>
              </div>

              <div className={styles.conversationItem}>
                <div className={styles.conversationAvatar}>
                  <i className="fa-solid fa-print"></i>
                </div>
                <div className={styles.conversationInfo}>
                  <h4>Área DTF</h4>
                  <p>Problema con la impresora</p>
                </div>
                <span className={styles.conversationTime}>09:45</span>
              </div>

              <div className={styles.conversationItem}>
                <div className={styles.conversationAvatar}>
                  <i className="fa-solid fa-wrench"></i>
                </div>
                <div className={styles.conversationInfo}>
                  <h4>Soporte Técnico</h4>
                  <p>Mantenimiento programado</p>
                </div>
                <span className={styles.conversationTime}>Ayer</span>
              </div>
            </div>
          </div>
        </aside>

        <main className={styles.chatMain}>
          <div className={styles.chatMessages}>
            <div className={styles.messageSystem}>
              <div className={styles.messageContent}>
                <p>Sistema de chat en desarrollo - Estará disponible pronto</p>
              </div>
            </div>
            
            <div className={`${styles.message} ${styles.incoming}`}>
              <div className={styles.messageAvatar}>
                <i className="fa-solid fa-robot"></i>
              </div>
              <div className={styles.messageContent}>
                <p>¡Hola! El sistema de chat estará disponible pronto con todas las funciones de comunicación en tiempo real.</p>
                <span className={styles.messageTime}>10:30 AM</span>
              </div>
            </div>
          </div>

          <div className={styles.chatInputContainer}>
            <div className={styles.chatInput}>
              <input 
                type="text" 
                placeholder="Escribe un mensaje..." 
                disabled
              />
              <button className={styles.sendButton} disabled>
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chat;
