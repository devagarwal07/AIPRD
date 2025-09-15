// Reconstructed clean App with i18n provider
import { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { FileText, Brain, Users, Target, Lightbulb, Zap, Menu, X, Moon, Sun } from 'lucide-react';
import Dashboard from './components/Dashboard';
import PRDBuilder from './components/PRDBuilder';
import { CommandPalette, CommandItem } from './components/CommandPalette';
import PrioritizationMatrix from './components/PrioritizationMatrix';
import StakeholderInput from './components/StakeholderInput';
import ReadOnlyPRD from './components/ReadOnlyPRD';
import SurveyIntake from './components/SurveyIntake';
import Login, { AuthUser } from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import { I18nProvider, useI18n } from './i18n';
import { initSentry, isTelemetryEnabled, setTelemetryEnabled, ensureWebVitalsCapture, disableTelemetryRuntime, markPrdStart, metric } from './utils/telemetry';
import { usePrdStore } from './store/prdStore';
import { toast } from './utils/toast';

// Clerk availability (set in main.tsx)
const hasClerk = (typeof window !== 'undefined') ? !!(window as any).__HAS_CLERK__ : true;

function InnerApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { t, locale, setLocale } = useI18n();
  const pathToTab: Record<string, string> = { '/': 'dashboard', '/prd': 'prd', '/prioritization': 'prioritization', '/stakeholders': 'stakeholders' };
  const activeTab = pathToTab[pathname] || 'dashboard';
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [liveMessage, setLiveMessage] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { const saved = localStorage.getItem('pmcopilot_theme') as 'light' | 'dark' | null; if(saved==='light'||saved==='dark') return saved; return typeof window!=='undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light'; } catch { return 'light'; }
  });
  const [fontScale, setFontScale] = useState<'sm'|'md'|'lg'>(()=>{ try { const saved = localStorage.getItem('pmcopilot_font_scale'); if(saved==='sm'||saved==='md'||saved==='lg') return saved; } catch {}; return 'md'; });
  const [online, setOnline] = useState<boolean>(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Snapshot store access (lazy usage for shortcut & palette command)
  const addSnapshot = usePrdStore(s=>s.addSnapshot);
  const formData = usePrdStore(s=>s.formData);
  const sections = usePrdStore(s=>s.sections);
  const templateId = usePrdStore(s=>s.templateId);

  const saveSnapshot = () => {
    // Only meaningful on /prd route, but allow elsewhere (will still capture state)
    addSnapshot({ formData, sections, templateId });
    toast.success('Snapshot saved');
    metric('snapshot_saved_shortcut', { route: pathname });
  };
  // Online / Offline listeners
  useEffect(()=>{
    const update = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return ()=>{ window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  },[]);

  const tabs = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Target, to: '/' },
    { id: 'prd', label: t('nav.prd'), icon: FileText, to: '/prd' },
    { id: 'prioritization', label: t('nav.prioritization'), icon: Brain, to: '/prioritization' },
    { id: 'stakeholders', label: t('nav.stakeholders'), icon: Users, to: '/stakeholders' }
  ];

  const NotFound = () => (
    <div className="max-w-xl mx-auto card card-section">
      <h2 className="text-xl font-bold mb-2">{t('nav.notFound')}</h2>
      <p className="text-sm text-gray-600 mb-4">{t('notFound.message')}</p>
      <button className="btn btn-primary btn-sm" onClick={()=>navigate('/')}>{t('notFound.goHome')}</button>
    </div>
  );

  // Load user from local storage (fallback auth mode)
  useEffect(() => { try { const saved = localStorage.getItem('pmcopilot_user'); if(saved) setUser(JSON.parse(saved)); } catch {} }, []);
  // Pending stakeholder reviews counter
  useEffect(() => { const load=()=>{ try { const raw = localStorage.getItem('pmcopilot_review_requests'); const list = raw? JSON.parse(raw):[]; setPendingReviews(list.filter((r: any)=>r.status==='pending').length);} catch { setPendingReviews(0);} }; load(); const h=()=>load(); window.addEventListener('pmcopilot_reviews_updated', h); return ()=>window.removeEventListener('pmcopilot_reviews_updated', h); }, []);
  // Initialize Sentry if previously consented
  useEffect(()=>{ if(isTelemetryEnabled()) initSentry(); },[]);
  // Secret paste detection
  useEffect(()=>{ const patterns=[ { re:/sk-[A-Za-z0-9]{20,}/, label:'OpenAI-style key'}, {re:/ghp_[A-Za-z0-9]{30,}/, label:'GitHub token'}, {re:/ssh-rsa\s+[A-Za-z0-9+/=]{100,}/, label:'SSH key'}, {re:/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, label:'Private key'}, {re:/AIzaSy[0-9A-Za-z_-]{30,}/, label:'Google API key'}, {re:/xox[baprs]-[A-Za-z0-9-]{10,}/, label:'Slack token'}, {re:/(?<![A-Za-z0-9])(AKIA|ASIA)[A-Z0-9]{16}(?![A-Za-z0-9])/, label:'AWS access key'}, {re:/aws(.{0,20})?(secret|key).{0,5}[=:\s][A-Za-z0-9/+]{30,}/i, label:'AWS secret key'}]; function onPaste(e: ClipboardEvent){ try { const txt=e.clipboardData?.getData('text')||''; if(!txt) return; const hits=patterns.filter(p=>p.re.test(txt)); if(hits.length){ toast.info(`Potential secret detected (${hits.map(h=>h.label).join(', ')}). Consider removing sensitive data before saving or sharing.`);} } catch {} } window.addEventListener('paste',onPaste); return ()=>window.removeEventListener('paste',onPaste); },[]);
  // Theme persistence
  useEffect(()=>{ try { localStorage.setItem('pmcopilot_theme', theme);} catch {} if(typeof document!=='undefined') document.documentElement.setAttribute('data-theme', theme); },[theme]);
  // Font scale persistence & application
  useEffect(()=>{
    try { localStorage.setItem('pmcopilot_font_scale', fontScale); } catch {}
    const scaleVal = fontScale==='sm'? 0.9 : fontScale==='lg'? 1.15 : 1;
    if(typeof document!=='undefined') document.documentElement.style.setProperty('--font-scale', String(scaleVal));
  },[fontScale]);
  // Live region updates
  useEffect(()=>{ const label=tabs.find(t=>t.id===activeTab)?.label||activeTab; setLiveMessage(`${label} panel`); },[activeTab, tabs]);
  // Global shortcuts (Cmd+K = palette, Cmd+S = force snapshot, Cmd+Shift+F = open palette for search)
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if(cmd && e.key.toLowerCase()==='k'){ e.preventDefault(); setPaletteOpen(o=>!o); }
      else if(cmd && e.key.toLowerCase()==='s'){ e.preventDefault(); saveSnapshot(); }
      else if(cmd && e.shiftKey && e.key.toLowerCase()==='f'){ e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  },[saveSnapshot]);

  const paletteItems: CommandItem[] = [
    { id:'nav.dashboard', title:`Go: ${t('nav.dashboard')}`, onRun: ()=>navigate('/') , shortcut:'G D' },
    { id:'nav.prd', title:`Go: ${t('nav.prd')}`, onRun: ()=>navigate('/prd'), shortcut:'G P' },
    { id:'nav.prioritization', title:`Go: ${t('nav.prioritization')}`, onRun: ()=>navigate('/prioritization'), shortcut:'G R' },
    { id:'nav.stakeholders', title:`Go: ${t('nav.stakeholders')}`, onRun: ()=>navigate('/stakeholders'), shortcut:'G S' },
    { id:'snapshot.save', title:'Save Snapshot', onRun: ()=> saveSnapshot(), shortcut:'⌘ S' },
    { id:'theme.toggle', title:`Toggle Theme (${theme==='dark'?'Light':'Dark'})`, onRun: ()=>setTheme(th=> th==='dark'? 'light':'dark'), shortcut:'T T' },
    { id:'font.sm', title:'Font: Small', onRun: ()=>setFontScale('sm') },
    { id:'font.md', title:'Font: Medium', onRun: ()=>setFontScale('md') },
    { id:'font.lg', title:'Font: Large', onRun: ()=>setFontScale('lg') },
    { id:'palette.close', title:'Close Palette', onRun: ()=>setPaletteOpen(false) }
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg"><Zap className="h-6 w-6 text-white" /></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
                <p className="hidden sm:block text-sm text-gray-500">{t('app.tagline')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select
                aria-label="Locale"
                className="border rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring"
                value={locale}
                onChange={(e)=>setLocale(e.target.value)}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
              <select
                aria-label={t('font.scale.label' as any) as string}
                className="border rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring hidden sm:block"
                value={fontScale}
                onChange={(e)=> setFontScale(e.target.value as any)}
                title={t('font.scale.label' as any) as string}
              >
                <option value="sm">{t('font.scale.small' as any)}</option>
                <option value="md">{t('font.scale.medium' as any)}</option>
                <option value="lg">{t('font.scale.large' as any)}</option>
              </select>
              <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 rounded-lg border"><Lightbulb className="h-4 w-4 text-amber-500" /><span className="text-sm font-medium text-gray-700">{t('ai.assistantActive')}</span></div>
              <button onClick={()=>setTheme(th=>th==='light'?'dark':'light')} className="btn btn-outline p-2" aria-label="Toggle theme" title={theme==='dark'? 'Switch to light mode':'Switch to dark mode'}>{theme==='dark'? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
              {hasClerk && (<><SignedOut><div className="flex items-center gap-2"><SignInButton mode="modal"><button className="btn btn-outline btn-sm">{t('auth.signIn')}</button></SignInButton><SignUpButton mode="modal"><button className="btn btn-primary btn-sm">{t('auth.signUp')}</button></SignUpButton></div></SignedOut><SignedIn><UserButton afterSignOutUrl="/" appearance={{ elements:{ avatarBox:'w-8 h-8'} }} /></SignedIn></>)}
              {!hasClerk && <span className="text-xs text-gray-500 italic">Auth disabled (no Clerk key)</span>}
              {user && (<button onClick={()=>setMobileNavOpen(s=>!s)} className="md:hidden ml-1 btn btn-outline p-2" aria-label="Toggle navigation">{mobileNavOpen? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>)}
            </div>
          </div>
        </div>
      </header>
      {!online && (
        <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-700 text-sm py-1 px-4 text-center" role="status" aria-live="polite">
          You are offline. Changes are stored locally; sync & AI features paused.
        </div>
      )}
      {hasClerk ? (
        <>
          <SignedOut>{!user && (<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><Login onLogin={(u)=>setUser(u)} /></main>)}</SignedOut>
          <SignedIn>
            <>
              <nav className="bg-white border-b border-gray-200" role="navigation" aria-label="Main">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="hidden md:flex space-x-8" role="tablist" aria-label="Primary sections">
                    {tabs.map(({id,label,icon:Icon,to})=> (
                      <button key={id} id={`tab-${id}`} role="tab" aria-selected={activeTab===id} aria-controls={`panel-${id}`} tabIndex={activeTab===id?0:-1} onClick={()=>navigate(to)} className={`tab ${activeTab===id?'tab-active':''}`}>
                        <Icon className="h-4 w-4" />
                        <span className="inline-flex items-center gap-1">{label}{id==='stakeholders' && pendingReviews>0 && (<span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">{pendingReviews}</span>)}</span>
                      </button>
                    ))}
                  </div>
                  {mobileNavOpen && (
                    <div className="md:hidden py-2 space-y-1" role="tablist" aria-label="Primary sections mobile">
                      {tabs.map(({id,label,icon:Icon,to})=> (
                        <button key={id} id={`tab-${id}-m`} role="tab" aria-selected={activeTab===id} aria-controls={`panel-${id}`} tabIndex={activeTab===id?0:-1} onClick={()=>{ navigate(to); setMobileNavOpen(false); }} className={`w-full flex items-center space-x-2 px-3 py-3 text-sm font-medium rounded-md transition-colors ${activeTab===id?'bg-blue-50 text-blue-700':'hover:bg-gray-50 text-gray-700'}`}>
                          <Icon className="h-4 w-4" />
                          <span className="flex-1 flex items-center justify-between">{label}{id==='stakeholders' && pendingReviews>0 && (<span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">{pendingReviews}</span>)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" defaultChecked={isTelemetryEnabled()} onChange={(e)=>{ const enabled=e.target.checked; setTelemetryEnabled(enabled); if(enabled){ initSentry(); ensureWebVitalsCapture(); } else { disableTelemetryRuntime(); } }} />
                      {t('telemetry.shareAnonymous')}
                    </label>
                  </div>
                </div>
              </nav>
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div aria-live="polite" role="status" className="sr-only">{liveMessage}</div>
                <ErrorBoundary>
                  <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}> 
                    <Suspense fallback={<div className="text-sm text-gray-600">{t('loading.generic')}</div>}>
                      <Routes>
                        <Route path="/" element={<ErrorBoundary><Dashboard user={user || undefined} /></ErrorBoundary>} />
                        <Route path="/prd" element={<ErrorBoundary><PRDBuilder /></ErrorBoundary>} />
                        <Route path="/prioritization" element={<ErrorBoundary><PrioritizationMatrix /></ErrorBoundary>} />
                        <Route path="/stakeholders" element={<ErrorBoundary><StakeholderInput /></ErrorBoundary>} />
                        <Route path="/share/prd" element={<ErrorBoundary><ReadOnlyPRD /></ErrorBoundary>} />
                        <Route path="/share/survey" element={<ErrorBoundary><SurveyIntake /></ErrorBoundary>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </div>
                </ErrorBoundary>
              </main>
            </>
          </SignedIn>
        </>
      ) : (
        (()=>{
          if(!user){
            const dummy = { name: 'Local User', email: 'local@example.com' } as AuthUser;
            try { localStorage.setItem('pmcopilot_user', JSON.stringify(dummy)); } catch {}
            setUser(dummy);
          }
          return (
            <>
              {user && (
                <nav className="bg-white border-b border-gray-200" role="navigation" aria-label="Main">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="hidden md:flex space-x-8" role="tablist" aria-label="Primary sections">
                      {tabs.map(({id,label,icon:Icon,to})=> (
                        <button key={id} id={`tab-${id}`} role="tab" aria-selected={activeTab===id} aria-controls={`panel-${id}`} tabIndex={activeTab===id?0:-1} onClick={()=>navigate(to)} className={`tab ${activeTab===id?'tab-active':''}`}>
                          <Icon className="h-4 w-4" />
                          <span className="inline-flex items-center gap-1">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </nav>
              )}
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <ErrorBoundary>
                  <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}> 
                    <Suspense fallback={<div className="text-sm text-gray-600">{t('loading.generic')}</div>}>
                      <Routes>
                        <Route path="/" element={<Dashboard user={user || undefined} />} />
                        <Route path="/prd" element={(markPrdStart(), <PRDBuilder />)} />
                        <Route path="/prioritization" element={<PrioritizationMatrix />} />
                        <Route path="/stakeholders" element={<StakeholderInput />} />
                        <Route path="/share/prd" element={<ReadOnlyPRD />} />
                        <Route path="/share/survey" element={<SurveyIntake />} />
                      </Routes>
                    </Suspense>
                  </div>
                </ErrorBoundary>
              </main>
            </>
          );
        })()
      )}
      <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} items={paletteItems} />
    </div>
  );
}

export default function App(){
  return (
    <I18nProvider>
      <InnerApp />
    </I18nProvider>
  );
}