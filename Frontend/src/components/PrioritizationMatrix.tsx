import { useEffect, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Plus, TrendingUp, DollarSign, Zap, BarChart3, Download, SlidersHorizontal, Calculator } from 'lucide-react';

interface Feature {
  id: string;
  name: string;
  impact: number;
  effort: number;
  confidence: number;
  category: string;
  riceReach: number;
  riceImpact: number;
  riceConfidence: number;
  riceEffort: number;
  blockedBy: string[];
}

const PrioritizationMatrix = () => {
  const [features, setFeatures] = useState<Feature[]>([
    { id: '1', name: 'Push Notifications', impact: 8, effort: 3, confidence: 9, category: 'User Engagement', riceReach: 5000, riceImpact: 2, riceConfidence: 0.8, riceEffort: 1.5, blockedBy: [] },
    { id: '2', name: 'Dark Mode', impact: 4, effort: 5, confidence: 8, category: 'User Experience', riceReach: 3000, riceImpact: 1, riceConfidence: 0.9, riceEffort: 1, blockedBy: [] },
    { id: '3', name: 'Advanced Analytics', impact: 9, effort: 8, confidence: 6, category: 'Business Intelligence', riceReach: 1500, riceImpact: 3, riceConfidence: 0.6, riceEffort: 4, blockedBy: [] },
    { id: '4', name: 'Social Login', impact: 6, effort: 4, confidence: 9, category: 'Authentication', riceReach: 4000, riceImpact: 1, riceConfidence: 0.85, riceEffort: 1.2, blockedBy: [] },
    { id: '5', name: 'Offline Mode', impact: 7, effort: 9, confidence: 5, category: 'Performance', riceReach: 800, riceImpact: 2, riceConfidence: 0.5, riceEffort: 6, blockedBy: [] },
    { id: '6', name: 'In-App Messaging', impact: 8, effort: 6, confidence: 7, category: 'User Engagement', riceReach: 2500, riceImpact: 2, riceConfidence: 0.7, riceEffort: 2.5, blockedBy: [] },
  ]);

  const [newFeature, setNewFeature] = useState({
    name: '',
    impact: 5,
    effort: 5,
    confidence: 5,
    category: 'User Experience',
    riceReach: 1000,
    riceImpact: 1,
    riceConfidence: 0.7,
    riceEffort: 2,
  blockedBy: [] as string[],
  });

  const [showForm, setShowForm] = useState(false);
  const [weights, setWeights] = useState({ impact: 0.5, confidence: 0.3, effort: 0.2 });
  type RiceMultipliers = { reach: number; impact: number; confidence: number; effort: number };
  const [riceMultipliers, setRiceMultipliers] = useState<RiceMultipliers>({ reach: 1, impact: 1, confidence: 1, effort: 1 });
  const [preset, setPreset] = useState<'custom' | 'growth' | 'stability' | 'debt'>('custom');

  // persistence (with migration for RICE fields)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pmcopilot_features');
  const savedWeights = localStorage.getItem('pmcopilot_feature_weights');
  const savedRice = localStorage.getItem('pmcopilot_rice_multipliers');
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = (parsed || []).map((f: any) => ({
          riceReach: typeof f.riceReach === 'number' ? f.riceReach : 1000,
          riceImpact: typeof f.riceImpact === 'number' ? f.riceImpact : 1,
          riceConfidence: typeof f.riceConfidence === 'number' ? f.riceConfidence : 0.7,
          riceEffort: typeof f.riceEffort === 'number' ? f.riceEffort : 2,
          blockedBy: Array.isArray(f.blockedBy) ? f.blockedBy : [],
          ...f,
        }));
        setFeatures(migrated);
      }
      if (savedWeights) setWeights(JSON.parse(savedWeights));
  if (savedRice) setRiceMultipliers(JSON.parse(savedRice));
    } catch {}
  }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('pmcopilot_features', JSON.stringify(features)); } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [features]);
  useEffect(() => {
    try { localStorage.setItem('pmcopilot_feature_weights', JSON.stringify(weights)); } catch {}
  }, [weights]);
  useEffect(() => {
    try { localStorage.setItem('pmcopilot_rice_multipliers', JSON.stringify(riceMultipliers)); } catch {}
  }, [riceMultipliers]);

  // Roadmap scenario presets
  const applyPreset = (p: 'growth' | 'stability' | 'debt') => {
    if (p === 'growth') {
      setWeights({ impact: 0.6, confidence: 0.25, effort: 0.15 });
      setRiceMultipliers({ reach: 1.25, impact: 1.25, confidence: 1.0, effort: 1.0 });
    } else if (p === 'stability') {
      setWeights({ impact: 0.4, confidence: 0.4, effort: 0.2 });
      setRiceMultipliers({ reach: 0.9, impact: 1.0, confidence: 1.2, effort: 1.0 });
    } else {
      // debt
      setWeights({ impact: 0.3, confidence: 0.3, effort: 0.4 });
      setRiceMultipliers({ reach: 0.9, impact: 0.9, confidence: 1.1, effort: 1.3 });
    }
    setPreset(p);
  };

  const calculatePriorityScore = (feature: Feature) => {
    const impactScore = feature.impact * weights.impact;
    const confidenceScore = feature.confidence * weights.confidence;
    const effortScore = feature.effort * weights.effort;
    const score = (impactScore + confidenceScore) / Math.max(1, effortScore);
    return Math.round(score * 10);
  };

  const getSortedFeatures = () => {
    return [...features].sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a));
  };

  const exportCSV = () => {
    let csv = '';
    if (mode === 'matrix') {
      const header = ['Name','Category','Impact','Effort','Confidence','Matrix Score'];
      const rows = getSortedFeatures().map(f => [f.name, f.category, f.impact, f.effort, f.confidence, calculatePriorityScore(f)]);
      csv = [header, ...rows].map(r => r.join(',')).join('\n');
    } else {
      const header = ['Name','Category','Reach','Impact','Confidence','Effort','RICE Score'];
      const rows = getRiceSortedFeatures().map(f => [f.name, f.category, f.riceReach, f.riceImpact, f.riceConfidence, f.riceEffort, calculateRiceScore(f)]);
      csv = [header, ...rows].map(r => r.join(',')).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'matrix' ? 'feature_priorities_matrix.csv' : 'feature_priorities_rice.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getQuadrant = (feature: Feature) => {
    const isHighImpact = feature.impact >= 6;
    const isLowEffort = feature.effort <= 5;
    
    if (isHighImpact && isLowEffort) return 'quick-wins';
    if (isHighImpact && !isLowEffort) return 'major-projects';
    if (!isHighImpact && isLowEffort) return 'fill-ins';
    return 'time-sinks';
  };

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case 'quick-wins': return 'bg-green-100 border-green-300';
      case 'major-projects': return 'bg-blue-100 border-blue-300';
      case 'fill-ins': return 'bg-yellow-100 border-yellow-300';
      case 'time-sinks': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const addFeature = () => {
    if (newFeature.name.trim()) {
      const feature: Feature = {
        id: Date.now().toString(),
  name: newFeature.name,
  impact: newFeature.impact,
  effort: newFeature.effort,
  confidence: newFeature.confidence,
  category: newFeature.category,
  riceReach: newFeature.riceReach,
  riceImpact: newFeature.riceImpact,
  riceConfidence: newFeature.riceConfidence,
  riceEffort: newFeature.riceEffort,
 blockedBy: [...newFeature.blockedBy],
      };
      setFeatures([...features, feature]);
      setNewFeature({
        name: '',
        impact: 5,
        effort: 5,
        confidence: 5,
  category: 'User Experience',
  riceReach: 1000,
  riceImpact: 1,
  riceConfidence: 0.7,
  riceEffort: 2,
 blockedBy: [],
      });
      setShowForm(false);
    }
  };

  const categories = ['User Experience', 'User Engagement', 'Business Intelligence', 'Performance', 'Authentication'];
  const [mode, setMode] = useState<'matrix' | 'rice'>('matrix');

  const calculateRiceScore = (feature: Feature) => {
    const reach = Number(feature.riceReach) || 0;
    const impact = Number(feature.riceImpact) || 0;
    const confidence = Number(feature.riceConfidence) || 0;
    const effort = Number(feature.riceEffort) || 0.1;
    const score = ((reach * riceMultipliers.reach) * (impact * riceMultipliers.impact) * (confidence * riceMultipliers.confidence)) / Math.max(0.1, (effort * riceMultipliers.effort));
    return Math.round(score * 100) / 100;
  };
  const getRiceSortedFeatures = () => {
    return [...features].sort((a, b) => calculateRiceScore(b) - calculateRiceScore(a));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
  <div className="card card-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Feature Prioritization</h2>
            <p className="text-gray-600 mt-1">Switch between Impact/Effort Matrix and RICE scoring</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex rounded-md overflow-hidden border border-gray-300">
              <button
                className={`px-3 py-1 text-sm ${mode === 'matrix' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setMode('matrix')}
                title="Matrix"
              >
                <div className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Matrix</div>
              </button>
              <button
                className={`px-3 py-1 text-sm ${mode === 'rice' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setMode('rice')}
                title="RICE"
              >
                <div className="flex items-center gap-1"><Calculator className="h-4 w-4" /> RICE</div>
              </button>
            </div>
            {/* Roadmap scenario presets */}
            <div className="hidden md:flex items-center gap-1 ml-2">
              <span className="text-xs text-gray-600 mr-1">Preset:</span>
              <button
                className={`px-2 py-1 text-xs rounded ${preset === 'growth' ? 'bg-green-100 text-green-800' : 'bg-white text-gray-700 border'}`}
                onClick={() => applyPreset('growth')}
                title="Growth (boost Reach & Impact)"
              >Growth</button>
              <button
                className={`px-2 py-1 text-xs rounded ${preset === 'stability' ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-700 border'}`}
                onClick={() => applyPreset('stability')}
                title="Stability (boost Confidence)"
              >Stability</button>
              <button
                className={`px-2 py-1 text-xs rounded ${preset === 'debt' ? 'bg-amber-100 text-amber-900' : 'bg-white text-gray-700 border'}`}
                onClick={() => applyPreset('debt')}
                title="Tech Debt (penalize Effort)"
              >Debt</button>
            </div>
            <button
              onClick={exportCSV}
              className="btn btn-secondary flex items-center space-x-2"
              title="Export CSV"
            >
              <Download className="h-4 w-4 text-gray-700" />
              <span className="text-sm">Export</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Feature</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Feature Form */}
      {showForm && (
  <div className="card card-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Feature</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Feature Name</label>
              <input
                type="text"
                value={newFeature.name}
                onChange={(e) => setNewFeature({...newFeature, name: e.target.value})}
                className="input"
                placeholder="e.g., Real-time Chat"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={newFeature.category}
                onChange={(e) => setNewFeature({...newFeature, category: e.target.value})}
                className="input"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Blocked by</label>
              <select
                multiple
                className="input h-28"
                value={newFeature.blockedBy}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setNewFeature({ ...newFeature, blockedBy: options });
                }}
              >
                {features.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Cmd/Ctrl to select multiple blockers.</p>
            </div>
            <div>
              <label className="label">
                Impact (1-10): {newFeature.impact}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={newFeature.impact}
                onChange={(e) => setNewFeature({...newFeature, impact: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
            <div>
              <label className="label">
                Effort (1-10): {newFeature.effort}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={newFeature.effort}
                onChange={(e) => setNewFeature({...newFeature, effort: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">
                Confidence (1-10): {newFeature.confidence}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={newFeature.confidence}
                onChange={(e) => setNewFeature({...newFeature, confidence: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex space-x-3 mt-4">
            <button
              onClick={addFeature}
              className="btn btn-primary"
            >
              Add Feature
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left panel: Matrix or RICE */}
        {mode === 'matrix' ? (
        <div className="card card-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Impact vs. Effort Matrix</h3>
          {/* Weights */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center text-xs text-gray-600 mb-1"><SlidersHorizontal className="h-3 w-3 mr-1"/>Impact Weight: {weights.impact.toFixed(1)}</label>
              <input type="range" min="0.1" max="1" step="0.1" value={weights.impact} onChange={(e) => setWeights(w => ({...w, impact: Number(e.target.value)}))} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Confidence Weight: {weights.confidence.toFixed(1)}</label>
              <input type="range" min="0.1" max="1" step="0.1" value={weights.confidence} onChange={(e) => setWeights(w => ({...w, confidence: Number(e.target.value)}))} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Effort Weight: {weights.effort.toFixed(1)}</label>
              <input type="range" min="0.1" max="1" step="0.1" value={weights.effort} onChange={(e) => setWeights(w => ({...w, effort: Number(e.target.value)}))} className="w-full" />
            </div>
          </div>
          <div className="relative h-96">
            {/* Grid background */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
              <div className="bg-green-50 border-2 border-dashed border-green-200 rounded-lg p-2">
                <span className="text-xs font-medium text-green-700">Quick Wins</span>
                <div className="text-xs text-green-600">High Impact, Low Effort</div>
              </div>
              <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg p-2">
                <span className="text-xs font-medium text-blue-700">Major Projects</span>
                <div className="text-xs text-blue-600">High Impact, High Effort</div>
              </div>
              <div className="bg-yellow-50 border-2 border-dashed border-yellow-200 rounded-lg p-2">
                <span className="text-xs font-medium text-yellow-700">Fill-ins</span>
                <div className="text-xs text-yellow-600">Low Impact, Low Effort</div>
              </div>
              <div className="bg-red-50 border-2 border-dashed border-red-200 rounded-lg p-2">
                <span className="text-xs font-medium text-red-700">Time Sinks</span>
                <div className="text-xs text-red-600">Low Impact, High Effort</div>
              </div>
            </div>

            {/* Feature dots */}
            {features.map((feature) => {
              const x = ((10 - feature.effort) / 10) * 100;
              const y = (feature.impact / 10) * 100;
              
              return (
                <div
                  key={feature.id}
                  className="absolute w-3 h-3 bg-purple-600 rounded-full cursor-pointer hover:bg-purple-700 transition-colors"
                  style={{
                    left: `${x}%`,
                    bottom: `${y}%`,
                    transform: 'translate(-50%, 50%)'
                  }}
                  title={`${feature.name} - Impact: ${feature.impact}, Effort: ${feature.effort}`}
                />
              );
            })}
          </div>
          
          {/* Axis labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>High Effort</span>
            <span>Low Effort</span>
          </div>
          <div className="flex justify-center mt-2">
            <span className="text-xs text-gray-500 transform -rotate-90 origin-center">Impact</span>
          </div>
        </div>
        ) : (
        <div className="card card-section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">RICE Scoring</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="p-2">Feature</th>
                  <th className="p-2">Reach</th>
                  <th className="p-2">Impact</th>
                  <th className="p-2">Confidence</th>
                  <th className="p-2">Effort</th>
                  <th className="p-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, idx) => (
                  <tr key={f.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2">
                      <div>
                        <div className="font-medium text-gray-900">{f.name}</div>
                        <div className="text-xs text-gray-500">{f.category}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <input type="number" className="input py-1" value={f.riceReach} onChange={(e) => {
                        const v = Number(e.target.value);
                        setFeatures(prev => prev.map(x => x.id === f.id ? { ...x, riceReach: v } : x));
                      }} />
                    </td>
                    <td className="p-2">
                      <select className="input py-1" value={f.riceImpact} onChange={(e) => {
                        const v = Number(e.target.value);
                        setFeatures(prev => prev.map(x => x.id === f.id ? { ...x, riceImpact: v } : x));
                      }}>
                        {[0.25, 0.5, 1, 2, 3].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input type="number" step="0.05" min="0" max="1" className="input py-1" value={f.riceConfidence} onChange={(e) => {
                        const v = Number(e.target.value);
                        setFeatures(prev => prev.map(x => x.id === f.id ? { ...x, riceConfidence: v } : x));
                      }} />
                    </td>
                    <td className="p-2">
                      <input type="number" step="0.1" min="0.1" className="input py-1" value={f.riceEffort} onChange={(e) => {
                        const v = Number(e.target.value);
                        setFeatures(prev => prev.map(x => x.id === f.id ? { ...x, riceEffort: v } : x));
                      }} />
                    </td>
                    <td className="p-2 font-semibold text-blue-700">{calculateRiceScore(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* AI Recommendations */}
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900">AI Recommendations</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-white/60 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                {mode === 'matrix' ? 'Top Priority (Quick Wins)' : 'Top Priority (RICE)'}
              </h4>
              {(mode === 'matrix' ? getSortedFeatures() : getRiceSortedFeatures()).slice(0, 3).map(feature => (
                <div key={feature.id} className="text-sm text-green-700 mb-1">
                  • {feature.name} (Score: {mode === 'matrix' ? calculatePriorityScore(feature) : calculateRiceScore(feature)})
                </div>
              ))}
            </div>

            <div className="bg-white/60 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                {mode === 'matrix' ? 'Strategic Insights' : 'RICE Insights'}
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {mode === 'matrix' ? (
                  <>
                    <li>• {features.filter(f => getQuadrant(f) === 'quick-wins').length} quick wins identified</li>
                    <li>• Focus on high-confidence features first</li>
                    <li>• Consider user engagement impact</li>
                  </>
                ) : (
                  <>
                    <li>• RICE ranks by (Reach×Impact×Confidence)/Effort</li>
                    <li>• Validate Reach estimates with data</li>
                    <li>• Keep Impact scale consistent across features</li>
                  </>
                )}
              </ul>
            </div>

            <div className="bg-white/60 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Resource Allocation
              </h4>
              <p className="text-sm text-amber-700">
                Based on your team's capacity, prioritize the top 3 features for this quarter.
              </p>
            </div>

            <div className="bg-white/60 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-2">Blockers by Unlock Value</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                {(() => {
                  const map: Record<string, number> = {};
                  const score = (f: any) => mode === 'matrix' ? calculatePriorityScore(f) : calculateRiceScore(f);
                  for (const f of features) {
                    if (f.blockedBy && f.blockedBy.length) {
                      const per = score(f) / f.blockedBy.length;
                      for (const b of f.blockedBy) map[b] = (map[b] || 0) + per;
                    }
                  }
                  const items = Object.entries(map).map(([id, val]) => ({ id, val, name: features.find(x => x.id === id)?.name || 'Unknown' }))
                    .sort((a, b) => b.val - a.val)
                    .slice(0, 5);
                  if (items.length === 0) return <li>No blockers configured.</li>;
                  return items.map(it => (
                    <li key={it.id}>• {it.name} — unlock value: {Math.round(it.val * 100) / 100}</li>
                  ));
                })()}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Feature List */}
  <div className="card">
    <div className="card-section border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{mode === 'matrix' ? 'Feature Ranking' : 'RICE Ranking'}</h3>
          <p className="text-sm text-gray-500">Sorted by {mode === 'matrix' ? 'matrix score' : 'RICE score'}</p>
        </div>
        <div className="divide-y divide-gray-200">
          {(() => {
            const items = mode === 'matrix' ? getSortedFeatures() : getRiceSortedFeatures();
            const Row = ({ index, style }: ListChildComponentProps) => {
              const feature = items[index];
              return (
                <div style={style} className={`p-4 ${getQuadrantColor(getQuadrant(feature))}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-700">#{index + 1}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{feature.name}</h4>
                          <p className="text-sm text-gray-500">{feature.category}</p>
                          {feature.blockedBy && feature.blockedBy.length > 0 && (
                            <p className="text-xs text-red-700">Blocked by: {feature.blockedBy.map(id => features.find(f => f.id === id)?.name || 'Unknown').join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      {mode === 'matrix' ? (
                        <>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">Impact</div>
                            <div className="text-gray-600">{feature.impact}/10</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">Effort</div>
                            <div className="text-gray-600">{feature.effort}/10</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">Confidence</div>
                            <div className="text-gray-600">{feature.confidence}/10</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-blue-600">Score</div>
                            <div className="text-blue-800 font-bold">{calculatePriorityScore(feature)}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">Reach</div>
                            <div className="text-gray-600">{feature.riceReach}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">Impact</div>
                            <div className="text-gray-600">{feature.riceImpact}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">Confidence</div>
                            <div className="text-gray-600">{feature.riceConfidence}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">Effort</div>
                            <div className="text-gray-600">{feature.riceEffort}</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-blue-600">RICE</div>
                            <div className="text-blue-800 font-bold">{calculateRiceScore(feature)}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            };
            return (
              <List
                height={Math.min(640, Math.max(240, items.length * 88))}
                width={'100%'}
                itemCount={items.length}
                itemSize={96}
              >
                {Row}
              </List>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default PrioritizationMatrix;