import React, { useState } from 'react';
import { FileText, Brain, Users, Target, CheckCircle, ArrowRight, Lightbulb, Zap } from 'lucide-react';
import PRDBuilder from './components/PRDBuilder';
import PrioritizationMatrix from './components/PrioritizationMatrix';
import StakeholderInput from './components/StakeholderInput';
import Dashboard from './components/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prd' | 'prioritization' | 'stakeholders'>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'prd', label: 'PRD Builder', icon: FileText },
    { id: 'prioritization', label: 'Prioritization', icon: Brain },
    { id: 'stakeholders', label: 'Stakeholder Input', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                <p className="text-sm text-gray-500">AI-Powered Product Management Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-blue-50 px-3 py-2 rounded-lg border">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">AI Assistant Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? 'text-blue-600 border-blue-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'prd' && <PRDBuilder />}
        {activeTab === 'prioritization' && <PrioritizationMatrix />}
        {activeTab === 'stakeholders' && <StakeholderInput />}
      </main>
    </div>
  );
}

export default App;