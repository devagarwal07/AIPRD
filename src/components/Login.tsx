import { useEffect, useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export type AuthUser = { name: string; email: string };

export default function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    setStatus(null);
  }, [mode, email, password, name]);

  const validate = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email';
    if (mode === 'signup' && name.trim().length < 2) return 'Enter your name';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      setStatus({ type: 'error', msg: error });
      return;
    }
    // Fake auth: store minimal profile locally
    const profile = { name: mode === 'signup' ? name.trim() : email.split('@')[0], email: email.toLowerCase() };
    try {
      if (remember) localStorage.setItem('pmcopilot_user', JSON.stringify(profile));
    } catch {}
    setStatus({ type: 'success', msg: mode === 'signup' ? 'Account created' : 'Signed in' });
    setTimeout(() => onLogin(profile), 500);
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-0">
      <div className="card card-section">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="text-gray-600">{mode === 'signin' ? 'Sign in to continue' : 'Start using PM Copilot'}</p>
          </div>
          {mode === 'signin' ? <LogIn className="h-6 w-6 text-blue-600" /> : <UserPlus className="h-6 w-6 text-blue-600" />}
        </div>

        {status && (
          <div className={`flex items-center p-3 rounded-md mb-4 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
            <span className="text-sm">{status.msg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <div className="relative">
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                className="input pl-10"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                className="input pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-blue-600 text-sm hover:text-blue-700">
              {mode === 'signin' ? 'Create account' : 'Have an account? Sign in'}
            </button>
          </div>
          <button type="submit" className="w-full btn btn-primary">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
