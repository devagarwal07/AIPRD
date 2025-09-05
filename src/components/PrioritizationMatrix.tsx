import { useEffect, useState } from 'react';
import { Plus, TrendingUp, DollarSign, Zap, BarChart3, Download, SlidersHorizontal } from 'lucide-react';

interface Feature {
  id: string;
  name: string;
  impact: number;
  effort: number;
  confidence: number;
  category: string;
}

const PrioritizationMatrix = () => {
  const [features, setFeatures] = useState<Feature[]>([
    { id: '1', name: 'Push Notifications', impact: 8, effort: 3, confidence: 9, category: 'User Engagement' },
    { id: '2', name: 'Dark Mode', impact: 4, effort: 5, confidence: 8, category: 'User Experience' },
    { id: '3', name: 'Advanced Analytics', impact: 9, effort: 8, confidence: 6, category: 'Business Intelligence' },
    { id: '4', name: 'Social Login', impact: 6, effort: 4, confidence: 9, category: 'Authentication' },
    { id: '5', name: 'Offline Mode', impact: 7, effort: 9, confidence: 5, category: 'Performance' },
    { id: '6', name: 'In-App Messaging', impact: 8, effort: 6, confidence: 7, category: 'User Engagement' },
  ]);

  const [newFeature, setNewFeature] = useState({
    name: '',
    impact: 5,
    effort: 5,
    confidence: 5,
    category: 'User Experience'
  });

  const [showForm, setShowForm] = useState(false);
  const [weights, setWeights] = useState({ impact: 0.5, confidence: 0.3, effort: 0.2 });

  // persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pmcopilot_features');
      const savedWeights = localStorage.getItem('pmcopilot_feature_weights');
      if (saved) setFeatures(JSON.parse(saved));
      if (savedWeights) setWeights(JSON.parse(savedWeights));
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
    const header = ['Name','Category','Impact','Effort','Confidence','Score'];
    const rows = getSortedFeatures().map(f => [f.name, f.category, f.impact, f.effort, f.confidence, calculatePriorityScore(f)]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feature_priorities.csv';
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
        ...newFeature
      };
      setFeatures([...features, feature]);
      setNewFeature({
        name: '',
        impact: 5,
        effort: 5,
        confidence: 5,
        category: 'User Experience'
      });
      setShowForm(false);
    }
  };

  const categories = ['User Experience', 'User Engagement', 'Business Intelligence', 'Performance', 'Authentication'];

  return (
    <div className="space-y-8">
      {/* Header */}
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Feature Prioritization Matrix</h2>
            <p className="text-gray-600 mt-1">AI-powered prioritization using Impact vs. Effort analysis</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportCSV}
              className="flex items-center space-x-2 bg-white border px-3 py-2 rounded-lg hover:bg-gray-50"
              title="Export CSV"
            >
              <Download className="h-4 w-4 text-gray-700" />
              <span className="text-sm">Export</span>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Feature</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Feature Form */}
      {showForm && (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Feature</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Feature Name</label>
              <input
                type="text"
                value={newFeature.name}
                onChange={(e) => setNewFeature({...newFeature, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Real-time Chat"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={newFeature.category}
                onChange={(e) => setNewFeature({...newFeature, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Feature
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Priority Matrix */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                Top Priority (Quick Wins)
              </h4>
      {getSortedFeatures().slice(0, 3).map(feature => (
                <div key={feature.id} className="text-sm text-green-700 mb-1">
                  • {feature.name} (Score: {calculatePriorityScore(feature)})
                </div>
              ))}
            </div>

            <div className="bg-white/60 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Strategic Insights
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {features.filter(f => getQuadrant(f) === 'quick-wins').length} quick wins identified</li>
                <li>• Focus on high-confidence features first</li>
                <li>• Consider user engagement impact</li>
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
          </div>
        </div>
      </div>

      {/* Feature List */}
  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Feature Ranking</h3>
          <p className="text-sm text-gray-500">Sorted by AI-calculated priority score</p>
        </div>
        <div className="divide-y divide-gray-200">
          {getSortedFeatures().map((feature, index) => (
            <div key={feature.id} className={`p-4 ${getQuadrantColor(getQuadrant(feature))}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-gray-700">#{index + 1}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{feature.name}</h4>
                      <p className="text-sm text-gray-500">{feature.category}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrioritizationMatrix;