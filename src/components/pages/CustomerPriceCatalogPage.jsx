import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import CustomerPriceCatalog from './CustomerPriceCatalog';
import { toast } from 'sonner';

const CustomerPriceCatalogPage = () => {
    const [customers, setCustomers] = useState([]);

    const searchCustomers = async (term) => {
        try {
            const res = await api.get('/clients', { params: { q: term } });
            setCustomers(res.data || []);
        } catch (e) {
            console.error("Error searching customers:", e);
            toast.error("Error buscando clientes");
        }
    };

    return (
        <div className="h-full bg-slate-50/50">
            <CustomerPriceCatalog customers={customers} onSearch={searchCustomers} />
        </div>
    );
};

export default CustomerPriceCatalogPage;
