import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  PauseCircle,
  XCircle,
  FileText,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Play
} from 'lucide-react';

const STAGES = ['Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed'];

export default function SubscriptionsView() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedSub, setSelectedSub] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    customer_id: '',
    plan_id: '',
    template_id: '',
    payment_terms: 'Net 15',
    discount_id: '',
    lines: [{ product_id: '', variant_id: '', quantity: 1, tax_id: '' }]
  });

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      const res = await api.getSubscriptions(params);
      setSubscriptions(res.subscriptions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [tRes, pRes, prRes, txRes, dRes, invRes] = await Promise.all([
        api.getTemplates(),
        api.getPlans(),
        api.getProducts(),
        api.getTaxes(),
        api.getDiscounts(),
        api.getInvoices() // to get customers list
      ]);
      setTemplates(tRes.templates);
      setPlans(pRes.plans);
      setProducts(prRes.products);
      setTaxes(txRes.taxes);
      setDiscounts(dRes.discounts);

      // Predefined customer options for quick selection
      setCustomers([
        { id: 4, name: 'Alex Rivera', company: 'Nova Retail Group', email: 'alex@novashops.com' },
        { id: 5, name: 'Elena Rostova', company: 'Apex Global Logistics', email: 'elena@apexlogistics.com' },
        { id: 6, name: 'Marcus Sterling', company: 'Cloudcraft Systems', email: 'marcus@cloudcraft.io' },
        { id: 7, name: 'Chloe Dupont', company: 'Zenith Digital Media', email: 'chloe@zenithmedia.com' }
      ]);
    } catch (err) {
      console.error('Failed loading form dependencies:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    loadDependencies();
  }, [filterStatus, searchTerm]);

  // Open Detailed View
  const handleOpenDetail = async (id) => {
    try {
      const res = await api.getSubscription(id);
      setSelectedSub(res.subscription);
    } catch (err) {
      alert(`Error loading details: ${err.message}`);
    }
  };

  // Status Transition
  const handleTransition = async (id, newStatus) => {
    try {
      await api.transitionSubscription(id, newStatus);
      await fetchSubscriptions();
      if (selectedSub && selectedSub.id === id) {
        const updated = await api.getSubscription(id);
        setSelectedSub(updated.subscription);
      }
    } catch (err) {
      alert(`Lifecycle Transition Error: ${err.message}`);
    }
  };

  // Bill Single Subscription
  const handleBillNow = async (id) => {
    try {
      const res = await api.billSingleSubscription(id);
      alert(res.message);
      await fetchSubscriptions();
      if (selectedSub && selectedSub.id === id) {
        const updated = await api.getSubscription(id);
        setSelectedSub(updated.subscription);
      }
    } catch (err) {
      alert(`Billing Error: ${err.message}`);
    }
  };

  // Handle Template Selection in Create Form
  const handleTemplateSelect = (templateId) => {
    if (!templateId) {
      setCreateForm(prev => ({ ...prev, template_id: '', lines: [{ product_id: '', variant_id: '', quantity: 1, tax_id: '' }] }));
      return;
    }
    const t = templates.find(temp => temp.id === Number(templateId));
    if (t) {
      setCreateForm(prev => ({
        ...prev,
        template_id: templateId,
        plan_id: t.plan_id,
        lines: t.lines.map(l => ({
          product_id: l.product_id,
          variant_id: l.variant_id || '',
          quantity: l.quantity || 1,
          tax_id: l.tax_id || ''
        }))
      }));
    }
  };

  // Handle Create Subscription Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!createForm.customer_id) throw new Error('Please select a customer');
      if (!createForm.plan_id) throw new Error('Please select a plan');

      const payload = {
        customer_id: Number(createForm.customer_id),
        plan_id: Number(createForm.plan_id),
        template_id: createForm.template_id ? Number(createForm.template_id) : undefined,
        payment_terms: createForm.payment_terms,
        discount_id: createForm.discount_id ? Number(createForm.discount_id) : undefined,
        lines: createForm.lines.map(l => ({
          product_id: Number(l.product_id),
          variant_id: l.variant_id ? Number(l.variant_id) : undefined,
          quantity: Number(l.quantity) || 1,
          tax_id: l.tax_id ? Number(l.tax_id) : undefined
        }))
      };

      const res = await api.createSubscription(payload);
      setShowCreateModal(false);
      await fetchSubscriptions();
      handleOpenDetail(res.subscription.id);
    } catch (err) {
      alert(`Create Subscription Error: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Quotation': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Confirmed': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Paused': return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Closed': return 'bg-slate-200 text-slate-600 border-slate-300';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Subscriptions & Quotations
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {subscriptions.length} records
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Lifecycle state machine: Draft &rarr; Quotation &rarr; Confirmed &rarr; Active &rarr; Closed
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-md font-medium transition ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              Kanban Pipeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md font-medium transition ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              List View
            </button>
          </div>

          {/* New Subscription Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Quote / Subscription
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by subscription number, customer name, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#714B67] text-slate-700"
          >
            <option value="">All Statuses</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Pipeline View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const subsInStage = subscriptions.filter(s => s.status === stage);
            const totalStageValue = subsInStage.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

            return (
              <div key={stage} className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 min-w-[210px] flex flex-col">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700">{stage}</span>
                    <span className="text-[10px] bg-white text-slate-600 px-1.5 py-0.2 rounded-full font-bold shadow-xs">
                      {subsInStage.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">
                    ${totalStageValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {subsInStage.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => handleOpenDetail(sub.id)}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs hover:border-[#714B67] hover:shadow-md cursor-pointer transition text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-[#714B67]">{sub.sub_number}</span>
                        <span className="font-extrabold text-slate-900">${Number(sub.total_amount).toFixed(2)}</span>
                      </div>
                      <p className="font-medium text-slate-800 mt-1 truncate">{sub.customer_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{sub.company_name || 'Retailer'}</p>
                      
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="capitalize">{sub.plan_name}</span>
                        <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">{sub.billing_frequency}</span>
                      </div>
                    </div>
                  ))}

                  {subsInStage.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs italic">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Number</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Plan</th>
                <th className="py-3 px-4 font-semibold">Start Date</th>
                <th className="py-3 px-4 font-semibold">Next Billing</th>
                <th className="py-3 px-4 font-semibold">Terms</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-[#714B67] cursor-pointer" onClick={() => handleOpenDetail(sub.id)}>
                    {sub.sub_number}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{sub.customer_name}</p>
                    <p className="text-[11px] text-slate-400">{sub.company_name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-800">{sub.plan_name}</p>
                    <span className="text-[10px] text-slate-500 capitalize">{sub.billing_frequency}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{sub.start_date}</td>
                  <td className="py-3 px-4 text-slate-600">{sub.next_billing_date || '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{sub.payment_terms}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(sub.status)}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                    ${Number(sub.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenDetail(sub.id)}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subscription Detail Modal (Odoo-Style Status Header Bar) */}
      {selectedSub && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            
            {/* Modal Header Bar with Odoo Stage Indicators */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-mono">Subscription #{selectedSub.id}</span>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {selectedSub.sub_number}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getStatusColor(selectedSub.status)}`}>
                    {selectedSub.status}
                  </span>
                </h2>
              </div>

              {/* Odoo Status Stages Chevron Widget */}
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
                {['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'].map((stg, i) => {
                  const isCurrent = selectedSub.status === stg;
                  return (
                    <div
                      key={stg}
                      className={`px-3 py-1.5 flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-[#714B67] text-white font-bold'
                          : 'text-slate-500 bg-white'
                      }`}
                    >
                      <span>{stg}</span>
                      {i < 4 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lifecycle Action Buttons */}
            <div className="bg-purple-50/50 px-6 py-3 border-b border-purple-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-purple-950 mr-2">Quick Actions:</span>

              {selectedSub.status === 'Draft' && (
                <button
                  onClick={() => handleTransition(selectedSub.id, 'Quotation')}
                  className="px-3 py-1.5 bg-[#714B67] text-white rounded text-xs font-semibold hover:bg-[#5e3e56]"
                >
                  Mark as Quotation
                </button>
              )}

              {selectedSub.status === 'Quotation' && (
                <button
                  onClick={() => handleTransition(selectedSub.id, 'Confirmed')}
                  className="px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-semibold hover:bg-sky-700"
                >
                  Confirm Offer
                </button>
              )}

              {selectedSub.status === 'Confirmed' && (
                <button
                  onClick={() => handleTransition(selectedSub.id, 'Active')}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                >
                  Activate Subscription
                </button>
              )}

              {selectedSub.status === 'Active' && (
                <>
                  <button
                    onClick={() => handleBillNow(selectedSub.id)}
                    className="px-3 py-1.5 bg-[#714B67] text-white rounded text-xs font-semibold hover:bg-[#5e3e56] flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    Bill Cycle Now
                  </button>

                  <button
                    onClick={() => handleTransition(selectedSub.id, 'Paused')}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600"
                  >
                    Pause Subscription
                  </button>

                  <button
                    onClick={() => handleTransition(selectedSub.id, 'Closed')}
                    className="px-3 py-1.5 border border-rose-300 text-rose-700 rounded text-xs font-semibold hover:bg-rose-50"
                  >
                    Close Early
                  </button>
                </>
              )}

              {selectedSub.status === 'Paused' && (
                <button
                  onClick={() => handleTransition(selectedSub.id, 'Active')}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                >
                  Resume to Active
                </button>
              )}

              <button
                onClick={() => setSelectedSub(null)}
                className="ml-auto text-xs text-slate-500 hover:text-slate-800"
              >
                Close Drawer
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs">
              
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedSub.customer_name}</p>
                  <p className="text-slate-500">{selectedSub.company_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Plan & Frequency</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedSub.plan_name}</p>
                  <p className="text-slate-500 capitalize">{selectedSub.billing_frequency} Billing</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Next Billing Cycle</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedSub.next_billing_date || '—'}</p>
                  <p className="text-slate-500">Last Billed: {selectedSub.last_billed_date || 'Never'}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Terms</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedSub.payment_terms}</p>
                  <p className="text-slate-500">Expiry: {selectedSub.expiry_date || 'Ongoing'}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">Subscription Line Items</h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Product</th>
                        <th className="py-2.5 px-3 font-semibold">Variant / Edition</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Quantity</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Tax Rate</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSub.lines?.map(l => (
                        <tr key={l.id}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{l.product_name}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {l.variant_name ? (
                              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                                {l.variant_name} (+${Number(l.price_modifier || 0).toFixed(2)})
                              </span>
                            ) : (
                              'Standard'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">{l.quantity}</td>
                          <td className="py-2.5 px-3 text-right">${Number(l.unit_price).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right">{l.tax_rate || 0}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">${Number(l.line_total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="flex justify-end mt-4">
                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>${Number(selectedSub.subtotal).toFixed(2)}</span>
                    </div>
                    {selectedSub.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discount ({selectedSub.discount_code}):</span>
                        <span>-${Number(selectedSub.discount_amount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Taxes:</span>
                      <span>+${Number(selectedSub.tax_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-2">
                      <span>Total Amount:</span>
                      <span className="text-[#714B67]">${Number(selectedSub.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices History */}
              {selectedSub.invoices?.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-2">Billing Invoices</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Invoice #</th>
                          <th className="py-2 px-3">Billing Period</th>
                          <th className="py-2 px-3">Due Date</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 text-right">Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSub.invoices.map(inv => (
                          <tr key={inv.id}>
                            <td className="py-2 px-3 font-bold text-slate-800">{inv.invoice_number}</td>
                            <td className="py-2 px-3 text-slate-600">{inv.billing_period_start} to {inv.billing_period_end}</td>
                            <td className="py-2 px-3 text-slate-600">{inv.due_date}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800">${Number(inv.total_amount).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-emerald-600 font-bold">${Number(inv.paid_amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Audit Timeline */}
              {selectedSub.auditLogs?.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-2">Lifecycle Event Timeline</h3>
                  <div className="space-y-2 border-l-2 border-slate-200 pl-3">
                    {selectedSub.auditLogs.map(log => (
                      <div key={log.id} className="text-[11px]">
                        <span className="font-bold text-slate-800">{log.action.toUpperCase()}</span>
                        <span className="text-slate-500 ml-2">{log.details}</span>
                        <span className="text-slate-400 block">{log.created_at}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Create New Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="bg-[#714B67] text-white p-4 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold">Create New Quote / Subscription</h2>
                <p className="text-xs text-purple-200">Prepare offer from scratch or start from template</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-white hover:text-purple-200 font-bold text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              
              {/* Optional Quotation Template Selection */}
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                <label className="block font-bold text-purple-900 mb-1">
                  Start From Quotation Template (Optional)
                </label>
                <select
                  value={createForm.template_id}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full border border-purple-200 rounded-lg p-2 bg-white text-slate-800"
                >
                  <option value="">-- Custom Build from Scratch --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Valid: {t.validity_days} days)</option>
                  ))}
                </select>
              </div>

              {/* Customer & Plan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
                  <select
                    required
                    value={createForm.customer_id}
                    onChange={(e) => setCreateForm({ ...createForm, customer_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Plan *</label>
                  <select
                    required
                    value={createForm.plan_id}
                    onChange={(e) => setCreateForm({ ...createForm, plan_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="">-- Select Plan --</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.billing_frequency} - ${p.price})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Terms & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={createForm.payment_terms}
                    onChange={(e) => setCreateForm({ ...createForm, payment_terms: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Apply Discount Promo</label>
                  <select
                    value={createForm.discount_id}
                    onChange={(e) => setCreateForm({ ...createForm, discount_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="">None</option>
                    {discounts.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Lines */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">Product Lines</label>
                {createForm.lines.map((line, idx) => {
                  const selProd = products.find(p => p.id === Number(line.product_id));
                  return (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 mb-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[11px] text-slate-500">Product</label>
                          <select
                            required
                            value={line.product_id}
                            onChange={(e) => {
                              const newLines = [...createForm.lines];
                              newLines[idx].product_id = e.target.value;
                              newLines[idx].variant_id = '';
                              setCreateForm({ ...createForm, lines: newLines });
                            }}
                            className="w-full border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (${p.sales_price})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-500">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => {
                              const newLines = [...createForm.lines];
                              newLines[idx].quantity = e.target.value;
                              setCreateForm({ ...createForm, lines: newLines });
                            }}
                            className="w-full border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Variant and Tax */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-500">Variant / Edition</label>
                          <select
                            value={line.variant_id}
                            onChange={(e) => {
                              const newLines = [...createForm.lines];
                              newLines[idx].variant_id = e.target.value;
                              setCreateForm({ ...createForm, lines: newLines });
                            }}
                            className="w-full border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                          >
                            <option value="">Standard Edition (Base Price)</option>
                            {selProd?.variants?.map(v => (
                              <option key={v.id} value={v.id}>{v.variant_name} (+${v.price_modifier})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-500">Tax Rule</label>
                          <select
                            value={line.tax_id}
                            onChange={(e) => {
                              const newLines = [...createForm.lines];
                              newLines[idx].tax_id = e.target.value;
                              setCreateForm({ ...createForm, lines: newLines });
                            }}
                            className="w-full border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                          >
                            <option value="">No Tax (0%)</option>
                            {taxes.map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCreateForm(prev => ({
                    ...prev,
                    lines: [...prev.lines, { product_id: '', variant_id: '', quantity: 1, tax_id: '' }]
                  }))}
                  className="text-xs text-[#714B67] font-semibold hover:underline mt-1"
                >
                  + Add Another Product Line
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm"
                >
                  Create Quotation
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
