import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function StaffModal({ isOpen, onClose }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.getStaff();
      setStaffList(res.staff);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await api.createStaff(form);
      setSuccess(res.message);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      setShowAddForm(false);
      await fetchStaff();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!confirm(`Are you sure you want to remove ${name} from staff?`)) return;
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('billzy_token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Staff member ${name} removed`);
      await fetchStaff();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-xs">
        
        {/* Header */}
        <div className="bg-[#714B67] text-white p-5 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                Admin Exclusive Control
              </span>
            </div>
            <h2 className="text-lg font-bold mt-1">Staff & Internal Team Management</h2>
            <p className="text-purple-200 text-xs">"Only the admin can add a new member of staff"</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-purple-200 text-xl font-bold">&times;</button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
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

          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-700">Internal Members ({staffList.length})</span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {showAddForm ? 'Close Form' : 'Add New Staff Member'}
            </button>
          </div>

          {/* ADD STAFF FORM */}
          {showAddForm && (
            <form onSubmit={handleAddStaff} className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 space-y-3">
              <h3 className="font-bold text-purple-950 text-sm">Add New Staff Member</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. David Operations"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Internal Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                  >
                    <option value="staff">Staff (Limited Day-to-Day Access)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="david.ops@brightloop.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Must be >8 chars, Aa1!"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-slate-200 rounded p-1.5 bg-white text-slate-800"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Must follow password policy (at least 9 characters, uppercase, lowercase, special char).
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5e3e56] text-white rounded font-bold shadow-xs"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          )}

          {/* STAFF LIST */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Name</th>
                  <th className="py-2.5 px-3 font-semibold">Email</th>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Member Since</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{member.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{member.email}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        member.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {member.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{member.created_at?.split(' ')[0] || '2026-01-01'}</td>
                    <td className="py-2.5 px-3 text-center">
                      {member.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteStaff(member.id, member.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove staff member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
}
