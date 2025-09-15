// React default import not required with automatic JSX runtime
import { FileText, Brain, Users, TrendingUp, Clock, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { useI18n } from '../i18n';

type Props = { user?: { name?: string; email?: string } };

const Dashboard = ({ user }: Props) => {
  const { t } = useI18n();

  const recentProjects = [
    { name: 'Mobile App Redesign PRD', status: 'In Progress', progress: 75, lastUpdated: '2 hours ago' },
    { name: 'API Prioritization Framework', status: 'Complete', progress: 100, lastUpdated: '1 day ago' },
    { name: 'Q2 Roadmap Planning', status: 'Draft', progress: 30, lastUpdated: '3 days ago' }
  ];

  const aiInsights = [
    {
      type: 'suggestion',
      title: 'Missing User Research',
      description: 'Your current PRD could benefit from user interview insights. Consider adding a user research section.',
      priority: 'medium'
    },
    {
      type: 'optimization',
      title: 'Prioritization Opportunity',
      description: 'Based on your feature list, you have 3 features with similar impact scores that could be re-evaluated.',
      priority: 'low'
    },
    {
      type: 'alert',
      title: 'Stakeholder Alignment',
      description: 'Engineering team feedback is pending on the Mobile App Redesign PRD for 48+ hours.',
      priority: 'high'
    }
  ];

  const stats = [
    { label: t('dashboard.stats.prds'), value: '12', change: '+3 this week', icon: FileText },
    { label: t('dashboard.stats.features'), value: '47', change: '+8 this week', icon: Brain },
    { label: t('dashboard.stats.reviews'), value: '23', change: '5 pending', icon: Users },
    { label: t('dashboard.stats.decisionTime'), value: '2.3d', change: '-0.7d improved', icon: TrendingUp }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">{t('dashboard.welcome', { name: user?.name?.split(' ')[0] || t('auth.welcomeBack') })}</h2>
        <p className="text-blue-100 mb-4">{t('dashboard.intro')}</p>
        <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2 w-fit">
          <Lightbulb className="h-4 w-4" />
          <span className="text-sm">{t('dashboard.recs', { count: 3 })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="card-section">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.label}</h3>
              <p className="text-xs text-green-600">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="card">
          <div className="card-section border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentProjects')}</h3>
            <p className="text-sm text-gray-500">{t('dashboard.recentProjects.sub')}</p>
          </div>
          <div className="card-section space-y-4">
            {recentProjects.map((project, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === 'Complete' ? 'bg-green-100 text-green-800' :
                        project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {project.status}
                    </span>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {project.lastUpdated}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="card">
          <div className="card-section border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.aiInsights')}</h3>
            <p className="text-sm text-gray-500">{t('dashboard.aiInsights.sub')}</p>
          </div>
          <div className="card-section space-y-4">
            {aiInsights.map((insight, index) => (
              <div key={index} className="flex space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className={`flex-shrink-0 ${insight.priority === 'high' ? 'text-red-500' :
                    insight.priority === 'medium' ? 'text-amber-500' :
                      'text-blue-500'
                  }`}>
                  {insight.priority === 'high' ? <AlertTriangle className="h-5 w-5" /> :
                    insight.type === 'suggestion' ? <Lightbulb className="h-5 w-5" /> :
                      <CheckCircle2 className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  <button className="text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium">{t('dashboard.takeAction')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;