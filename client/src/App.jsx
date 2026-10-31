import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DashboardView from './views/DashboardView';
import SubscriptionsView from './views/SubscriptionsView';
import InvoicesView from './views/InvoicesView';
import PaymentsView from './views/PaymentsView';
import CatalogView from './views/CatalogView';
import DiscountsTaxesView from './views/DiscountsTaxesView';
import CustomerPortalView from './views/CustomerPortalView';

function MainLayout() {
  const { isCustomer } = useAuth();
  const [activeTab, setActiveTab] = useState(isCustomer ? 'portal' : 'dashboard');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'subscriptions' && <SubscriptionsView />}
        {activeTab === 'invoices' && <InvoicesView />}
        {activeTab === 'payments' && <PaymentsView />}
        {activeTab === 'catalog' && <CatalogView />}
        {activeTab === 'discounts' && <DiscountsTaxesView />}
        {activeTab === 'portal' && <CustomerPortalView />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400 no-print">
        <p>Billzy • Brightloop Software Subscription Management System • Odoo Hackathon 2026</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
