import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CrisisSupportPage } from './pages/CrisisSupportPage';

// Student Core Screens
import { DashboardPage } from './pages/DashboardPage';
import { DailyCheckinPage } from './pages/DailyCheckinPage';
import { TimelinePage } from './pages/TimelinePage';
import { AssessmentsPage } from './pages/AssessmentsPage';
import { AiSupportPage } from './pages/AiSupportPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ResourceDetailPage } from './pages/ResourceDetailPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { CounsellorDirectoryPage } from './pages/CounsellorDirectoryPage';
import { BookAppointmentPage } from './pages/BookAppointmentPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { PeerCommunityPage } from './pages/PeerCommunityPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ConsentPage } from './pages/ConsentPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PrivacySettingsPage } from './pages/PrivacySettingsPage';

// Other Role Portals
import { CounsellorPortalPage } from './pages/CounsellorPortalPage';
import { AdminAnalyticsPage } from './pages/AdminAnalyticsPage';
import { ModerationPage } from './pages/ModerationPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-calm-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-calm-600">Loading MINDBRIDGE...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const RoleAwareHome: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  if (user?.role === 'COUNSELLOR') return <CounsellorPortalPage />;
  if (user?.role === 'INSTITUTION_ADMIN' || user?.role === 'SUPER_ADMIN') return <AdminAnalyticsPage />;
  return <DashboardPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-calm-50 text-calm-900 font-sans">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <Routes>
              {/* 1. Public & Onboarding Entry Points */}
              <Route path="/welcome" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/crisis" element={<CrisisSupportPage />} />

              {/* Home Router based on Role */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RoleAwareHome />
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />

              {/* 2. Onboarding & Consent Flows */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consent"
                element={
                  <ProtectedRoute>
                    <ConsentPage />
                  </ProtectedRoute>
                }
              />

              {/* 3. Daily Wellbeing & Timeline */}
              <Route
                path="/checkin"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <DailyCheckinPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timeline"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <TimelinePage />
                  </ProtectedRoute>
                }
              />

              {/* 4. Psychometric Screenings */}
              <Route
                path="/assessments"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <AssessmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assessments/:code/result"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <AssessmentsPage />
                  </ProtectedRoute>
                }
              />

              {/* 5. AI First-Aid Chat */}
              <Route
                path="/ai-support"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <AiSupportPage />
                  </ProtectedRoute>
                }
              />

              {/* 6. Psychoeducational Resources & Recommendations */}
              <Route
                path="/resources"
                element={
                  <ProtectedRoute>
                    <ResourcesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resources/:slug"
                element={
                  <ProtectedRoute>
                    <ResourceDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recommendations"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <RecommendationsPage />
                  </ProtectedRoute>
                }
              />

              {/* 7. Counsellor Directory & Appointment Booking */}
              <Route
                path="/counsellors"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <CounsellorDirectoryPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/counselling" element={<Navigate to="/counsellors" replace />} />
              <Route
                path="/counselling/book/:counsellorId"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <BookAppointmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointments"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'PEER_VOLUNTEER']}>
                    <MyAppointmentsPage />
                  </ProtectedRoute>
                }
              />

              {/* 8. Peer Community Hub */}
              <Route
                path="/peer-community"
                element={
                  <ProtectedRoute>
                    <PeerCommunityPage />
                  </ProtectedRoute>
                }
              />

              {/* 9. Notifications Inbox */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* 10. Student Profile & Identity */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* 11. DPDP Act Privacy Controls */}
              <Route
                path="/privacy"
                element={
                  <ProtectedRoute>
                    <PrivacySettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* 12. Non-Student Role Portals */}
              <Route
                path="/counsellor-portal"
                element={
                  <ProtectedRoute allowedRoles={['COUNSELLOR']}>
                    <CounsellorPortalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-analytics"
                element={
                  <ProtectedRoute allowedRoles={['INSTITUTION_ADMIN', 'SUPER_ADMIN']}>
                    <AdminAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/moderation"
                element={
                  <ProtectedRoute allowedRoles={['PEER_VOLUNTEER', 'COUNSELLOR', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']}>
                    <ModerationPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Calming, Accessible Footer */}
          <footer className="border-t border-calm-200 bg-white/60 py-6 px-4 sm:px-6 lg:px-8 text-xs text-calm-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>
                © 2025 MINDBRIDGE. Strictly non-diagnostic psychoeducational support platform.
              </p>
              <div className="flex items-center space-x-4">
                <Link to="/crisis" className="text-crisis-600 font-semibold hover:underline">
                  24/7 Crisis Helplines
                </Link>
                <Link to="/privacy" className="hover:underline">
                  Privacy & DPDP Act
                </Link>
                <Link to="/consent" className="hover:underline">
                  Consent Management
                </Link>
                <Link to="/resources" className="hover:underline">
                  Resources
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
