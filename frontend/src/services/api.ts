// MINDBRIDGE - Frontend API Client
const API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  code: string;
  details?: any;
  constructor(message: string, code: string = 'ERROR', details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('mindbridge_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.error?.message || 'An unexpected error occurred.',
      json.error?.code || 'SERVER_ERROR',
      json.error?.details
    );
  }

  return json.data;
}

export const api = {
  // Auth & Profile
  login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),
  updateProfile: (data: any) => request<any>('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  regenerateAlias: () => request<any>('/auth/profile/regenerate-alias', { method: 'POST' }),
  updateConsent: (data: { type: string; status: string }) => request<any>('/auth/consents', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/notifications/read-all', { method: 'PATCH' }),

  // Checkins & Timeline
  getTodayCheckin: () => request<any>('/checkins/today'),
  submitCheckin: (data: any) => request<any>('/checkins', { method: 'POST', body: JSON.stringify(data) }),
  getTimeline: (days: number = 14) => request<any>(`/checkins/timeline?days=${days}`),

  // Assessments
  getAssessments: () => request<any[]>('/assessments'),
  getAssessmentDetails: (code: string) => request<any>(`/assessments/${code}`),
  submitAssessment: (code: string, answers: Record<string, number>) =>
    request<any>(`/assessments/${code}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  getAssessmentHistory: () => request<any[]>('/assessments/history/student'),

  // AI Chat & Crisis
  getOrCreateChatSession: () => request<any>('/ai-chat/sessions', { method: 'POST' }),
  sendMessage: (sessionId: string, content: string) =>
    request<any>(`/ai-chat/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  triggerEmergencySos: () => request<any>('/ai-chat/crisis/sos', { method: 'POST' }),

  // Counsellor & Appointments
  getCounsellors: (params?: { specialization?: string; language?: string; dayOfWeek?: number | string; search?: string }) => {
    const qp = new URLSearchParams();
    if (params?.specialization && params.specialization !== 'ALL') qp.append('specialization', params.specialization);
    if (params?.language && params.language !== 'ALL') qp.append('language', params.language);
    if (params?.dayOfWeek !== undefined && params.dayOfWeek !== '') qp.append('dayOfWeek', String(params.dayOfWeek));
    if (params?.search) qp.append('search', params.search);
    const qs = qp.toString();
    return request<any[]>(`/counsellors${qs ? `?${qs}` : ''}`);
  },
  getCounsellorSlots: (id: string, date: string, timezone: string = 'Asia/Kolkata') =>
    request<any>(`/counsellors/${id}/available-slots?date=${date}&timezone=${encodeURIComponent(timezone)}`),
  getMyCounsellorProfile: () => request<any>('/counsellors/profile/me'),
  updateMyCounsellorProfile: (data: any) =>
    request<any>('/counsellors/profile/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getCounsellorAvailabilities: () => request<any[]>('/counsellors/availability/slots'),
  createAvailabilitySlot: (data: any) =>
    request<any>('/counsellors/availability/slots', { method: 'POST', body: JSON.stringify(data) }),
  deleteAvailabilitySlot: (id: string) =>
    request<any>(`/counsellors/availability/slots/${id}`, { method: 'DELETE' }),
  getCounsellorTasks: (status?: string) =>
    request<any[]>(`/counsellors/tasks${status ? `?status=${status}` : ''}`),
  createCounsellorTask: (data: any) =>
    request<any>('/counsellors/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateCounsellorTask: (id: string, data: any) =>
    request<any>(`/counsellors/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCounsellorTask: (id: string) =>
    request<any>(`/counsellors/tasks/${id}`, { method: 'DELETE' }),

  getMyAppointments: (status?: string) =>
    request<any[]>(`/appointments/my${status ? `?status=${status}` : ''}`),
  bookAppointment: (data: any) => request<any>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  rescheduleAppointment: (id: string, newScheduledAt: string, reason?: string) =>
    request<any>(`/appointments/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ newScheduledAt, reason }),
    }),
  cancelAppointment: (id: string, cancellationReason: string) =>
    request<any>(`/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancellationReason }),
    }),
  updateAppointmentStatus: (id: string, status: string, cancellationReason?: string, followUpNotes?: string) =>
    request<any>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, cancellationReason, followUpNotes }),
    }),
  saveClinicalNotes: (id: string, notes: string, followUpNotes?: string) =>
    request<any>(`/appointments/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes, followUpNotes }),
    }),
  triggerAppointmentReminders: () =>
    request<any>('/appointments/reminders/check-and-send', { method: 'POST' }),

  // Peer Community & Moderation
  getPeerPosts: (params?: { category?: string; cursor?: string; take?: number }) => {
    const p = new URLSearchParams();
    if (params?.category) p.append('category', params.category);
    if (params?.cursor)   p.append('cursor',   params.cursor);
    if (params?.take)     p.append('take',      String(params.take));
    const qs = p.toString();
    return request<any>(`/peer-support/posts${qs ? `?${qs}` : ''}`);
  },
  getPeerPost: (postId: string) => request<any>(`/peer-support/posts/${postId}`),
  createPeerPost: (data: { title: string; content: string; category: string; isAnonymous: boolean }) =>
    request<any>('/peer-support/posts', { method: 'POST', body: JSON.stringify(data) }),
  addPeerComment: (postId: string, data: { content: string; isAnonymous: boolean }) =>
    request<any>(`/peer-support/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  reactToPost: (postId: string, reactionType: string) =>
    request<any>(`/peer-support/posts/${postId}/react`, { method: 'POST', body: JSON.stringify({ reactionType }) }),
  reactToComment: (commentId: string, reactionType: string) =>
    request<any>(`/peer-support/comments/${commentId}/react`, { method: 'POST', body: JSON.stringify({ reactionType }) }),
  reportPost: (postId: string, data: { reason: string; details?: string }) =>
    request<any>(`/peer-support/posts/${postId}/report`, { method: 'POST', body: JSON.stringify(data) }),
  reportComment: (commentId: string, data: { reason: string; details?: string }) =>
    request<any>(`/peer-support/comments/${commentId}/report`, { method: 'POST', body: JSON.stringify(data) }),
  getModerationQueue: (params?: { status?: string; type?: string }) => {
    const p = new URLSearchParams();
    if (params?.status) p.append('status', params.status);
    if (params?.type)   p.append('type',   params.type);
    const qs = p.toString();
    return request<any>(`/moderation/queue${qs ? `?${qs}` : ''}`);
  },
  takeModerationAction: (data: { entityType: string; entityId: string; action: string; reason: string }) =>
    request<any>('/moderation/action', { method: 'POST', body: JSON.stringify(data) }),
  getModerationEvents: (entityType: string, entityId: string) =>
    request<any>(`/moderation/events/${entityType}/${entityId}`),
  getEntityReports: (entityType: string, entityId: string) =>
    request<any>(`/moderation/reports/${entityType}/${entityId}`),


  // Resources & Recommendations
  getResources: (category?: string, q?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (q) params.append('q', q);
    const queryString = params.toString();
    return request<any[]>(`/resources${queryString ? `?${queryString}` : ''}`);
  },
  getResourceBySlug: (slug: string) => request<any>(`/resources/${slug}`),
  updateResourceProgress: (id: string, data: any) =>
    request<any>(`/resources/${id}/progress`, { method: 'POST', body: JSON.stringify(data) }),
  getRecommendations: () => request<any[]>('/resources/user/recommendations'),

  // Institutional Analytics & Privacy
  getAnalyticsOverview: (params?: { range?: string; department?: string; yearOfStudy?: number }) => {
    const p = new URLSearchParams();
    if (params?.range) p.append('range', params.range);
    if (params?.department) p.append('department', params.department);
    if (params?.yearOfStudy) p.append('yearOfStudy', String(params.yearOfStudy));
    const qs = p.toString();
    return request<any>(`/analytics/overview${qs ? `?${qs}` : ''}`);
  },
  getAnalyticsTrends: (range?: string) =>
    request<any>(`/analytics/trends${range ? `?range=${range}` : ''}`),
  getAssessmentAnalytics: () => request<any>('/analytics/assessments'),
  getDemographicBreakdowns: () => request<any>('/analytics/breakdowns'),
  exportAnalyticsReport: async (format: 'csv' | 'json' = 'json') => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/v1/analytics/export?format=${format}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (format === 'csv') {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindbridge_analytics_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      return { success: true };
    }
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindbridge_analytics_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },
  getInstitutionalAuditLogs: (params?: { limit?: number; skip?: number }) => {
    const p = new URLSearchParams();
    if (params?.limit) p.append('limit', String(params.limit));
    if (params?.skip) p.append('skip', String(params.skip));
    const qs = p.toString();
    return request<any>(`/analytics/audit${qs ? `?${qs}` : ''}`);
  },
  exportPersonalData: () => request<any>('/privacy/export'),
  requestAccountDeletion: () => request<any>('/privacy/delete-request', { method: 'POST' }),
  getAuditLogs: () => request<any[]>('/privacy/audit-logs'),
};
