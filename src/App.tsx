import { useEffect, useRef, useState } from 'react';
import { FileText, Brain, Users, Target, Lightbulb, Zap, Menu, X } from 'lucide-react';
import PRDBuilder from './components/PRDBuilder';
import PrioritizationMatrix from './components/PrioritizationMatrix';
import StakeholderInput from './components/StakeholderInput';
import Dashboard from './components/Dashboard';
import Login, { AuthUser } from './components/Login';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prd' | 'prioritization' | 'stakeholders'>('dashboard');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pmcopilot_user');
      if (saved) setUser(JSON.parse(saved));
    } catch {}
  }, []);

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
                <span>{label}</span>
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
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard user={user || undefined} />}
        {activeTab === 'prd' && <PRDBuilder />}
        {activeTab === 'prioritization' && <PrioritizationMatrix />}
        {activeTab === 'stakeholders' && <StakeholderInput />}
      </main>
      </>
      )}
    </div>
  );
}

export default App;