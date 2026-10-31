import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Layers,
  Plus,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function CatalogView() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'plans', 'templates'
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Forms
  const [productForm, setProductForm] = useState({
    name: '',
    type: 'software',
    sales_price: '',
    cost_price: '',
    notes: '',
    variants: [{ variant_name: '', price_modifier: 0 }]
  });

  const [variantForm, setVariantForm] = useState({
    variant_name: '',
    price_modifier: '',
    sku: ''
  });

  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    billing_frequency: 'monthly',
    min_quantity: 1,
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    auto_close_at_end: false,
    allow_early_close: true,
    allow_pause: true,
    allow_renewal: true
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    plan_id: '',
    validity_days: 30,
    notes: '',
    lines: [{ product_id: '', variant_id: '', quantity: 1 }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, planRes, tmplRes] = await Promise.all([
        api.getProducts(),
        api.getPlans(),
        api.getTemplates()
      ]);
      setProducts(prodRes.products);
      setPlans(planRes.plans);
      setTemplates(tmplRes.templates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.createProduct({
        name: productForm.name,
        type: productForm.type,
        sales_price: Number(productForm.sales_price),
        cost_price: Number(productForm.cost_price || 0),
        notes: productForm.notes,
        variants: productForm.variants.filter(v => v.variant_name.trim())
      });
      setShowProductModal(false);
      setProductForm({
        name: '',
        type: 'software',
        sales_price: '',
        cost_price: '',
        notes: '',
        variants: [{ variant_name: '', price_modifier: 0 }]
      });
      await fetchData();
    } catch (err) {
      alert(`Create product error: ${err.message}`);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return;
    try {
      await api.addVariant(selectedProductId, {
        variant_name: variantForm.variant_name,
        price_modifier: Number(variantForm.price_modifier || 0),
        sku: variantForm.sku
      });
      setShowVariantModal(false);
      setVariantForm({ variant_name: '', price_modifier: '', sku: '' });
      await fetchData();
    } catch (err) {
      alert(`Add variant error: ${err.message}`);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await api.createPlan({
        name: planForm.name,
        price: Number(planForm.price),
        billing_frequency: planForm.billing_frequency,
        min_quantity: Number(planForm.min_quantity) || 1,
        valid_from: planForm.valid_from,
        valid_to: planForm.valid_to || null,
        auto_close_at_end: planForm.auto_close_at_end ? 1 : 0,
        allow_early_close: planForm.allow_early_close ? 1 : 0,
        allow_pause: planForm.allow_pause ? 1 : 0,
        allow_renewal: planForm.allow_renewal ? 1 : 0
      });
      setShowPlanModal(false);
      await fetchData();
    } catch (err) {
      alert(`Create plan error: ${err.message}`);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await api.createTemplate({
        name: templateForm.name,
        plan_id: Number(templateForm.plan_id),
        validity_days: Number(templateForm.validity_days) || 30,
        notes: templateForm.notes,
        lines: templateForm.lines.map(l => ({
          product_id: Number(l.product_id),
          variant_id: l.variant_id ? Number(l.variant_id) : undefined,
          quantity: Number(l.quantity) || 1
        }))
      });
      setShowTemplateModal(false);
      setTemplateForm({
        name: '',
        plan_id: '',
        validity_days: 30,
        notes: '',
        lines: [{ product_id: '', variant_id: '', quantity: 1 }]
      });
      await fetchData();
    } catch (err) {
      alert(`Create template error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Catalog, Variants & Plans
          </h1>
          <p className="text-xs text-slate-500">
            Define software offerings, brand variants (e.g. Odoo +$560), recurring plans, and quotation templates
          </p>
        </div>

        {/* Sub-tabs switcher */}
        <div className="bg-slate-100 p-1 rounded-lg flex items-center text-xs">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Products & Variants ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'plans' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Billing Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${activeTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            Quotation Templates ({templates.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Products & Variants */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">
              Manage product pricing and variant modifiers
            </span>
            <button
              onClick={() => setShowProductModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(prod => (
              <div key={prod.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {prod.type}
                    </span>
                    <span className="text-lg font-extrabold text-slate-900">${Number(prod.sales_price).toFixed(2)}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{prod.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prod.notes || 'No description provided'}</p>

                  {/* Cost & Margin */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Cost: ${Number(prod.cost_price || 0).toFixed(2)}</span>
                    <span className="text-emerald-600 font-semibold">
                      Profit Margin: ${Number(prod.sales_price - (prod.cost_price || 0)).toFixed(2)}
                    </span>
                  </div>

                  {/* Variants List */}
                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Variants & Brand Additions
                    </span>
                    <div className="space-y-1.5">
                      {prod.variants?.length > 0 ? (
                        prod.variants.map(v => (
                          <div key={v.id} className="p-1.5 bg-purple-50/60 rounded border border-purple-100 flex justify-between items-center text-xs">
                            <span className="font-medium text-purple-950">{v.variant_name}</span>
                            <span className="font-bold text-purple-700 font-mono text-[11px]">
                              {v.price_modifier >= 0 ? `+$${Number(v.price_modifier).toFixed(2)}` : `-$${Math.abs(v.price_modifier).toFixed(2)}`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No variants created yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedProductId(prod.id);
                      setShowVariantModal(true);
                    }}
                    className="text-xs text-[#714B67] hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Variant (e.g. Odoo Brand)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Billing Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">
              Configure billing frequencies (daily, weekly, monthly, yearly) and lifecycle policy rules
            </span>
            {isAdmin && (
              <button
                onClick={() => setShowPlanModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Plan (Admin)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="capitalize font-mono text-[11px] bg-purple-100 text-[#714B67] font-bold px-2 py-0.5 rounded">
                      {plan.billing_frequency}
                    </span>
                    <span className="text-xl font-extrabold text-slate-900">${Number(plan.price).toFixed(2)}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Min Quantity: {plan.min_quantity} seat(s)</p>
                  <p className="text-[11px] text-slate-400 mt-1">Valid: {plan.valid_from} to {plan.valid_to || 'Ongoing'}</p>

                  {/* Lifecycle Policy Badges (Spec Scene 2) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Plan Lifecycle Governance
                    </span>

                    <div className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-600">Auto-Close When Ended:</span>
                      {plan.auto_close_at_end ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Yes
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">No</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-600">Allow Pausing:</span>
                      {plan.allow_pause ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Yes
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3 h-3 text-rose-500" /> Disallowed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-600">Allow Early Termination:</span>
                      {plan.allow_early_close ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Yes
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3 h-3 text-rose-500" /> Locked Term
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-600">Allow Renewal:</span>
                      {plan.allow_renewal ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Yes
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3 h-3 text-rose-500" /> No
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Quotation Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">
              Pre-configured offer packages that sales reps can turn into subscriptions in seconds
            </span>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Quotation Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold text-slate-500">Template #{tmpl.id}</span>
                    <span className="text-xs bg-purple-100 text-[#714B67] px-2 py-0.5 rounded-full font-bold">
                      Valid for {tmpl.validity_days} days
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{tmpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Base Plan: {tmpl.plan_name}</p>
                  <p className="text-xs text-slate-400 mt-1">{tmpl.notes}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Bundled Product Lines
                    </span>
                    {tmpl.lines?.map(l => (
                      <div key={l.id} className="p-2 bg-slate-50 rounded border border-slate-100 flex justify-between text-xs">
                        <span className="font-medium text-slate-800">
                          {l.quantity}x {l.product_name} {l.variant_name ? `(${l.variant_name})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create New Product</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">&times;</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brightloop CRM Suite"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type *</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="software">Software</option>
                    <option value="service">Service</option>
                    <option value="add_on">Add-on</option>
                    <option value="hardware">Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sales Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.sales_price}
                    onChange={(e) => setProductForm({ ...productForm, sales_price: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cost Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={productForm.notes}
                  onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Variant Modal */}
      {showVariantModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Product Variant</h3>
              <button onClick={() => setShowVariantModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">&times;</button>
            </div>

            <form onSubmit={handleAddVariant} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Variant Name (e.g. Odoo Brand) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Odoo Brand Edition"
                  value={variantForm.variant_name}
                  onChange={(e) => setVariantForm({ ...variantForm, variant_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price Modifier ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 560.00"
                  value={variantForm.price_modifier}
                  onChange={(e) => setVariantForm({ ...variantForm, price_modifier: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Positive value adds to sales price; negative value reduces it.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SKU (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ERP-ODOO-560"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVariantModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm"
                >
                  Add Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal (Admin) */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create Billing Plan</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">&times;</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Business Standard"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Frequency *</label>
                  <select
                    value={planForm.billing_frequency}
                    onChange={(e) => setPlanForm({ ...planForm, billing_frequency: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800 font-bold"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valid From *</label>
                  <input
                    type="date"
                    required
                    value={planForm.valid_from}
                    onChange={(e) => setPlanForm({ ...planForm, valid_from: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valid To (Optional)</label>
                  <input
                    type="date"
                    value={planForm.valid_to}
                    onChange={(e) => setPlanForm({ ...planForm, valid_to: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              {/* Lifecycle Checkboxes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="font-bold text-slate-800 block text-[11px]">Lifecycle Governance Policies</span>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.auto_close_at_end}
                    onChange={(e) => setPlanForm({ ...planForm, auto_close_at_end: e.target.checked })}
                    className="rounded text-[#714B67]"
                  />
                  <span>Close on its own when it ends (Auto-Close)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.allow_pause}
                    onChange={(e) => setPlanForm({ ...planForm, allow_pause: e.target.checked })}
                    className="rounded text-[#714B67]"
                  />
                  <span>Allow customers/staff to pause</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.allow_early_close}
                    onChange={(e) => setPlanForm({ ...planForm, allow_early_close: e.target.checked })}
                    className="rounded text-[#714B67]"
                  />
                  <span>Allow early termination/cancellation</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.allow_renewal}
                    onChange={(e) => setPlanForm({ ...planForm, allow_renewal: e.target.checked })}
                    className="rounded text-[#714B67]"
                  />
                  <span>Allow renewals</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Quotation Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create Quotation Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">&times;</button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud Package"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Plan *</label>
                  <select
                    required
                    value={templateForm.plan_id}
                    onChange={(e) => setTemplateForm({ ...templateForm, plan_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="">-- Select Plan --</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.billing_frequency})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Validity (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={templateForm.validity_days}
                    onChange={(e) => setTemplateForm({ ...templateForm, validity_days: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Terms</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Standard terms and conditions apply"
                  value={templateForm.notes}
                  onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                ></textarea>
              </div>

              {/* Product Lines */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">Bundled Lines</label>
                {templateForm.lines.map((l, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select
                      required
                      value={l.product_id}
                      onChange={(e) => {
                        const updated = [...templateForm.lines];
                        updated[idx].product_id = e.target.value;
                        setTemplateForm({ ...templateForm, lines: updated });
                      }}
                      className="flex-1 border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={l.quantity}
                      onChange={(e) => {
                        const updated = [...templateForm.lines];
                        updated[idx].quantity = e.target.value;
                        setTemplateForm({ ...templateForm, lines: updated });
                      }}
                      className="w-16 border border-slate-200 rounded p-1.5 text-center text-slate-800"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setTemplateForm(prev => ({
                    ...prev,
                    lines: [...prev.lines, { product_id: '', variant_id: '', quantity: 1 }]
                  }))}
                  className="text-xs text-[#714B67] font-semibold hover:underline"
                >
                  + Add Line Item
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
