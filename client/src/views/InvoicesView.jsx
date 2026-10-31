import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  Printer,
  DollarSign,
  AlertTriangle,
  Play,
  RotateCw,
  Building2
} from 'lucide-react';

export default function InvoicesView() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Batch Billing Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [dueSubscriptions, setDueSubscriptions] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // Payment Recording Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    reference_no: '',
    note: ''
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterOverdue) params.overdue = 'true';
      const res = await api.getInvoices(params);
      setInvoices(res.invoices);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, filterOverdue]);

  const handleOpenDetail = async (id) => {
    try {
      const res = await api.getInvoice(id);
      setSelectedInvoice(res.invoice);
    } catch (err) {
      alert(`Failed to load invoice: ${err.message}`);
    }
  };

  const handleConfirm = async (id) => {
    try {
      await api.confirmInvoice(id);
      await fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === id) {
        handleOpenDetail(id);
      }
    } catch (err) {
      alert(`Confirm error: ${err.message}`);
    }
  };

  const handleSend = async (id) => {
    try {
      const res = await api.sendInvoice(id);
      alert(res.message);
      await fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === id) {
        handleOpenDetail(id);
      }
    } catch (err) {
      alert(`Send error: ${err.message}`);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      await api.cancelInvoice(id);
      await fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === id) {
        handleOpenDetail(id);
      }
    } catch (err) {
      alert(`Cancel error: ${err.message}`);
    }
  };

  // Open Batch Billing Preview
  const handleOpenBatchModal = async () => {
    setShowBatchModal(true);
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await api.getDueBilling();
      setDueSubscriptions(res.dueSubscriptions);
    } catch (err) {
      console.error(err);
    } finally {
      setBatchLoading(false);
    }
  };

  // Execute Batch Billing
  const handleExecuteBatch = async () => {
    setBatchLoading(true);
    try {
      const res = await api.runBatchBilling();
      setBatchResult(res);
      await fetchInvoices();
      const dueRes = await api.getDueBilling();
      setDueSubscriptions(dueRes.dueSubscriptions);
    } catch (err) {
      alert(`Batch billing error: ${err.message}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // Record Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await api.recordPayment({
        invoice_id: selectedInvoice.id,
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_no: paymentForm.reference_no,
        note: paymentForm.note
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', payment_method: 'bank_transfer', reference_no: '', note: '' });
      await fetchInvoices();
      handleOpenDetail(selectedInvoice.id);
    } catch (err) {
      alert(`Payment error: ${err.message}`);
    }
  };

  const getStatusBadge = (status, isOverdue) => {
    if (isOverdue && status !== 'Paid' && status !== 'Cancelled') {
      return (
        <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-600" /> Overdue
        </span>
      );
    }

    switch (status) {
      case 'Draft':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">Draft</span>;
      case 'Confirmed':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-full text-[10px] font-bold">Confirmed</span>;
      case 'Paid':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">Paid</span>;
      case 'Cancelled':
        return <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">Cancelled</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Invoicing & Billing Engine
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {invoices.length} invoices
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Automated recurring invoice generation, tax & discount computation, and zero double-billing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvoices}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            onClick={handleOpenBatchModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Billing Day Batch Runner
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
          >
            <option value="">All Invoices</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2 sm:ml-4">
          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={filterOverdue}
              onChange={(e) => setFilterOverdue(e.target.checked)}
              className="rounded text-[#714B67] focus:ring-[#714B67]"
            />
            <span>Show Only Overdue Invoices</span>
          </label>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Invoice #</th>
              <th className="py-3 px-4 font-semibold">Subscription</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Billing Period</th>
              <th className="py-3 px-4 font-semibold">Due Date</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Total</th>
              <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
              <th className="py-3 px-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-bold text-[#714B67] cursor-pointer" onClick={() => handleOpenDetail(inv.id)}>
                  {inv.invoice_number}
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">{inv.sub_number}</td>
                <td className="py-3 px-4">
                  <p className="font-medium text-slate-900">{inv.customer_name}</p>
                  <p className="text-[11px] text-slate-400">{inv.company_name}</p>
                </td>
                <td className="py-3 px-4 text-slate-500">{inv.billing_period_start} to {inv.billing_period_end}</td>
                <td className="py-3 px-4 text-slate-600 font-medium">{inv.due_date}</td>
                <td className="py-3 px-4">{getStatusBadge(inv.status, inv.is_overdue)}</td>
                <td className="py-3 px-4 text-right font-extrabold text-slate-900">${Number(inv.total_amount).toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-extrabold">
                  <span className={inv.balance > 0 ? (inv.is_overdue ? 'text-rose-600' : 'text-amber-600') : 'text-emerald-600'}>
                    ${Number(inv.balance).toFixed(2)}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => handleOpenDetail(inv.id)}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                  >
                    View / Print
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-400">
                  No invoices found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail & Print Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto border border-slate-200">
            
            {/* Modal Actions Header Bar */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">Invoice {selectedInvoice.invoice_number}</span>
                {getStatusBadge(selectedInvoice.status, selectedInvoice.is_overdue)}
              </div>

              <div className="flex items-center gap-2">
                {selectedInvoice.status === 'Draft' && (
                  <button
                    onClick={() => handleConfirm(selectedInvoice.id)}
                    className="px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-semibold hover:bg-sky-700"
                  >
                    Confirm Invoice
                  </button>
                )}

                {selectedInvoice.status === 'Confirmed' && (
                  <>
                    <button
                      onClick={() => handleSend(selectedInvoice.id)}
                      className="px-3 py-1.5 border border-purple-200 text-[#714B67] hover:bg-purple-50 rounded text-xs font-semibold flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Send to Customer
                    </button>

                    <button
                      onClick={() => {
                        setPaymentForm({
                          amount: String(selectedInvoice.balance),
                          payment_method: 'bank_transfer',
                          reference_no: '',
                          note: ''
                        });
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <DollarSign className="w-3 h-3" />
                      Record Payment
                    </button>
                  </>
                )}

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900 flex items-center gap-1"
                >
                  <Printer className="w-3 h-3" />
                  Print / PDF
                </button>

                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-2.5 py-1 text-slate-400 hover:text-slate-700 text-base font-bold ml-2"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Printable Invoice Document Body */}
            <div id="printable-invoice" className="p-8 space-y-6 text-xs text-slate-800 bg-white">
              
              {/* Document Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-black text-[#714B67]">Billzy</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Invoice</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Brightloop Software Inc.</p>
                  <p className="text-[11px] text-slate-400">100 Tech Enterprise Blvd, Suite 400</p>
                  <p className="text-[11px] text-slate-400">billing@brightloop.com</p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-extrabold text-slate-900">{selectedInvoice.invoice_number}</p>
                  <p className="text-xs text-slate-500 mt-1">Subscription: <span className="font-semibold text-slate-700">{selectedInvoice.sub_number}</span></p>
                  <p className="text-xs text-slate-500">Issue Date: <span className="font-semibold text-slate-700">{selectedInvoice.issue_date}</span></p>
                  <p className="text-xs text-slate-500">Due Date: <span className="font-semibold text-slate-700">{selectedInvoice.due_date}</span></p>
                  {selectedInvoice.sent_at && (
                    <p className="text-[11px] text-emerald-600 mt-0.5">Dispatched: {selectedInvoice.sent_at}</p>
                  )}
                </div>
              </div>

              {/* Billed To */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billed To</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedInvoice.customer_name}</p>
                  <p className="text-slate-600">{selectedInvoice.company_name}</p>
                  <p className="text-slate-500">{selectedInvoice.customer_email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Period</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    {selectedInvoice.billing_period_start} &rarr; {selectedInvoice.billing_period_end}
                  </p>
                  <p className="text-[11px] text-slate-500">Payment Terms: {selectedInvoice.payment_terms || 'Net 15'}</p>
                </div>
              </div>

              {/* Itemized Lines */}
              <table className="w-full text-left">
                <thead className="border-b-2 border-slate-200 text-slate-600 text-xs">
                  <tr>
                    <th className="py-2.5 font-semibold">Description</th>
                    <th className="py-2.5 text-center font-semibold">Qty</th>
                    <th className="py-2.5 text-right font-semibold">Unit Price</th>
                    <th className="py-2.5 text-right font-semibold">Tax Rate</th>
                    <th className="py-2.5 text-right font-semibold">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines?.map(l => (
                    <tr key={l.id}>
                      <td className="py-2.5">
                        <p className="font-medium text-slate-900">{l.description}</p>
                      </td>
                      <td className="py-2.5 text-center">{l.quantity}</td>
                      <td className="py-2.5 text-right font-mono">${Number(l.unit_price).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono">{l.tax_rate || 0}%</td>
                      <td className="py-2.5 text-right font-mono font-bold">${Number(l.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations Breakdown */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">${Number(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span className="font-mono">-${Number(selectedInvoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Tax Amount:</span>
                    <span className="font-mono">+${Number(selectedInvoice.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2 text-sm">
                    <span>Total Invoiced:</span>
                    <span className="font-mono text-[#714B67]">${Number(selectedInvoice.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Paid to Date:</span>
                    <span className="font-mono">${Number(selectedInvoice.paid_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm border-t border-slate-200 pt-2 text-rose-600">
                    <span>Balance Due:</span>
                    <span className="font-mono">${Number(selectedInvoice.balance).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Records on this Invoice */}
              {selectedInvoice.payments?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h4 className="font-bold text-slate-800 text-xs mb-2">Payment Receipts</h4>
                  <div className="space-y-1">
                    {selectedInvoice.payments.map(p => (
                      <div key={p.id} className="p-2 bg-emerald-50/60 rounded border border-emerald-100 flex justify-between text-xs">
                        <div>
                          <span className="font-bold text-emerald-900">{p.payment_number}</span>
                          <span className="text-slate-500 ml-2">via {p.payment_method.replace('_', ' ')} on {p.payment_date}</span>
                          {p.reference_no && <span className="text-slate-400 ml-2 font-mono text-[11px]">Ref: {p.reference_no}</span>}
                        </div>
                        <span className="font-extrabold text-emerald-700">+${Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer notes */}
              <div className="pt-6 border-t border-slate-200 text-slate-400 text-[11px] text-center">
                <p>Thank you for subscribing to Brightloop Software. For billing inquiries, contact billing@brightloop.com.</p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Batch Billing Runner Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#714B67] fill-[#714B67]" />
                  Automated Billing Day Batch Runner
                </h2>
                <p className="text-slate-500">Evaluates all active subscriptions due on or before today</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">
                &times;
              </button>
            </div>

            {batchLoading ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-600 font-medium">Running recurring billing engine...</p>
              </div>
            ) : batchResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-1" />
                  <p className="font-bold text-sm">{batchResult.message}</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Created {batchResult.results.createdCount} new invoices. {batchResult.results.skippedCount} subscriptions already billed (no double-billing).
                  </p>
                </div>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="w-full py-2 bg-[#714B67] text-white rounded-lg font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="font-bold text-purple-950 block">Due Subscriptions Queue</span>
                  <span className="text-purple-700 text-xs">
                    Found <strong>{dueSubscriptions.length}</strong> active subscription(s) due for billing today.
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2">
                  {dueSubscriptions.map(s => (
                    <div key={s.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{s.sub_number}</span>
                        <span className="text-slate-500 ml-2">({s.customer_name})</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1 rounded ml-2 capitalize">{s.billing_frequency}</span>
                      </div>
                      <span className="font-bold text-slate-900">${Number(s.total_amount).toFixed(2)}</span>
                    </div>
                  ))}
                  {dueSubscriptions.length === 0 && (
                    <p className="text-center text-slate-400 py-4 italic">No subscriptions are due right now.</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={dueSubscriptions.length === 0}
                    onClick={handleExecuteBatch}
                    className="px-5 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm disabled:opacity-40"
                  >
                    Execute Billing Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Payment</h3>
                <p className="text-slate-500">Against invoice {selectedInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount to Pay ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.balance}
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold text-sm text-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Remaining Balance: ${Number(selectedInvoice.balance).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                >
                  <option value="bank_transfer">Bank Wire / ACH</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-8921, WIRE-404"
                  value={paymentForm.reference_no}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Note</label>
                <input
                  type="text"
                  placeholder="e.g. Received via Chase ACH"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Confirm & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
