import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';

const Sidebarborrar = ({ menuItems = [] }) => {
    const navigate = useNavigate();
    const [openMenus, setOpenMenus] = useState({});

    // Transformamos la lista plana en un árbol
    const menuTree = useMemo(() => {
        const map = {};
        const tree = [];
        
        menuItems.forEach(item => {
            map[item.ModuleID] = { ...item, children: [] };
        });

        menuItems.forEach(item => {
            if (item.ParentID && map[item.ParentID]) {
                map[item.ParentID].children.push(map[item.ModuleID]);
            } else if (!item.ParentID) {
                tree.push(map[item.ModuleID]);
            }
        });
        return tree;
    }, [menuItems]);

    const handleToggle = (id) => {
        setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <h2 className={styles.sidebarTitle}>ProducciónPro</h2>
                <p className={styles.sidebarSubtitle}>Gestión de Roles: {menuItems.length > 0 ? "Activa" : "Cargando..."}</p>
            </div>
            
            <nav className={styles.sidebarNav}>
                {menuTree.map(item => (
                    <div key={item.ModuleID} className={styles.menuGroup}>
                        {item.children.length > 0 ? (
                            // Renderizado de Carpeta/Padre
                            <>
                                <div className={styles.navItemParent} onClick={() => handleToggle(item.ModuleID)}>
                                    <i className={`fa-solid ${item.Icon || 'fa-folder'} ${styles.icon}`}></i>
                                    <span className={styles.areaName}>{item.Title}</span>
                                    <i className={`fa-solid ${openMenus[item.ModuleID] ? 'fa-chevron-down' : 'fa-chevron-right'} ${styles.chevron}`}></i>
                                </div>
                                {openMenus[item.ModuleID] && (
                                    <div className={styles.subMenu}>
                                        {item.children.map(child => (
                                            <div 
                                                key={child.ModuleID} 
                                                className={styles.navItemChild}
                                                onClick={() => navigate(child.Route)}
                                            >
                                                <i className={`fa-solid ${child.Icon || 'fa-circle-dot'} ${styles.subIcon}`}></i>
                                                <span>{child.Title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            // Renderizado de Ítem Simple
                            <div className={styles.navItemSingle} onClick={() => navigate(item.Route)}>
                                <i className={`fa-solid ${item.Icon || 'fa-link'} ${styles.icon}`}></i>
                                <span className={styles.areaName}>{item.Title}</span>
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebarborrar;