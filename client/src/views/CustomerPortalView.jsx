import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  UserCircle,
  Repeat,
  Receipt,
  CreditCard,
  PauseCircle,
  Play,
  XCircle,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Building,
  RotateCw
} from 'lucide-react';

export default function CustomerPortalView() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Invoice for Print
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [ovRes, subRes, invRes, payRes] = await Promise.all([
        api.getPortalOverview(),
        api.getPortalSubscriptions(),
        api.getPortalInvoices(),
        api.getPortalPayments()
      ]);
      setOverview(ovRes);
      setSubscriptions(subRes.subscriptions);
      setInvoices(invRes.invoices);
      setPayments(payRes.payments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handlePause = async (subId) => {
    if (!confirm('Pause your subscription billing?')) return;
    try {
      const res = await api.portalPauseSubscription(subId);
      alert(res.message);
      await fetchPortalData();
    } catch (err) {
      alert(`Could not pause: ${err.message}`);
    }
  };

  const handleResume = async (subId) => {
    try {
      const res = await api.portalResumeSubscription(subId);
      alert(res.message);
      await fetchPortalData();
    } catch (err) {
      alert(`Could not resume: ${err.message}`);
    }
  };

  const handleCancel = async (subId) => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      const res = await api.portalCancelSubscription(subId);
      alert(res.message);
      await fetchPortalData();
    } catch (err) {
      alert(`Could not cancel: ${err.message}`);
    }
  };

  const handleOpenInvoice = async (id) => {
    try {
      const res = await api.getInvoice(id);
      setSelectedInvoice(res.invoice);
    } catch (err) {
      alert(`Failed to load invoice: ${err.message}`);
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const c = overview?.customer || user;
  const stats = overview?.invoiceStats || {};

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#714B67] to-[#4A2F43] text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Customer Self-Service Portal
          </span>
          <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
            Welcome, {c?.name || 'Customer'}
          </h1>
          <p className="text-xs text-purple-200 mt-1 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" />
            <span>{c?.company_name || 'Organization'}</span>
            <span>•</span>
            <span>{c?.email}</span>
          </p>
        </div>

        <button
          onClick={fetchPortalData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium text-white transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Refresh My Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Active Subscriptions</span>
          <p className="text-2xl font-extrabold text-[#714B67] mt-1">{overview?.activeSubscriptionsCount || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Live software licenses</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount Settled</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">${(stats.totalPaid || 0).toFixed(2)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total lifetime payments</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance Due</span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">${(stats.pendingBalance || 0).toFixed(2)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{stats.unpaidCount || 0} unpaid invoice(s)</p>
        </div>
      </div>

      {/* Subscriptions Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[#714B67]" />
            My Active Subscriptions & Self-Service Controls
          </h2>
          <p className="text-xs text-slate-500">
            Pause, resume, or cancel your subscriptions directly without having to email support
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptions.map(sub => (
            <div key={sub.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between text-xs space-y-3">
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-bold text-[#714B67] text-sm">{sub.sub_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sub.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                    (sub.status === 'Paused' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700')
                  }`}>
                    {sub.status}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 mt-1">{sub.plan_name}</h3>
                <p className="text-slate-500 capitalize">{sub.billing_frequency} recurrence</p>

                <div className="mt-2 text-slate-600 space-y-0.5">
                  <p>Next Billing Date: <strong className="text-slate-800">{sub.next_billing_date || '—'}</strong></p>
                  <p>Terms: <strong className="text-slate-800">{sub.payment_terms}</strong></p>
                </div>
              </div>

              {/* Self-Service Action Controls */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-slate-900 text-sm">${Number(sub.total_amount).toFixed(2)}/cycle</span>

                <div className="flex items-center gap-2">
                  {sub.status === 'Active' && sub.allow_pause ? (
                    <button
                      onClick={() => handlePause(sub.id)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold flex items-center gap-1 shadow-xs"
                    >
                      <PauseCircle className="w-3 h-3" />
                      Pause
                    </button>
                  ) : null}

                  {sub.status === 'Paused' ? (
                    <button
                      onClick={() => handleResume(sub.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Play className="w-3 h-3" />
                      Resume
                    </button>
                  ) : null}

                  {sub.status === 'Active' && sub.allow_early_close ? (
                    <button
                      onClick={() => handleCancel(sub.id)}
                      className="px-2.5 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded font-semibold"
                    >
                      Cancel
                    </button>
                  ) : null}

                  {sub.status === 'Active' && !sub.allow_early_close && !sub.allow_pause && (
                    <span className="text-[11px] text-slate-400 italic">Committed Contract</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {subscriptions.length === 0 && (
            <div className="col-span-2 p-6 text-center text-slate-400 italic">
              You do not have any active subscriptions yet.
            </div>
          )}
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#714B67]" />
            My Invoices
          </h2>
          <p className="text-xs text-slate-500">View and print invoices issued to your company</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Invoice #</th>
                <th className="py-2.5 px-3 font-semibold">Subscription</th>
                <th className="py-2.5 px-3 font-semibold">Due Date</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                <th className="py-2.5 px-3 font-semibold text-right">Balance Due</th>
                <th className="py-2.5 px-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-[#714B67]">{inv.invoice_number}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{inv.sub_number}</td>
                  <td className="py-2.5 px-3 text-slate-600">{inv.due_date}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">${Number(inv.total_amount).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600">${Number(inv.balance).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleOpenInvoice(inv.id)}
                      className="px-2.5 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-semibold"
                    >
                      View / Print
                    </button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400 italic">No invoices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Print Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="font-bold text-slate-900 text-base">{selectedInvoice.invoice_number}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#714B67] text-white rounded text-xs font-semibold hover:bg-[#5e3e56] flex items-center gap-1"
                >
                  <Printer className="w-3 h-3" />
                  Print
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold text-lg"
                >
                  &times;
                </button>
              </div>
            </div>

            <div id="printable-invoice" className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#714B67]">Billzy</h3>
                  <p className="text-slate-500">Brightloop Software Inc.</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{selectedInvoice.invoice_number}</p>
                  <p className="text-slate-500">Due: {selectedInvoice.due_date}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <p><strong>Customer:</strong> {selectedInvoice.customer_name} ({selectedInvoice.company_name})</p>
                <p><strong>Billing Period:</strong> {selectedInvoice.billing_period_start} to {selectedInvoice.billing_period_end}</p>
              </div>

              <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines?.map(l => (
                    <tr key={l.id}>
                      <td className="p-2">{l.description}</td>
                      <td className="p-2 text-center">{l.quantity}</td>
                      <td className="p-2 text-right">${Number(l.unit_price).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">${Number(l.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <div className="w-48 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${Number(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>+${Number(selectedInvoice.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-sm text-[#714B67]">
                    <span>Total:</span>
                    <span>${Number(selectedInvoice.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-600 pt-1">
                    <span>Balance Due:</span>
                    <span>${Number(selectedInvoice.balance).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
