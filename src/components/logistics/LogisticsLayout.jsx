import React from 'react';

const LogisticsLayout = ({ children, activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'packing', label: '1. Packing', icon: 'fa-box-open' },
        { id: 'dispatch', label: '2. Remitos', icon: 'fa-file-invoice' },
        { id: 'transport', label: '3. En Viaje', icon: 'fa-truck-arrow-right' },
        { id: 'reception', label: '4. Check-in', icon: 'fa-clipboard-check' },
        { id: 'stock', label: '5. Stock', icon: 'fa-boxes-stacked' },
        { id: 'lost', label: 'Extraviados', icon: 'fa-triangle-exclamation' }
    ];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header / Tabs */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                        <i className="fa-solid fa-warehouse text-xl"></i>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 tracking-tight">Gestión Logística (WMS)</h1>
                        <p className="text-xs text-gray-500 font-medium">Control de Bultos y Envíos</p>
                    </div>
                </div>

                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200
                                ${activeTab === tab.id
                                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                            `}
                        >
                            <i className={`fa-solid ${tab.icon} mr-2`}></i>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>
        </div>
    );
};

export default LogisticsLayout;
