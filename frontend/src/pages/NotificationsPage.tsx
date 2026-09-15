import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Calendar, Clock, AlertTriangle, MessageSquare, Info, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { TabGroup } from '../components/common/TabGroup';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner, SuccessBanner } from '../components/common/ErrorBanner';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'APPOINTMENT':
      return <Calendar className="w-5 h-5 text-brand-600" />;
    case 'CHECKIN_REMINDER':
      return <Clock className="w-5 h-5 text-amberwarm-600" />;
    case 'RISK_ALERT':
      return <AlertTriangle className="w-5 h-5 text-crisis-600" />;
    case 'PEER_REPLY':
      return <MessageSquare className="w-5 h-5 text-purple-600" />;
    default:
      return <Info className="w-5 h-5 text-blue-600" />;
  }
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getNotifications();
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        navigate(link);
      }
    } catch {
      // Still navigate if link exists
      if (link) navigate(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(err?.message || 'Failed to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const TABS = [
    { id: 'all', label: 'All Notifications', badge: notifications.length },
    { id: 'unread', label: 'Unread Only', badge: unreadCount },
  ];

  if (isLoading) return <PageLoading label="Loading notifications..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-calm-900">Notifications & Alerts</h1>
            <p className="text-xs text-calm-500">
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'You are all caught up!'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            isLoading={markingAll}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={loadNotifications} />}

      {/* Tabs */}
      <TabGroup
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description={
            activeTab === 'unread'
              ? 'Great job keeping up with your updates!'
              : 'You will receive check-in reminders, appointment alerts, and community notifications here.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            return (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n.id, n.link)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  !n.isRead
                    ? 'bg-white border-brand-300 shadow-soft ring-1 ring-brand-100'
                    : 'bg-white/60 border-calm-200 hover:bg-white'
                }`}
              >
                <div className="p-2 rounded-xl bg-calm-50 flex-shrink-0 mt-0.5">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm ${!n.isRead ? 'font-bold text-calm-900' : 'font-semibold text-calm-700'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-calm-400 whitespace-nowrap">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-calm-500 leading-relaxed">
                    {n.message}
                  </p>

                  {n.link && (
                    <div className="flex items-center gap-1 text-[11px] text-brand-600 font-semibold pt-1">
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {!n.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600 flex-shrink-0 mt-2" aria-label="Unread" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
