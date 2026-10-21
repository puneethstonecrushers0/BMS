import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await register({ name, email, password });
      if (res.isPendingApproval) {
        setSuccessMessage('Account request submitted. An administrator must approve your account and assign permissions before you can sign in.');
      } else {
        setSuccessMessage('Administrator account created successfully. You may now sign in.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please review details.');
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
            BMS
          </div>
          <h2 className="text-xl font-bold tracking-tight text-black uppercase">
            Request Account
          </h2>
          <p className="text-xs text-[#6b7280] mt-1 font-mono">
            New accounts require administrator approval
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-5 p-3 border border-black bg-[#f3f4f6] text-black text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successMessage ? (
          <div className="space-y-4">
            <div className="p-4 border border-black bg-[#f9fafb] text-black text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
                <CheckCircle className="w-4 h-4 text-black" />
                <span>Request Received</span>
              </div>
              <p className="text-[#4b5563] leading-relaxed">{successMessage}</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] transition-colors rounded-none"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Operator"
                  className="w-full px-3 py-2 pl-9 text-xs border border-[#d1d5db] bg-white focus:outline-none focus:border-black rounded-none transition-colors"
                />
                <UserIcon className="w-4 h-4 text-[#9ca3af] absolute left-3 top-2.5" />
              </div>
            </div>

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
                  placeholder="user@bms.local"
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
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="w-full px-3 py-2 pl-9 text-xs border border-[#d1d5db] bg-white focus:outline-none focus:border-black rounded-none transition-colors"
                />
                <Lock className="w-4 h-4 text-[#9ca3af] absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-black uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
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
                <span>{isSubmitting ? 'Submitting Request...' : 'Submit Registration'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#e5e7eb] flex items-center justify-between text-xs text-[#6b7280]">
          <span>Existing operator?</span>
          <Link to="/login" className="font-semibold text-black hover:underline uppercase tracking-wider text-[11px]">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
