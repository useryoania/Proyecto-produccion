import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { areasService } from '../../services/modules/areasService';
import LogisticsLayout from './LogisticsLayout';
import PackingView from './PackingView';
import DispatchView from './DispatchView';
import TransportView from './TransportView';
import ReceptionView from './ReceptionView';
import StockView from './StockView';
import LostView from './LostView';
// Dynamic Import for DepositStockPage to optimize chunk loading
const DepositStockPage = React.lazy(() => import('./DepositStockPage'));

const LogisticsDashboard = () => {
    const { user } = useAuth();
    const isAdmin = user?.rol?.toLowerCase() === 'admin';
    const isDeposito = user?.areaKey?.trim().toUpperCase() === 'DEPOSITO';
    const hasFullAccess = isAdmin || isDeposito;
    const [activeTab, setActiveTab] = useState('dispatch');

    // Global Area Filter
    const [globalArea, setGlobalArea] = useState('TODOS');
    const [areasList, setAreasList] = useState(['TODOS']);

    // 1. Fetch Dynamic Areas
    useEffect(() => {
        const loadAreas = async () => {
            try {
                const allAreas = await areasService.getAll();
                // Filter areas that have Logistic capabilities enabled
                let logisticsAreas = allAreas
                    .filter(a => a.TieneLogisticaBultos)
                    .map(a => a.code)
                    .sort();

                // FILTER: Only ADMIN or DEPOSITO sees ALL/TODOS. Others see only their area.
                if (!hasFullAccess && user) {
                    const userArea = (user.areaKey || user.areaId || '').trim();
                    if (userArea) {
                        // Filter to match user area
                        logisticsAreas = logisticsAreas.filter(a => a === userArea);
                    } else {
                        // No area assigned
                        logisticsAreas = [];
                    }
                    // For non-full-access users, DO NOT add 'TODOS'
                    setAreasList(logisticsAreas);

                    // Force selection
                    if (logisticsAreas.length > 0) {
                        setGlobalArea(logisticsAreas[0]);
                    }
                } else {
                    // Admin/DEPOSITO sees TODOS + All Areas
                    setAreasList(['TODOS', ...logisticsAreas]);
                }

                // Once loaded, validate if current globalFilter is still valid? 
                // Not strictly necessary if we trust user.areaId
            } catch (err) {
                console.error("Error loading areas:", err);
            }
        };
        if (user) loadAreas(); // Only load if user is present to check role
    }, [user]);

    // 2. Set Default Area based on User
    useEffect(() => {
        if (user) {
            const userArea = user.areaKey || user.areaId;

            // If Admin/DEPOSITO/Supervisor, stay on TODOS (or last selection)
            if (hasFullAccess) {
                // Keep default
            } else if (userArea) {
                // For normal users, force their area
                setGlobalArea(userArea);
            }
        }
    }, [user]);

    const renderContent = () => {
        // Pass the area filter to all views
        const commonProps = { areaFilter: globalArea === 'TODOS' ? null : globalArea };

        switch (activeTab) {
            // case 'packing': return <PackingView {...commonProps} />;
            case 'dispatch':
                return <DispatchView {...commonProps} mode="create" />;
            case 'history':
                return <DispatchView {...commonProps} mode="history" />;
            case 'transport':
                return <TransportView {...commonProps} />;
            case 'reception':
                return <ReceptionView {...commonProps} />;
            case 'stock':
                if (commonProps.areaFilter === 'DEPOSITO') {
                    // Lazy load with Suspense fallback
                    return (
                        <Suspense fallback={
                            <div className="flex flex-col items-center justify-center h-full p-10 text-gray-400">
                                <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-4 text-indigo-500"></i>
                                <span className="text-sm font-bold animate-pulse">Cargando módulo de Depósito...</span>
                            </div>
                        }>
                            <DepositStockPage />
                        </Suspense>
                    );
                }
                return <StockView {...commonProps} />;
            case 'lost':
                return <LostView {...commonProps} />;
            default:
                return <DispatchView {...commonProps} mode="create" />;
        }
    };

    return (
        <LogisticsLayout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            globalArea={globalArea}
            setGlobalArea={setGlobalArea}
            areasList={areasList}
            disabled={!hasFullAccess}
        >
            {renderContent()}
        </LogisticsLayout>
    );
};

export default LogisticsDashboard;
