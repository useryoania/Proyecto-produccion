import React, { useState } from 'react';
import LogisticsLayout from './LogisticsLayout';
import PackingView from './PackingView';
import DispatchView from './DispatchView';
import ReceptionView from './ReceptionView';

const LogisticsDashboard = () => {
    const [activeTab, setActiveTab] = useState('packing');

    const renderContent = () => {
        switch (activeTab) {
            case 'packing':
                return <PackingView />;
            case 'dispatch':
                return <DispatchView />;
            case 'reception':
                return <ReceptionView />;
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
