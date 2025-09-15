import { useEffect, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Users, MessageCircle, ThumbsUp, ThumbsDown, Clock, Send, Sparkles, TrendingUp, Bell, CheckCircle, XCircle } from 'lucide-react';

import { getFeedbackList, type FeedbackItem } from '../utils/feedback';

const StakeholderInput = () => {
  // Avatar fallback map when image fails to load
  const [avatarError, setAvatarError] = useState<Record<string, boolean>>({});

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    const raw = parts[0] || '';
    const letters = raw.replace(/[^a-zA-Z]/g, '');
    return (letters.slice(0, 2) || raw.slice(0, 2)).toUpperCase();
  };

  // Deterministic color based on name hash for variety
  const getAvatarClasses = (name: string) => {
    const palettes = [
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-amber-100 text-amber-800',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return palettes[hash % palettes.length];
  };
  const [feedback, setFeedback] = useState<FeedbackItem[]>(() => getFeedbackList());

  useEffect(() => {
    const handler = () => setFeedback(getFeedbackList());
    window.addEventListener('pmcopilot_feedback_updated', handler);
    return () => window.removeEventListener('pmcopilot_feedback_updated', handler);
  }, []);

  const [newRequest, setNewRequest] = useState({
    feature: '',
    stakeholders: '',
    message: ''
  });
  const [reviewDue, setReviewDue] = useState<string>('');

  type ReviewStatus = 'pending' | 'approved' | 'changes';
  type ReviewRequest = {
    id: string;
    feature: string;
    stakeholders: string;
    message: string;
    due: string; // YYYY-MM-DD
    status: ReviewStatus;
    remindersSent: number;
    createdAt: number;
  };
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>(() => {
    try {
      const raw = localStorage.getItem('pmcopilot_review_requests');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persistReviews = (next: ReviewRequest[]) => {
    setReviewRequests(next);
    try { localStorage.setItem('pmcopilot_review_requests', JSON.stringify(next)); } catch {}
    // notify app header
    try { window.dispatchEvent(new Event('pmcopilot_reviews_updated')); } catch {}
  };

  // persist draft request
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pmcopilot_feedback_request');
      if (saved) setNewRequest(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('pmcopilot_feedback_request', JSON.stringify(newRequest)); } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [newRequest]);

  const daysUntil = (yyyyMmDd: string) => {
    if (!yyyyMmDd) return null;
    const due = new Date(yyyyMmDd + 'T23:59:59');
    const now = new Date();
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const requestReview = () => {
    if (!newRequest.feature || !reviewDue) {
      alert('Please provide a feature and due date.');
      return;
    }
    const req: ReviewRequest = {
      id: String(Date.now()),
      feature: newRequest.feature.trim(),
      stakeholders: newRequest.stakeholders.trim(),
      message: newRequest.message.trim(),
      due: reviewDue,
      status: 'pending',
      remindersSent: 0,
      createdAt: Date.now(),
    };
    persistReviews([req, ...reviewRequests].slice(0, 50));
    setNewRequest({ feature: '', stakeholders: '', message: '' });
    setReviewDue('');
  };

  const markApproved = (id: string) => {
    const next = reviewRequests.map(r => r.id === id ? { ...r, status: 'approved' as ReviewStatus } : r);
    persistReviews(next);
  };
  const markChanges = (id: string) => {
    const next = reviewRequests.map(r => r.id === id ? { ...r, status: 'changes' as ReviewStatus } : r);
    persistReviews(next);
  };
  const sendReminder = (id: string) => {
    const next = reviewRequests.map(r => r.id === id ? { ...r, remindersSent: (r.remindersSent || 0) + 1 } : r);
    persistReviews(next);
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default: return <MessageCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const sendFeedbackRequest = () => {
    // Simulate sending feedback request
    setNewRequest({ feature: '', stakeholders: '', message: '' });
    alert('Feedback request sent to stakeholders!');
  };

  const getAISummary = () => {
    const totalFeedback = feedback.length;
    const positiveCount = feedback.filter(f => f.sentiment === 'positive').length;
    const highPriorityCount = feedback.filter(f => f.priority === 'high').length;
    
    return {
      totalFeedback,
      positiveRate: Math.round((positiveCount / totalFeedback) * 100),
      highPriorityFeatures: highPriorityCount,
      topConcerns: ['Data privacy compliance', 'Implementation complexity', 'Resource allocation']
    };
  };

  const aiSummary = getAISummary();

  const exportSummaryMarkdown = () => {
    const md = `# Stakeholder Feedback Summary\n\n- Total Feedback: ${aiSummary.totalFeedback}\n- Positive Rate: ${aiSummary.positiveRate}%\n- High Priority Items: ${aiSummary.highPriorityFeatures}\n\n## Top Concerns\n${aiSummary.topConcerns.map((c) => `- ${c}`).join('\n')}\n\n---\n*Generated by PM Copilot*`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stakeholder-feedback-summary.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFeedbackCSV = () => {
  const header = ['Stakeholder','Role','Feature','Sentiment','Priority','Comment','Timestamp','Tags'];
  const rows = feedback.map(f => [f.stakeholder, f.role, f.feature, f.sentiment, f.priority, JSON.stringify(f.comment), f.timestamp, (f.tags || []).join('|')]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stakeholder_feedback.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
  <div className="card card-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Stakeholder Feedback Hub</h2>
            <p className="text-gray-600 mt-1">Collect and analyze input from cross-functional teams</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={exportFeedbackCSV} className="btn btn-secondary btn-sm">Export CSV</button>
            <button onClick={exportSummaryMarkdown} className="btn btn-secondary btn-sm">Export Summary</button>
            <div className="hidden sm:flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{feedback.length} Active Discussions</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Feedback List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-section border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Feedback</h3>
              <p className="text-sm text-gray-500">Latest input from your team and stakeholders</p>
            </div>
            <div className="divide-y divide-gray-200">
              {feedback.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">No feedback yet.</div>
              ) : (
                (() => {
                  const Item = ({ index, style }: ListChildComponentProps) => {
                    const item = feedback[index];
                    return (
                      <div style={style} className="hover:bg-gray-50 transition-colors">
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {avatarError[item.id] ? (
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarClasses(item.stakeholder)}`} aria-label={item.stakeholder}>
                                    {getInitials(item.stakeholder)}
                                  </div>
                                ) : (
                                  <img
                                    src={`https://images.unsplash.com/photo-150756${item.id}?w=64&h=64&fit=crop&crop=faces&auto=format`}
                                    alt={item.stakeholder}
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={() => setAvatarError(prev => ({ ...prev, [item.id]: true }))}
                                  />
                                )}
                                <div>
                                  <h4 className="font-medium text-gray-900">{item.stakeholder}</h4>
                                  <p className="text-sm text-gray-500">{item.role}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 mb-3">
                                <span className="text-sm font-medium text-gray-700">Feature:</span>
                                <span className="text-sm text-blue-600">{item.feature}</span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                                  {item.priority}
                                </span>
                              </div>
                              <p className="text-gray-700 mb-3">{item.comment}</p>
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {item.tags.map((t, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{t}</span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-sm text-gray-500">
                                <div className="flex items-center space-x-2">
                                  {getSentimentIcon(item.sentiment)}
                                  <Clock className="h-3 w-3" />
                                  <span>{item.timestamp}</span>
                                </div>
                                <button className="btn btn-link font-medium">Reply</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };
                  return (
                    <List
                      height={Math.min(600, Math.max(240, feedback.length * 96))}
                      width={'100%'}
                      itemCount={feedback.length}
                      itemSize={112}
                    >
                      {Item}
                    </List>
                  );
                })()
              )}
            </div>
          </div>

          {/* Request Feedback */}
          <div className="card mt-6">
            <div className="card-section border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Request Feedback</h3>
              <p className="text-sm text-gray-500">Get input on specific features or decisions</p>
            </div>
            <div className="card-section space-y-4">
              <div>
                <label className="label">Feature/Topic</label>
                <input
                  type="text"
                  value={newRequest.feature}
                  onChange={(e) => setNewRequest({...newRequest, feature: e.target.value})}
                  placeholder="e.g., Mobile App Redesign, API Rate Limiting"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Stakeholders</label>
                <input
                  type="text"
                  value={newRequest.stakeholders}
                  onChange={(e) => setNewRequest({...newRequest, stakeholders: e.target.value})}
                  placeholder="Engineering, Design, Sales, Customer Success"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea
                  rows={3}
                  value={newRequest.message}
                  onChange={(e) => setNewRequest({...newRequest, message: e.target.value})}
                  placeholder="What specific feedback do you need? Include context and questions..."
                  className="input"
                />
              </div>
              <div>
                <label className="label">Review Due Date</label>
                <input
                  type="date"
                  value={reviewDue}
                  onChange={(e) => setReviewDue(e.target.value)}
                  className="input"
                />
              </div>
              <button
                onClick={sendFeedbackRequest}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Send Request</span>
              </button>
              <button
                onClick={requestReview}
                className="btn btn-secondary flex items-center space-x-2 w-full"
                disabled={!newRequest.feature || !reviewDue}
                title={!newRequest.feature || !reviewDue ? 'Add a feature and due date' : 'Create a review request'}
              >
                <Bell className="h-4 w-4" />
                <span>Request Review</span>
              </button>
            </div>
          </div>

          {/* Review Requests */}
          <div className="card mt-6">
            <div className="card-section border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Review Requests</h3>
                <p className="text-sm text-gray-500">Track approvals and nudge reviewers</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs">
                  {reviewRequests.filter(r => r.status === 'pending').length} pending
                </span>
                {reviewRequests.some(r => (daysUntil(r.due) ?? 99) < 0) && (
                  <span className="badge bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs">Overdue</span>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {reviewRequests.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">No review requests yet.</div>
              ) : (
                reviewRequests.map((r) => {
                  const d = daysUntil(r.due);
                  const dueBadge = d === null ? null : d < 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>
                  ) : d <= 2 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Due in {d}d</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Due in {d}d</span>
                  );
                  return (
                    <div key={r.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{r.feature}</span>
                          {dueBadge}
                          {r.remindersSent > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Reminder ×{r.remindersSent}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Due: {r.due} • Stakeholders: {r.stakeholders || '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.status === 'pending' ? (
                          <>
                            <button className="btn btn-success btn-sm flex items-center gap-1" onClick={() => markApproved(r.id)}>
                              <CheckCircle className="h-3.5 w-3.5" /> LGTM
                            </button>
                            <button className="btn btn-danger btn-sm flex items-center gap-1" onClick={() => markChanges(r.id)}>
                              <XCircle className="h-3.5 w-3.5" /> Changes
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={() => sendReminder(r.id)}>Remind</button>
                          </>
                        ) : r.status === 'approved' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Changes requested</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">AI Analysis</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-white/60 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-3">Feedback Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Total Feedback</span>
                    <span className="font-medium text-purple-900">{aiSummary.totalFeedback}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Positive Rate</span>
                    <span className="font-medium text-green-600">{aiSummary.positiveRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">High Priority</span>
                    <span className="font-medium text-red-600">{aiSummary.highPriorityFeatures}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Key Insights
                </h4>
                <ul className="text-sm text-purple-700 space-y-2">
                  <li>• Engineering team is aligned on technical feasibility</li>
                  <li>• Strong support for user engagement features</li>
                  <li>• Data privacy concerns need addressing</li>
                  <li>• Sales team emphasizes business impact</li>
                </ul>
              </div>

              <div className="bg-white/60 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-3">Top Concerns</h4>
                <div className="space-y-2">
                  {aiSummary.topConcerns.map((concern, index) => (
                    <div key={index} className="text-sm text-purple-700 flex items-center">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                      {concern}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Recommended Actions</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Schedule data privacy review meeting</li>
                  <li>• Prioritize high-consensus features</li>
                  <li>• Follow up on pending feedback</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakeholderInput;