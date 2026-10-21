import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate('/overview');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] bg-grid-subtle px-4 py-12">
      <div className="max-w-md w-full bg-white border border-[#e5e7eb] p-8 shadow-card rounded-none">
        {/* Header */}
        <div className="mb-6">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider mb-3 shadow-subtle">
            PSC
          </div>
          <h2 className="text-xl font-bold tracking-tight text-black uppercase">
            Operations Access
          </h2>
          <p className="text-xs text-[#6b7280] mt-1 font-mono">
            Boulder & Material Management System
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-5 p-3 border border-black bg-[#f3f4f6] text-black text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-black" />
            <span>{error}</span>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-black uppercase tracking-wider mb-1">
              Work Email
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@bms.local"
                className="w-full px-3 py-2 pl-9 text-xs border border-[#d1d5db] bg-white focus:outline-none focus:border-black rounded-none transition-colors font-mono"
              />
              <Mail className="w-4 h-4 text-[#9ca3af] absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pl-9 text-xs border border-[#d1d5db] bg-white focus:outline-none focus:border-black rounded-none transition-colors"
              />
              <Lock className="w-4 h-4 text-[#9ca3af] absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] transition-colors flex items-center justify-center space-x-2 rounded-none shadow-subtle disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Information notice */}
        <div className="mt-6 pt-4 border-t border-[#e5e7eb] text-center text-xs text-[#6b7280]">
          <span className="font-mono text-[11px]">Worker accounts are provisioned directly by System Administration.</span>
        </div>
      </div>
    </div>
  );
};
