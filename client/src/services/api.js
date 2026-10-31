// Centralized API client for Billzy

const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('billzy_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Authentication
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  signup: (userData) => request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  getMe: () => request('/auth/me'),
  forgotPassword: (email) => request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  resetPassword: (token, new_password) => request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password })
  }),

  // Staff
  getStaff: () => request('/staff'),
  createStaff: (staffData) => request('/staff', {
    method: 'POST',
    body: JSON.stringify(staffData)
  }),

  // Products & Variants
  getProducts: () => request('/products'),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (productData) => request('/products', {
    method: 'POST',
    body: JSON.stringify(productData)
  }),
  addVariant: (productId, variantData) => request(`/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(variantData)
  }),

  // Plans
  getPlans: () => request('/plans'),
  createPlan: (planData) => request('/plans', {
    method: 'POST',
    body: JSON.stringify(planData)
  }),

  // Quotation Templates
  getTemplates: () => request('/templates'),
  getTemplate: (id) => request(`/templates/${id}`),
  createTemplate: (templateData) => request('/templates', {
    method: 'POST',
    body: JSON.stringify(templateData)
  }),

  // Subscriptions
  getSubscriptions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/subscriptions${query ? `?${query}` : ''}`);
  },
  getSubscription: (id) => request(`/subscriptions/${id}`),
  createSubscription: (subData) => request('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subData)
  }),
  transitionSubscription: (id, status) => request(`/subscriptions/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ status })
  }),

  // Invoices & Billing
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/invoices${query ? `?${query}` : ''}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  confirmInvoice: (id) => request(`/invoices/${id}/confirm`, { method: 'POST' }),
  cancelInvoice: (id) => request(`/invoices/${id}/cancel`, { method: 'POST' }),
  sendInvoice: (id) => request(`/invoices/${id}/send`, { method: 'POST' }),
  getDueBilling: (asOfDate) => {
    const query = asOfDate ? `?as_of_date=${asOfDate}` : '';
    return request(`/billing/due${query}`);
  },
  runBatchBilling: (asOfDate) => request('/billing/run', {
    method: 'POST',
    body: JSON.stringify({ as_of_date: asOfDate })
  }),
  billSingleSubscription: (id, asOfDate) => request(`/billing/subscription/${id}`, {
    method: 'POST',
    body: JSON.stringify({ as_of_date: asOfDate })
  }),

  // Payments
  getPayments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/payments${query ? `?${query}` : ''}`);
  },
  recordPayment: (paymentData) => request('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData)
  }),
  getPaymentMethods: () => request('/payments/methods'),

  // Discounts
  getDiscounts: () => request('/discounts'),
  createDiscount: (discountData) => request('/discounts', {
    method: 'POST',
    body: JSON.stringify(discountData)
  }),
  evaluateDiscount: (evalData) => request('/discounts/evaluate', {
    method: 'POST',
    body: JSON.stringify(evalData)
  }),

  // Taxes
  getTaxes: () => request('/taxes'),
  createTax: (taxData) => request('/taxes', {
    method: 'POST',
    body: JSON.stringify(taxData)
  }),

  // Finance Dashboard
  getDashboardSummary: () => request('/dashboard'),

  // Customer Portal
  getPortalOverview: () => request('/portal/overview'),
  getPortalSubscriptions: () => request('/portal/subscriptions'),
  getPortalInvoices: () => request('/portal/invoices'),
  getPortalPayments: () => request('/portal/payments'),
  portalPauseSubscription: (id) => request(`/portal/subscriptions/${id}/pause`, { method: 'POST' }),
  portalResumeSubscription: (id) => request(`/portal/subscriptions/${id}/resume`, { method: 'POST' }),
  portalCancelSubscription: (id) => request(`/portal/subscriptions/${id}/cancel`, { method: 'POST' })
};
