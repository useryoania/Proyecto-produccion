import React, { useState } from 'react';
import LogisticsLayout from './LogisticsLayout';
import PackingView from './PackingView';
import DispatchView from './DispatchView';
import TransportView from './TransportView';
import ReceptionView from './ReceptionView';
import StockView from './StockView';
import LostView from './LostView';

const LogisticsDashboard = () => {
    const [activeTab, setActiveTab] = useState('packing');

    const renderContent = () => {
        switch (activeTab) {
            case 'packing':
                return <PackingView />;
            case 'dispatch':
                return <DispatchView />;
            case 'transport':
                return <TransportView />;
            case 'reception':
                return <ReceptionView />;
            case 'stock':
                return <StockView />;
            case 'lost':
                return <LostView />;
            default:
                return <PackingView />;
        }
    };

    return (
        <LogisticsLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            {renderContent()}
        </LogisticsLayout>
    );
};

export default LogisticsDashboard;
