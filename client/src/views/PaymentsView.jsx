import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  CreditCard,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Building2,
  Receipt
} from 'lucide-react';

export default function PaymentsView() {
  const [payments, setPayments] = useState([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Record Payment Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    note: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, invRes] = await Promise.all([
        api.getPayments(),
        api.getInvoices()
      ]);
      setPayments(payRes.payments);
      // Filter outstanding invoices (where balance > 0 and status != Cancelled)
      const outstanding = invRes.invoices.filter(i => i.balance > 0 && i.status !== 'Cancelled');
      setOutstandingInvoices(outstanding);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenRecordForInvoice = (inv) => {
    setForm({
      invoice_id: String(inv.id),
      amount: String(inv.balance),
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      note: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.recordPayment({
        invoice_id: Number(form.invoice_id),
        amount: Number(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        reference_no: form.reference_no,
        note: form.note
      });
      setShowModal(false);
      setForm({
        invoice_id: '',
        amount: '',
        payment_method: 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        reference_no: '',
        note: ''
      });
      await fetchData();
    } catch (err) {
      alert(`Payment recording failed: ${err.message}`);
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + (i.balance || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Payments & Collections Ledger
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
              Live Cash Flow
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Multi-method receipts matching against invoices, partial payments, and collections
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Record New Payment
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cash Collected</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{payments.length} transactions recorded</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Outstanding Balance</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{outstandingInvoices.length} unpaid invoices to chase</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Outstanding Invoices Action Queue */}
      {outstandingInvoices.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wider">Outstanding Invoices Awaiting Payment</h2>
            </div>
            <span className="text-xs font-bold text-amber-900 font-mono">
              ${totalOutstanding.toFixed(2)} Total Due
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {outstandingInvoices.map(inv => (
              <div key={inv.id} className="bg-white p-3 rounded-lg border border-amber-200 shadow-xs flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800">{inv.invoice_number}</span>
                  <span className="text-slate-500 ml-1">({inv.customer_name})</span>
                  <p className="text-[11px] text-slate-400">Due: {inv.due_date} {inv.is_overdue ? '• (Overdue)' : ''}</p>
                  <p className="font-bold text-rose-600 mt-0.5">Due: ${Number(inv.balance).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => handleOpenRecordForInvoice(inv)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] shadow-xs"
                >
                  Collect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900">Historical Payment Transactions</h2>
          <span className="text-xs text-slate-500 font-mono">{payments.length} items</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-semibold">Payment #</th>
              <th className="py-3 px-4 font-semibold">Invoice #</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Date</th>
              <th className="py-3 px-4 font-semibold">Method</th>
              <th className="py-3 px-4 font-semibold">Reference</th>
              <th className="py-3 px-4 font-semibold">Notes</th>
              <th className="py-3 px-4 font-semibold text-right">Settled Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-bold text-[#714B67]">{p.payment_number}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{p.invoice_number}</td>
                <td className="py-3 px-4">
                  <p className="font-medium text-slate-900">{p.customer_name}</p>
                  <p className="text-[11px] text-slate-400">{p.company_name}</p>
                </td>
                <td className="py-3 px-4 text-slate-600">{p.payment_date}</td>
                <td className="py-3 px-4">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize font-mono text-[10px] font-semibold border border-slate-200">
                    {p.payment_method.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{p.reference_no || '—'}</td>
                <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{p.note || '—'}</td>
                <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm">
                  +${Number(p.amount).toFixed(2)}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-400 italic">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Payment</h3>
                <p className="text-slate-500">Post transaction against customer invoice</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Invoice *</label>
                <select
                  required
                  value={form.invoice_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const inv = outstandingInvoices.find(i => i.id === Number(selId));
                    setForm({
                      ...form,
                      invoice_id: selId,
                      amount: inv ? String(inv.balance) : form.amount
                    });
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                >
                  <option value="">-- Choose Outstanding Invoice --</option>
                  {outstandingInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} ({inv.customer_name}) - Balance: ${Number(inv.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
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
                <label className="block font-semibold text-slate-700 mb-1">Reference / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. WIRE-8910, CHASE-771"
                  value={form.reference_no}
                  onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Settled in full"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
