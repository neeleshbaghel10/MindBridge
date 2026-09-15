import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HeartHandshake,
  MessageSquare,
  Filter
} from 'lucide-react';
import { api } from '../services/api';

export const ModerationPage: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      const data = await api.getModerationQueue();
      setQueue(data || []);
    } catch (err) {
      console.error('Failed to load moderation queue:', err);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = async (postId: string, action: string, reason: string) => {
    setIsProcessing(true);
    try {
      await api.takeModerationAction({ entityType: 'PEER_POST', entityId: postId, action, reason });
      setFeedback(`Action '${action}' applied to post.`);
      setTimeout(() => setFeedback(null), 3000);
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Moderation action failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-6 bg-white border border-calm-200 rounded-2xl shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-calm-900 flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-amberwarm-600" />
            <span>Peer Volunteer Moderation Triage</span>
          </h1>
          <p className="text-xs text-calm-500 mt-1">
            Review flagged peer submissions, maintain community emotional safety, and escalate acute distress.
          </p>
        </div>
        <span className="text-xs font-bold text-amberwarm-800 bg-amberwarm-100 border border-amberwarm-200 px-3 py-1.5 rounded-xl">
          {queue.length} items awaiting review
        </span>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Triage Queue */}
      <div className="space-y-4">
        {queue.length > 0 ? (
          queue.map(post => (
            <div
              key={post.id}
              className="p-6 bg-white border border-calm-200 rounded-2xl shadow-soft space-y-4"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-calm-900">@{post.anonymousAuthorName}</span>
                  <span className="text-calm-400">•</span>
                  <span className="text-[10px] font-semibold bg-calm-100 text-calm-600 px-2 py-0.5 rounded-md">
                    {post.category}
                  </span>
                  <span className="text-[10px] font-bold text-crisis-700 bg-crisis-50 px-2 py-0.5 rounded-md">
                    Flag count: {post.flagCount}
                  </span>
                </div>
                <span className="text-calm-400 text-[11px]">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-calm-900">{post.title}</h3>
                <p className="text-xs text-calm-700 mt-1 leading-relaxed bg-calm-50 p-3 rounded-xl border border-calm-100">
                  {post.content}
                </p>
              </div>

              {/* Triage Decision Buttons */}
              <div className="pt-2 border-t border-calm-100 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => handleAction(post.id, 'APPROVE', 'Content deemed safe and supportive.')}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve Post</span>
                </button>

                <button
                  onClick={() => handleAction(post.id, 'REJECT', 'Content violates community support guidelines.')}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 bg-crisis-50 hover:bg-crisis-100 text-crisis-800 border border-crisis-300 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Remove Post</span>
                </button>

                <button
                  onClick={() => handleAction(post.id, 'ESCALATE_RISK', 'Signs of acute distress escalated to campus crisis triage.')}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Escalate to Counsellor</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 bg-white border border-calm-200 rounded-2xl text-center text-xs text-calm-500">
            ✅ All community peer posts are reviewed. Moderation queue is clear.
          </div>
        )}
      </div>
    </div>
  );
};
