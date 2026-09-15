import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Heart,
  Brain,
  Calendar,
  Users,
  BookOpen,
  BarChart3,
  ShieldAlert,
  UserCheck,
  LogOut,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  ClipboardList,
  Bell,
  User,
  ShieldCheck,
  Compass,
  Phone
} from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { api } from '../../services/api';
import { EmergencySosModal } from '../common/EmergencySosModal';

export const Navbar: React.FC = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const location = useLocation();
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const role = user?.role || 'STUDENT';

  useEffect(() => {
    if (user) {
      api.getNotifications()
        .then((res: any) => setUnreadCount(res?.unreadCount || 0))
        .catch(() => {});
    }
  }, [user, location.pathname]);

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    STUDENT: { label: 'Student', color: 'bg-brand-100 text-brand-800' },
    COUNSELLOR: { label: 'Counsellor', color: 'bg-purple-100 text-purple-800' },
    PEER_VOLUNTEER: { label: 'Peer Volunteer', color: 'bg-amberwarm-100 text-amberwarm-800' },
    INSTITUTION_ADMIN: { label: 'Admin (Dean)', color: 'bg-blue-100 text-blue-800' },
    SUPER_ADMIN: { label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-calm-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-extrabold tracking-tight text-calm-900 flex items-center">
                    MINDBRIDGE
                  </span>
                  <span className="block text-[10px] font-semibold text-brand-600 tracking-wider uppercase -mt-1">
                    Student Wellbeing Ecosystem
                  </span>
                </div>
              </Link>

              {/* Navigation Links for Student */}
              {role === 'STUDENT' && (
                <nav className="hidden lg:flex items-center space-x-1 text-xs font-medium">
                  <Link
                    to="/"
                    className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                      isActive('/') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/ai-support"
                    className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                      isActive('/ai-support') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 text-brand-600" />
                    <span>AI First-Aid</span>
                  </Link>
                  <Link
                    to="/assessments"
                    className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                      isActive('/assessments') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-calm-500" />
                    <span>Screenings</span>
                  </Link>
                  <Link
                    to="/timeline"
                    className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                      isActive('/timeline') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-calm-500" />
                    <span>Timeline</span>
                  </Link>
                  <Link
                    to="/counsellors"
                    className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                      isActive('/counsellors') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-calm-500" />
                    <span>Counsellors</span>
                  </Link>
                  <Link
                    to="/appointments"
                    className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                      isActive('/appointments') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    <span>Appointments</span>
                  </Link>
                  <Link
                    to="/peer-community"
                    className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                      isActive('/peer-community') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-calm-500" />
                    <span>Peer Hub</span>
                  </Link>
                  <Link
                    to="/resources"
                    className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                      isActive('/resources') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-calm-500" />
                    <span>Resources</span>
                  </Link>
                </nav>
              )}

              {/* Navigation for Counsellor */}
              {role === 'COUNSELLOR' && (
                <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
                  <Link
                    to="/counsellor-portal"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive('/counsellor-portal') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    Caseload & Appointments
                  </Link>
                  <Link
                    to="/peer-community"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive('/peer-community') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    Peer Discussions
                  </Link>
                  <Link
                    to="/resources"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive('/resources') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    Resource Library
                  </Link>
                </nav>
              )}

              {/* Navigation for Peer Volunteer */}
              {role === 'PEER_VOLUNTEER' && (
                <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
                  <Link
                    to="/peer-community"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive('/peer-community') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    Peer Community
                  </Link>
                  <Link
                    to="/moderation"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive('/moderation') ? 'bg-amberwarm-100 text-amberwarm-900 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    Moderation Queue
                  </Link>
                  <Link
                    to="/"
                    className="px-3 py-1.5 rounded-lg text-calm-600 hover:text-calm-900 hover:bg-calm-100"
                  >
                    Student View
                  </Link>
                </nav>
              )}

              {/* Navigation for Admin / Super Admin */}
              {(role === 'INSTITUTION_ADMIN' || role === 'SUPER_ADMIN') && (
                <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
                  <Link
                    to="/admin-analytics"
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                      isActive('/admin-analytics') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-brand-600" />
                    <span>Institutional Analytics (Zero-PII)</span>
                  </Link>
                  <Link
                    to="/moderation"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive('/moderation') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    Peer Moderation
                  </Link>
                  <Link
                    to="/resources"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      isActive('/resources') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-calm-600 hover:text-calm-900 hover:bg-calm-100'
                    }`}
                  >
                    Resource Governance
                  </Link>
                </nav>
              )}
            </div>

            {/* Right Action Icons: SOS, Notifications, Role Switcher, Profile */}
            <div className="flex items-center space-x-2.5">
              {/* Crisis Helplines Link */}
              <Link
                to="/crisis"
                className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-crisis-700 hover:text-crisis-800 hover:bg-crisis-50 rounded-xl transition-colors"
                title="24/7 National Mental Health Helplines"
              >
                <Phone className="w-3.5 h-3.5 text-crisis-600" />
                <span>Helplines</span>
              </Link>

              {/* Emergency SOS Button */}
              <button
                onClick={() => setIsSosOpen(true)}
                className="px-3 py-1.5 bg-crisis-50 hover:bg-crisis-100 text-crisis-700 border border-crisis-300 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 shadow-xs transition-all animate-pulse"
                title="Immediate Crisis & Emergency Support"
              >
                <ShieldAlert className="w-4 h-4 text-crisis-600" />
                <span>Crisis SOS</span>
              </button>

              {/* Notifications Bell */}
              {user && (
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-xl text-calm-500 hover:text-calm-800 hover:bg-calm-100 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-crisis-600 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center animate-bounce">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Demo Role Switcher for SIH Evaluators */}
              <div className="relative">
                <button
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-calm-300 ${roleLabels[role]?.color || 'bg-calm-100 text-calm-800'}`}
                  title="Switch demo persona for testing"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Role: </span>
                  <span>{roleLabels[role]?.label || role}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isRoleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-calm-200 py-1.5 z-50 text-xs animate-fadeIn">
                    <div className="px-3 py-1.5 border-b border-calm-100 text-calm-500 font-semibold">
                      Switch Role (1-Click Test):
                    </div>
                    {(['STUDENT', 'COUNSELLOR', 'PEER_VOLUNTEER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN'] as UserRole[]).map(r => (
                      <button
                        key={r}
                        onClick={() => {
                          switchDemoRole(r);
                          setIsRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-brand-50 flex items-center justify-between ${role === r ? 'font-bold text-brand-700 bg-brand-50/50' : 'text-calm-700'}`}
                      >
                        <span>{roleLabels[r].label}</span>
                        {role === r && <UserCheck className="w-3.5 h-3.5 text-brand-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User Menu / Avatar */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-calm-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                    <span className="hidden xl:block text-xs font-medium text-calm-700 max-w-[110px] truncate">
                      @{user?.studentProfile?.anonymousAlias || user?.firstName || 'Account'}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-calm-200 py-1.5 z-50 text-xs animate-fadeIn">
                      <div className="px-3 py-2 border-b border-calm-100">
                        <p className="font-semibold text-calm-900 truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-[11px] text-calm-500 truncate">{user?.email}</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full text-left px-3 py-2 text-calm-700 hover:bg-calm-50 flex items-center space-x-2"
                      >
                        <User className="w-3.5 h-3.5 text-calm-500" />
                        <span>Profile & Identity</span>
                      </Link>

                      <Link
                        to="/onboarding"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full text-left px-3 py-2 text-calm-700 hover:bg-calm-50 flex items-center space-x-2"
                      >
                        <Compass className="w-3.5 h-3.5 text-calm-500" />
                        <span>Onboarding Guide</span>
                      </Link>

                      <Link
                        to="/consent"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full text-left px-3 py-2 text-calm-700 hover:bg-calm-50 flex items-center space-x-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-calm-500" />
                        <span>Manage Consents</span>
                      </Link>

                      <Link
                        to="/privacy"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full text-left px-3 py-2 text-calm-700 hover:bg-calm-50 flex items-center space-x-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-calm-500" />
                        <span>Privacy & Data Control</span>
                      </Link>

                      <div className="border-t border-calm-100 my-1" />

                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-crisis-600 hover:bg-crisis-50 flex items-center space-x-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/login" className="text-xs font-semibold text-calm-700 hover:text-calm-900 px-2.5 py-1.5">
                    Sign In
                  </Link>
                  <Link to="/register" className="text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 px-3 py-1.5 rounded-xl shadow-xs">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Emergency SOS Modal */}
      <EmergencySosModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} />
    </>
  );
};
