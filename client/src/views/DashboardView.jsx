import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  Receipt,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  Zap,
  Play,
  RotateCw
} from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billingRunning, setBillingRunning] = useState(false);
  const [billingResult, setBillingResult] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRunBatchBilling = async () => {
    setBillingRunning(true);
    setBillingResult(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.runBatchBilling(today);
      setBillingResult(res);
      await fetchDashboard();
    } catch (err) {
      alert(`Billing run error: ${err.message}`);
    } finally {
      setBillingRunning(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Loading Brightloop Financial Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl max-w-xl mx-auto my-12 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-lg">Error Loading Dashboard</h3>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const m = data?.metrics || {};

  return (
    <div className="space-y-6">
      
      {/* View Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Finance & Executive Overview
            <span className="text-xs bg-purple-100 text-[#714B67] font-semibold px-2 py-0.5 rounded-full">
              End-of-Month Analytics
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span>As of: {data?.asOfDate}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <Zap className="w-3 h-3" /> SLA Query Time: {data?.executionTimeMs}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            title="Refresh analytics data"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          
          <button
            onClick={handleRunBatchBilling}
            disabled={billingRunning}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {billingRunning ? 'Running Billing Engine...' : 'Run Billing Day Engine'}
          </button>
        </div>
      </div>

      {/* Billing Result Banner */}
      {billingResult && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-start justify-between shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">{billingResult.message}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Processed: {billingResult.results.totalDue} subscriptions | Created: {billingResult.results.createdCount} invoices | Skipped: {billingResult.results.skippedCount} (zero double-billing)
              </p>
            </div>
          </div>
          <button
            onClick={() => setBillingResult(null)}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Key Executive Question Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Subscriptions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#714B67] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">{m.activeSubscriptions || 0}</span>
            <span className="text-xs text-emerald-600 font-medium ml-2">Active on books</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Recurring monthly billing</span>
            <button onClick={() => onNavigate?.('subscriptions')} className="text-[#714B67] font-semibold hover:underline">View Pipeline &rarr;</button>
          </p>
        </div>

        {/* Card 2: Recurring Revenue (MRR & ARR) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Recurring (MRR)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">${(m.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Annual Run-rate (ARR):</span>
            <span className="font-bold text-slate-800">${(m.arr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Card 3: Total Collected Cash */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-sky-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue Collected</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">${(m.totalCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-sky-600 font-medium ml-2">Cash Inflow</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Total Invoiced:</span>
            <span className="font-semibold text-slate-700">${(m.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Card 4: Outstanding & Overdue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding (A/R)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-600">${(m.totalOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="text-rose-600 font-semibold">{m.overdueInvoicesCount || 0} overdue invoices</span>
            <span className="font-bold text-rose-600">${(m.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

      </div>

      {/* Middle Row: Accounts Receivable Aging & Plan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Receivables Aging Buckets */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Accounts Receivable Aging Buckets</h2>
              <p className="text-xs text-slate-500">Breakdown of overdue invoices requiring chasing</p>
            </div>
            <button
              onClick={() => onNavigate?.('invoices')}
              className="text-xs text-[#714B67] hover:underline font-semibold"
            >
              View Invoices &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: '1-30_days', label: '1 - 30 Days', color: 'border-amber-200 bg-amber-50/50 text-amber-900' },
              { key: '31-60_days', label: '31 - 60 Days', color: 'border-orange-200 bg-orange-50/50 text-orange-900' },
              { key: '61-90_days', label: '61 - 90 Days', color: 'border-rose-200 bg-rose-50/50 text-rose-900' },
              { key: '90+_days', label: '90+ Days (Critical)', color: 'border-red-300 bg-red-100/60 text-red-900 font-bold' }
            ].map(bucket => {
              const bData = data?.agingBuckets?.[bucket.key] || { count: 0, amount: 0 };
              return (
                <div key={bucket.key} className={`p-4 rounded-xl border ${bucket.color} transition`}>
                  <p className="text-xs font-semibold opacity-90">{bucket.label}</p>
                  <p className="text-lg font-extrabold mt-1">
                    ${(bData.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] opacity-75 mt-0.5">{bData.count} invoice{bData.count === 1 ? '' : 's'}</p>
                </div>
              );
            })}
          </div>

          {/* Overdue Chasing Table */}
          <div className="mt-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Priority Overdue Invoices</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 font-medium">Invoice</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Due Date</th>
                    <th className="py-2 font-medium">Days Overdue</th>
                    <th className="py-2 font-medium text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.overdueInvoicesList?.length > 0 ? (
                    data.overdueInvoicesList.slice(0, 5).map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/80">
                        <td className="py-2 font-semibold text-slate-800">{inv.invoice_number}</td>
                        <td className="py-2 text-slate-600">{inv.customer_name}</td>
                        <td className="py-2 text-slate-500">{inv.due_date}</td>
                        <td className="py-2">
                          <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            {inv.days_overdue} days
                          </span>
                        </td>
                        <td className="py-2 text-right font-bold text-rose-600">
                          ${Number(inv.outstanding_balance).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-slate-400">
                        No overdue invoices found! All customers are in good standing.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Plan Distribution Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Active Plans Distribution</h2>
            <button onClick={() => onNavigate?.('catalog')} className="text-xs text-[#714B67] hover:underline font-semibold">
              Manage Plans &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {data?.planDistribution?.map(plan => {
              const totalSubs = data?.metrics?.activeSubscriptions || 1;
              const pct = Math.round(((plan.subscriber_count || 0) / totalSubs) * 100);
              return (
                <div key={plan.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{plan.name}</span>
                    <span className="capitalize font-mono text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {plan.billing_frequency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span>{plan.subscriber_count || 0} active subscribers</span>
                    <span className="font-semibold text-slate-700">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-[#714B67] h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Cash Flow Payments Stream */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Recent Cash Inflow Payments</h2>
          <button onClick={() => onNavigate?.('payments')} className="text-xs text-[#714B67] hover:underline font-semibold">
            View Payment Ledger &rarr;
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 font-medium">Receipt #</th>
                <th className="py-2.5 font-medium">Invoice #</th>
                <th className="py-2.5 font-medium">Customer</th>
                <th className="py-2.5 font-medium">Date</th>
                <th className="py-2.5 font-medium">Method</th>
                <th className="py-2.5 font-medium">Reference</th>
                <th className="py-2.5 font-medium text-right">Amount Settled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentPayments?.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2.5 font-semibold text-slate-900">{p.payment_number}</td>
                  <td className="py-2.5 text-slate-600">{p.invoice_number}</td>
                  <td className="py-2.5 text-slate-700">{p.customer_name}</td>
                  <td className="py-2.5 text-slate-500">{p.payment_date}</td>
                  <td className="py-2.5">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize font-mono text-[10px]">
                      {p.payment_method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-500 font-mono text-[11px]">{p.reference_no || '—'}</td>
                  <td className="py-2.5 text-right font-bold text-emerald-600">
                    +${Number(p.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
