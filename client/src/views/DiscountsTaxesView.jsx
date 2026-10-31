import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Tag,
  Percent,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle,
  Users,
  ShieldCheck,
  Building
} from 'lucide-react';

export default function DiscountsTaxesView() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('discounts'); // 'discounts' or 'taxes'
  const [discounts, setDiscounts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);

  // Forms
  const [discountForm, setDiscountForm] = useState({
    name: '',
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase_amount: 0,
    min_quantity: 0,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    max_uses: 100,
    scope: 'all',
    applicable_product_id: ''
  });

  const [taxForm, setTaxForm] = useState({
    name: '',
    rate: '',
    code: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, tRes, pRes] = await Promise.all([
        api.getDiscounts(),
        api.getTaxes(),
        api.getProducts()
      ]);
      setDiscounts(dRes.discounts);
      setTaxes(tRes.taxes);
      setProducts(pRes.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    try {
      await api.createDiscount({
        ...discountForm,
        discount_value: Number(discountForm.discount_value),
        min_purchase_amount: Number(discountForm.min_purchase_amount || 0),
        min_quantity: Number(discountForm.min_quantity || 0),
        max_uses: Number(discountForm.max_uses || 0),
        applicable_product_id: discountForm.scope === 'product' && discountForm.applicable_product_id ? Number(discountForm.applicable_product_id) : null
      });
      setShowDiscountModal(false);
      setDiscountForm({
        name: '',
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase_amount: 0,
        min_quantity: 0,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        max_uses: 100,
        scope: 'all',
        applicable_product_id: ''
      });
      await fetchData();
    } catch (err) {
      alert(`Create discount error: ${err.message}`);
    }
  };

  const handleCreateTax = async (e) => {
    e.preventDefault();
    try {
      await api.createTax({
        name: taxForm.name,
        rate: Number(taxForm.rate),
        code: taxForm.code
      });
      setShowTaxModal(false);
      setTaxForm({ name: '', rate: '', code: '' });
      await fetchData();
    } catch (err) {
      alert(`Create tax error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Pricing Rules, Discounts & Taxes
          </h1>
          <p className="text-xs text-slate-500">
            Admin rules for volume seat discounts, promo limits, and tax rate automation
          </p>
        </div>

        {/* Tab switch */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center text-xs">
          <button
            onClick={() => setActiveTab('discounts')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'discounts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Discount Rules ({discounts.length})
          </button>
          <button
            onClick={() => setActiveTab('taxes')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'taxes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Tax Rates ({taxes.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Discount Rules */}
      {activeTab === 'discounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">
              Only the Admin can create discount rules (seat volume thresholds, usage limits, expiration)
            </span>
            {isAdmin ? (
              <button
                onClick={() => setShowDiscountModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Discount Rule (Admin)
              </button>
            ) : (
              <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                🔒 Admin Role Required to Create Discounts
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discounts.map(disc => {
              const quotaPct = disc.max_uses > 0 ? Math.round((disc.times_used / disc.max_uses) * 100) : 0;
              return (
                <div key={disc.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-extrabold bg-purple-50 text-[#714B67] px-2 py-0.5 rounded border border-purple-200">
                        {disc.code}
                      </span>
                      <span className="text-base font-extrabold text-slate-900">
                        {disc.discount_type === 'percentage' ? `${disc.discount_value}% OFF` : `$${disc.discount_value} OFF`}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-3">{disc.name}</h3>
                    
                    {/* Eligibility conditions */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Condition:</span>
                        <span className="font-semibold text-slate-800">
                          {disc.min_quantity > 0 ? `Min ${disc.min_quantity} seats` : (disc.min_purchase_amount > 0 ? `Min $${disc.min_purchase_amount} purchase` : 'No minimum')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Applies To:</span>
                        <span className="font-semibold capitalize text-slate-800">
                          {disc.scope === 'product' ? (disc.applicable_product_name || 'Specific Product') : 'Whole Subscription'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Validity:</span>
                        <span className="text-slate-700">{disc.start_date} &rarr; {disc.end_date}</span>
                      </div>
                    </div>

                    {/* Usage Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Redemptions Used:</span>
                        <span className="font-semibold text-slate-700">
                          {disc.times_used} / {disc.max_uses > 0 ? disc.max_uses : 'Unlimited'}
                        </span>
                      </div>
                      {disc.max_uses > 0 && (
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-1.5 rounded-full ${quotaPct >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, quotaPct)}%` }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Tax Rates */}
      {activeTab === 'taxes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">
              Tax rules automatically calculated on recurring invoice lines
            </span>
            {isAdmin && (
              <button
                onClick={() => setShowTaxModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tax Rule (Admin)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {taxes.map(t => (
              <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex justify-between items-center">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-400 block">{t.code}</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{t.name}</h3>
                  <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">Active rule</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#714B67]">{t.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Discount Modal (Admin) */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create Discount Rule (Admin Only)</h3>
              <button onClick={() => setShowDiscountModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">&times;</button>
            </div>

            <form onSubmit={handleCreateDiscount} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10+ Seats Volume Discount"
                  value={discountForm.name}
                  onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Promo Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SEATS15"
                    value={discountForm.code}
                    onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold text-slate-800 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type *</label>
                  <select
                    value={discountForm.discount_type}
                    onChange={(e) => setDiscountForm({ ...discountForm, discount_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {discountForm.discount_type === 'percentage' ? 'Percentage Off (%) *' : 'Discount Value ($) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={discountForm.discount_type === 'percentage' ? '15' : '50'}
                    value={discountForm.discount_value}
                    onChange={(e) => setDiscountForm({ ...discountForm, discount_value: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Seats / Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g. 10 for volume seats"
                    value={discountForm.min_quantity}
                    onChange={(e) => setDiscountForm({ ...discountForm, min_quantity: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Purchase ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 200"
                    value={discountForm.min_purchase_amount}
                    onChange={(e) => setDiscountForm({ ...discountForm, min_purchase_amount: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    placeholder="e.g. 50 (0 = unlimited)"
                    value={discountForm.max_uses}
                    onChange={(e) => setDiscountForm({ ...discountForm, max_uses: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={discountForm.start_date}
                    onChange={(e) => setDiscountForm({ ...discountForm, start_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={discountForm.end_date}
                    onChange={(e) => setDiscountForm({ ...discountForm, end_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm"
                >
                  Save Discount Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Tax Rule</h3>
              <button onClick={() => setShowTaxModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">&times;</button>
            </div>

            <form onSubmit={handleCreateTax} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Tax (8.25%)"
                  value={taxForm.name}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ST825"
                  value={taxForm.code}
                  onChange={(e) => setTaxForm({ ...taxForm, code: e.target.value.toUpperCase() })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono uppercase text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rate (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="8.25"
                  value={taxForm.rate}
                  onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTaxModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm"
                >
                  Save Tax
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
