export type Sentiment = 'positive' | 'negative' | 'neutral';
export type Priority = 'high' | 'medium' | 'low';

export type FeedbackItem = {
  id: string;
  stakeholder: string;
  role: string;
  feature: string;
  sentiment: Sentiment;
  priority: Priority;
  comment: string;
  timestamp: string; // human readable
  tags?: string[];
};

const KEY = 'pmcopilot_feedback';

export function getFeedbackList(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setFeedbackList(items: FeedbackItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  try { window.dispatchEvent(new Event('pmcopilot_feedback_updated')); } catch {}
}

export function addFeedback(item: FeedbackItem) {
  const list = getFeedbackList();
  list.unshift(item);
  // cap to reasonable length
  setFeedbackList(list.slice(0, 200));
}
