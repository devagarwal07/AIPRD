import { useEffect, useRef, useState } from 'react';
import { FileText, Brain, Users, Target, Lightbulb, Zap, Menu, X, Moon, Sun } from 'lucide-react';
import PRDBuilder from './components/PRDBuilder';
import PrioritizationMatrix from './components/PrioritizationMatrix';
import StakeholderInput from './components/StakeholderInput';
import Dashboard from './components/Dashboard';
import Login, { AuthUser } from './components/Login';
import ReadOnlyPRD from './components/ReadOnlyPRD';
import SurveyIntake from './components/SurveyIntake';
import { initSentry, isTelemetryEnabled, setTelemetryEnabled, markPrdStart } from './utils/telemetry';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prd' | 'prioritization' | 'stakeholders'>('dashboard');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('pmcopilot_theme') as 'light' | 'dark' | null;
      if (saved === 'light' || saved === 'dark') return saved;
      // fallback to system preference
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pmcopilot_user');
      if (saved) setUser(JSON.parse(saved));
    } catch {}
  }, []);

  // Pending review badge (lightweight)
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('pmcopilot_review_requests');
        const list = raw ? JSON.parse(raw) as Array<{ status: 'pending' | 'approved' | 'changes' }> : [];
        setPendingReviews(list.filter(r => r.status === 'pending').length);
      } catch { setPendingReviews(0); }
    };
    load();
    const handler = () => load();
    window.addEventListener('pmcopilot_reviews_updated', handler);
    return () => window.removeEventListener('pmcopilot_reviews_updated', handler);
  }, []);

  // Sentry/telemetry init (opt-in)
  useEffect(() => {
    if (isTelemetryEnabled()) initSentry();
  }, []);

  // Apply theme to root and persist
  useEffect(() => {
    try { localStorage.setItem('pmcopilot_theme', theme); } catch {}
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Close the profile menu on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const getInitials = (value: string) => {
    const name = value.trim();
    if (name.includes(' ')) {
      const parts = name.split(/\s+/).filter(Boolean);
      const first = parts[0]?.[0] || '';
      const second = parts[1]?.[0] || '';
      return (first + second).toUpperCase();
    }
    // fallback for single word or email
    const raw = name.includes('@') ? name.split('@')[0] : name;
    const letters = raw.replace(/[^a-zA-Z]/g, '');
    return (letters.slice(0, 2) || raw.slice(0, 2)).toUpperCase();
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'prd', label: 'PRD Builder', icon: FileText },
    { id: 'prioritization', label: 'Prioritization', icon: Brain },
    { id: 'stakeholders', label: 'Stakeholder Input', icon: Users }
  ];

  // Simple query-based route for read-only share view
  const qp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const sharedView = qp?.get('view');

  if (sharedView === 'prd') {
    return <ReadOnlyPRD />;
  }
  if (sharedView === 'survey') {
    return <SurveyIntake />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PM Copilot</h1>
                <p className="hidden sm:block text-sm text-gray-500">AI-Powered Product Management Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 rounded-lg border">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">AI Assistant Active</span>
              </div>
              <button
                onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                className="btn btn-outline p-2"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="User menu"
                  >
                    {getInitials(user.name || user.email)}
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
                    >
                      <button
                        onClick={() => {
                          setUser(null);
                          localStorage.removeItem('pmcopilot_user');
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
              {/* Mobile nav toggle */}
              {user ? (
                <button
                  onClick={() => setMobileNavOpen((s) => !s)}
                  className="md:hidden ml-1 btn btn-outline p-2"
                  aria-label="Toggle navigation"
                >
                  {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Gate for unauthenticated */}
      {!user ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Login onLogin={(u) => setUser(u)} />
        </main>
      ) : (
      <>
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop nav */}
      <div className="hidden md:flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
        className={`tab ${activeTab === id ? 'tab-active' : ''}`}
              >
                <Icon className="h-4 w-4" />
                <span className="inline-flex items-center gap-1">
                  {label}
                  {id === 'stakeholders' && pendingReviews > 0 && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                      {pendingReviews}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
          {/* Mobile nav */}
          {mobileNavOpen && (
            <div className="md:hidden py-2 space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveTab(id as any); setMobileNavOpen(false); }}
                  className={`w-full flex items-center space-x-2 px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 flex items-center justify-between">
                    {label}
                    {id === 'stakeholders' && pendingReviews > 0 && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                        {pendingReviews}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
          {/* Telemetry opt-in (simple) */}
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                defaultChecked={isTelemetryEnabled()}
                onChange={(e) => { setTelemetryEnabled(e.target.checked); if (e.target.checked) initSentry(); }}
              />
              Share anonymous usage to improve PM Copilot
            </label>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {activeTab === 'dashboard' && <Dashboard user={user || undefined} />}
  {activeTab === 'prd' && (markPrdStart(), <PRDBuilder />)}
        {activeTab === 'prioritization' && <PrioritizationMatrix />}
        {activeTab === 'stakeholders' && <StakeholderInput />}
      </main>
      </>
      )}
    </div>
  );
}

export default App;