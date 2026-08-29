import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  FileText, 
  RefreshCw, 
  LogOut,
  Send,
  Eye,
  Tag
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AdminPanel = ({ onClose }) => {
  const { t } = useT();

  // Auth State
  const [token, setToken] = useState(() => localStorage.getItem('trust_admin_token') || '');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Tickets Queue State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Action Form States
  const [triageNote, setTriageNote] = useState('');
  const [verdictForm, setVerdictForm] = useState({ verdict: 'disputed', note: '' });
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Initial fetch when token present
  useEffect(() => {
    if (token) {
      fetchTickets();
    }
  }, [token, statusFilter]);

  // Socket listener for live moderation queue updates
  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE_URL);

    socket.on('trust:ticket_new', () => {
      fetchTickets();
    });

    socket.on('trust:ticket_update', () => {
      fetchTickets();
    });

    socket.on('trust:verdict', () => {
      fetchTickets();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/trust/admin/login`, {
        username,
        password,
      });

      if (res.data.success && res.data.token) {
        setToken(res.data.token);
        localStorage.setItem('trust_admin_token', res.data.token);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('trust_admin_token');
    setSelectedTicket(null);
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/trust/admin/tickets`, {
        params: { status: statusFilter || undefined },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTriage = async (newStatus) => {
    if (!selectedTicket) return;
    setActionSubmitting(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/trust/admin/tickets/${selectedTicket._id}/triage`,
        { status: newStatus, note: triageNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSelectedTicket(res.data.ticket);
        setTriageNote('');
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Triage update failed');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleSetVerdict = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !verdictForm.note.trim()) return;
    setActionSubmitting(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/trust/admin/tickets/${selectedTicket._id}/verdict`,
        { verdict: verdictForm.verdict, note: verdictForm.note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSelectedTicket(res.data.ticket);
        setVerdictForm({ verdict: 'disputed', note: '' });
        fetchTickets();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Verdict publication failed');
    } finally {
      setActionSubmitting(false);
    }
  };

  // 1. Unauthenticated Admin Login State
  if (!token) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 max-w-md mx-auto shadow-2xl border border-slate-800">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold font-display">Moderation Console Login</h2>
          <p className="text-xs text-slate-400 mt-1">Authorized KrishiFlow Trust Administrators</p>
        </div>

        {loginError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 font-medium">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-emerald-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loggingIn}
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg"
            >
              {loggingIn ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          Demo Credential: <code className="bg-slate-950 text-emerald-400 px-1.5 py-0.5 rounded">admin / admin123</code>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Moderation Queue Panel
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-emerald-400" />
          <div>
            <h2 className="text-lg font-bold font-display">Integrity Moderation Queue</h2>
            <p className="text-xs text-slate-400">Human Review &amp; Transparent Public Verdicts</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTickets}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh Queue"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white ml-2 underline"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Filter:</span>
        {['open', 'triaging', 'resolved', 'dismissed', ''].map((st) => (
          <button
            key={st || 'all'}
            onClick={() => { setStatusFilter(st); setSelectedTicket(null); }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors capitalize ${
              statusFilter === st 
                ? 'bg-emerald-700 text-white shadow-xs' 
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {st || 'All Tickets'}
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-12 min-h-[500px]">
        {/* Left Column: Tickets Queue List (5 cols) */}
        <div className="md:col-span-5 border-r border-slate-200 max-h-[600px] overflow-y-auto divide-y divide-slate-100">
          {loading && tickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading moderation tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No tickets found for filter '{statusFilter || 'all'}'</div>
          ) : (
            tickets.map((tkt) => {
              const isSelected = selectedTicket?._id === tkt._id;
              return (
                <div
                  key={tkt._id}
                  onClick={() => setSelectedTicket(tkt)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900">{tkt.ticketId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider ${
                      tkt.status === 'open' ? 'bg-amber-100 text-amber-800' :
                      tkt.status === 'triaging' ? 'bg-blue-100 text-blue-800' :
                      tkt.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tkt.status}
                    </span>
                  </div>

                  <p className="text-xs font-extrabold text-slate-800 truncate mb-1">
                    {tkt.subject?.label || 'Subject'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="capitalize">{tkt.category?.replace('_', ' ')}</span>
                    <span className="font-medium">{tkt.source === 'auto_signal' ? '🤖 Auto Signal' : '👤 User Report'}</span>
                  </div>

                  {tkt.verdict && (
                    <div className="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded inline-block">
                      Verdict: {tkt.verdict}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Ticket Inspection & Verdict Action (7 cols) */}
        <div className="md:col-span-7 p-6 max-h-[600px] overflow-y-auto">
          {!selectedTicket ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Eye className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">Select a ticket from the left queue to inspect details &amp; set moderation verdicts.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ticket Top Info */}
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-slate-900">{selectedTicket.ticketId}</span>
                  <span className="text-xs text-slate-500">
                    Created {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{selectedTicket.subject?.label}</h3>
                {selectedTicket.subject?.displayedValue && (
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    Displayed: {selectedTicket.subject.displayedValue}
                  </p>
                )}
              </div>

              {/* Reason & Signals */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reporter Reason / Trigger</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{selectedTicket.reason}</p>
                </div>

                {selectedTicket.signals && selectedTicket.signals.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Computed Heuristic Signals</span>
                    <ul className="mt-1 space-y-1">
                      {selectedTicket.signals.map((sig, idx) => (
                        <li key={idx} className="text-xs text-amber-900 bg-amber-50 border border-amber-200 p-2 rounded-lg font-medium">
                          ⚠ <strong>[{sig.code}]</strong> {sig.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Server-Captured Source of Record */}
              <div className="border border-slate-200 rounded-xl p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Server-Captured Snapshot (Source of Record)
                </span>
                <pre className="text-[11px] font-mono bg-slate-950 text-slate-200 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedTicket.sourceOfRecord || {}, null, 2)}
                </pre>
              </div>

              {/* Published Verdict (if exists) */}
              {selectedTicket.verdict && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Published Public Verdict
                  </span>
                  <p className="text-sm font-black text-emerald-950 capitalize">
                    {selectedTicket.verdict}
                  </p>
                  <p className="text-xs text-emerald-900 mt-1">"{selectedTicket.verdictNote}"</p>
                  <p className="text-[10px] text-emerald-700 mt-2">
                    Set by {selectedTicket.verdictBy} at {new Date(selectedTicket.verdictAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Action Form: Triage or Set Verdict */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                {/* Triage buttons */}
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-2">Update Triage Status</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleTriage('triaging')}
                      disabled={actionSubmitting}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Set Triaging
                    </button>
                    <button
                      onClick={() => handleTriage('dismissed')}
                      disabled={actionSubmitting}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Dismiss Ticket
                    </button>
                  </div>
                </div>

                {/* Publish Public Verdict Form */}
                <form onSubmit={handleSetVerdict} className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                    Publish Human Verdict (Carries Who, When &amp; Why)
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Verdict Verdict</label>
                      <select
                        value={verdictForm.verdict}
                        onChange={(e) => setVerdictForm({ ...verdictForm, verdict: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        <option value="verified">Verified (True)</option>
                        <option value="disputed">Disputed (Under Challenge)</option>
                        <option value="misleading">Misleading (Inaccurate)</option>
                        <option value="removed">Removed (Violating)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Public Explanation Note *</label>
                      <input
                        type="text"
                        value={verdictForm.note}
                        onChange={(e) => setVerdictForm({ ...verdictForm, note: e.target.value })}
                        placeholder="e.g. Rate checked against APMC records; verified within normal range"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={actionSubmitting || !verdictForm.note.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" /> Publish Verdict to Public Board
                  </button>
                </form>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
