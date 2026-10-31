import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [mode, setMode] = useState('signup'); // 'signup', 'login', 'forgot', 'reset'
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Password reset states
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedResetLink, setGeneratedResetLink] = useState('');

  if (!isOpen) return null;

  // Real-time password criteria evaluation
  const passCriteria = {
    length: password.length > 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
  };

  const isPasswordCompliant = Object.values(passCriteria).every(Boolean);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isPasswordCompliant) {
      setError('Password must meet all four complexity criteria below.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signup({
        email,
        password,
        name,
        company_name: companyName
      });
      // Store token and login
      localStorage.setItem('billzy_token', res.token);
      window.location.reload(); // Reload to refresh context
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccess(res.message);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setGeneratedResetLink(res.resetLink);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.resetPassword(resetToken, newPassword);
      setSuccess(res.message);
      setMode('login');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-xs">
        
        {/* Header */}
        <div className="bg-[#714B67] text-white p-5 flex justify-between items-center">
          <div>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Brightloop Access
            </span>
            <h2 className="text-lg font-bold mt-1">
              {mode === 'signup' && 'Create Customer Account'}
              {mode === 'login' && 'Sign In to Billzy'}
              {mode === 'forgot' && 'Reset Your Password'}
              {mode === 'reset' && 'Set New Password'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-purple-200 text-xl font-bold">&times;</button>
        </div>

        {/* Tab switcher */}
        {(mode === 'signup' || mode === 'login') && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2.5 text-center transition ${mode === 'signup' ? 'bg-white text-[#714B67] border-b-2 border-[#714B67]' : 'hover:bg-slate-100'}`}
            >
              New Customer Sign Up
            </button>
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 text-center transition ${mode === 'login' ? 'bg-white text-[#714B67] border-b-2 border-[#714B67]' : 'hover:bg-slate-100'}`}
            >
              Customer / Staff Login
            </button>
          </div>
        )}

        <div className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Small Business Name</label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Acme Retail Solutions"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Email (Must be unique) *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="jane@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="Create secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                {/* Password Criteria Checklist (Spec Scene 1) */}
                <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[11px]">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-1">
                    Password Security Requirements (Scene 1):
                  </span>
                  <div className={`flex items-center gap-1.5 ${passCriteria.length ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    {passCriteria.length ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                    <span>More than eight characters in length</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passCriteria.uppercase ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    {passCriteria.uppercase ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passCriteria.lowercase ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    {passCriteria.lowercase ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passCriteria.special ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    {passCriteria.special ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                    <span>At least one special character (!@#$%^&*...)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordCompliant}
                className="w-full py-2.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm disabled:opacity-40 transition mt-2"
              >
                {loading ? 'Creating Account...' : 'Register Customer Account'}
              </button>
            </form>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                    className="text-[11px] text-[#714B67] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm transition"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <p className="text-slate-600">
                Enter your registered email address and we'll send you a secure password reset link.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registered Email *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="your-email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {generatedResetLink && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                  <p className="font-bold text-[#714B67]">Simulation: Password Reset Link Generated</p>
                  <p className="font-mono text-[10px] break-all bg-white p-2 rounded border border-purple-100 text-slate-700">
                    {generatedResetLink}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(null); }}
                    className="w-full py-1.5 bg-[#714B67] text-white rounded font-bold hover:bg-[#5e3e56]"
                  >
                    Proceed with this Token to Set New Password &rarr;
                  </button>
                </div>
              )}

              {!generatedResetLink && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-bold shadow-sm transition"
                >
                  {loading ? 'Dispatching...' : 'Send Reset Link'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-[11px] text-slate-500 hover:text-slate-800"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reset Token *</label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Compliant Password *</label>
                <input
                  type="password"
                  required
                  placeholder="At least 9 chars, uppercase, lowercase, symbol"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition"
              >
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
