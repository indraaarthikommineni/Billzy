import React, { useState } from 'react';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import {
  LayoutDashboard,
  Repeat,
  Receipt,
  CreditCard,
  Package,
  Tag,
  UserCircle,
  ChevronDown,
  ShieldAlert,
  LogOut,
  Sparkles,
  Building2
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, switchDemoUser, logout, isAdmin, isCustomer } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Finance Dashboard', icon: LayoutDashboard, hidden: isCustomer },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, hidden: isCustomer },
    { id: 'invoices', label: 'Invoices & Billing', icon: Receipt, hidden: isCustomer },
    { id: 'payments', label: 'Payments', icon: CreditCard, hidden: isCustomer },
    { id: 'catalog', label: 'Products & Plans', icon: Package, hidden: isCustomer },
    { id: 'discounts', label: 'Discounts & Taxes', icon: Tag, hidden: isCustomer },
    { id: 'portal', label: 'Customer Portal', icon: UserCircle }
  ];

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-amber-400 text-amber-950 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Admin</span>;
      case 'staff':
        return <span className="bg-sky-400 text-sky-950 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Staff</span>;
      default:
        return <span className="bg-emerald-400 text-emerald-950 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Customer</span>;
    }
  };

  return (
    <header className="bg-[#714B67] text-white shadow-md sticky top-0 z-40 select-none">
      {/* Top Branding & Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab(isCustomer ? 'portal' : 'dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">Billzy</span>
                <span className="text-[10px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded font-mono">odoo 2026</span>
              </div>
              <p className="text-[11px] text-purple-200/80 -mt-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Brightloop Software
              </p>
            </div>
          </div>

          {/* Quick Demo Role Switcher & User Menu */}
          <div className="flex items-center space-x-3">
            
            {/* Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-1.5 text-xs transition duration-150"
                title="Switch active user to test RBAC roles"
              >
                <span className="text-white/80">Role:</span>
                {getRoleBadge(user?.role)}
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>

              {roleMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl py-2 z-50 border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setRoleMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Simulate Role / User</p>
                    <p className="text-[11px] text-slate-400">Switch persona to test permissions & portals</p>
                  </div>
                  {DEMO_USERS.map((demo) => (
                    <button
                      key={demo.role}
                      onClick={() => {
                        switchDemoUser(demo.role);
                        if (demo.role === 'customer') setActiveTab('portal');
                        else if (activeTab === 'portal') setActiveTab('dashboard');
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs hover:bg-purple-50 flex items-center justify-between transition ${
                        user?.role === demo.role ? 'bg-purple-50/70 font-semibold text-purple-900 border-l-4 border-[#714B67]' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{demo.label}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">{demo.email}</span>
                      </div>
                      {user?.role === demo.role && (
                        <span className="text-emerald-600 text-xs">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile Capsule */}
            <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-white/20">
              <div className="text-right">
                <p className="text-xs font-medium text-white">{user?.name || 'User'}</p>
                <p className="text-[11px] text-purple-200/70 truncate max-w-[140px]">{user?.email}</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div className="bg-[#5e3e56] border-t border-white/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-1 overflow-x-auto scrollbar-none py-1">
          {navItems.filter(item => !item.hidden).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-[#714B67] shadow-sm font-semibold'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#714B67]' : 'text-purple-200'}`} />
                <span>{item.label}</span>
                {item.id === 'portal' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-purple-100 text-purple-800' : 'bg-white/20 text-white'}`}>
                    Self-Service
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
