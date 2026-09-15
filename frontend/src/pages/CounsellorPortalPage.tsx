import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Lock,
  FileText,
  Activity,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  User,
  ListTodo,
  CheckSquare,
  Square,
  Edit3,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { TabGroup } from '../components/common/TabGroup';
import { Modal } from '../components/common/Modal';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner, SuccessBanner } from '../components/common/ErrorBanner';

const DAYS_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PORTAL_TABS = [
  { id: 'caseload', label: 'Caseload & Appointments' },
  { id: 'tasks', label: 'Follow-Up Tasks' },
  { id: 'availability', label: 'Availability & Working Hours' },
  { id: 'profile', label: 'Clinical Profile' },
];

export const CounsellorPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('caseload');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Caseload state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Encrypted clinical notes modal state
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [followUpNotes, setFollowUpNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  // Status transition modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetApt, setTargetApt] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('COMPLETED');
  const [statusReason, setStatusReason] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Availability state
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [newDayOfWeek, setNewDayOfWeek] = useState<number>(1);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newSlotDuration, setNewSlotDuration] = useState(45);
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // Follow-Up Tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Profile state
  const [profileBio, setProfileBio] = useState('');
  const [profileQual, setProfileQual] = useState('');
  const [profileSpecs, setProfileSpecs] = useState<string[]>([]);
  const [profileLangs, setProfileLangs] = useState<string[]>([]);
  const [specInput, setSpecInput] = useState('');
  const [langInput, setLangInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Data loading
  const loadPortalData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [aptsData, slotsData, tasksData, profData] = await Promise.all([
        api.getMyAppointments(),
        api.getCounsellorAvailabilities().catch(() => []),
        api.getCounsellorTasks().catch(() => []),
        api.getMyCounsellorProfile().catch(() => null),
      ]);

      setAppointments(aptsData || []);
      setAvailabilitySlots(slotsData || []);
      setTasks(tasksData || []);

      if (profData) {
        setProfileBio(profData.bio || '');
        setProfileQual(profData.qualification || '');
        setProfileSpecs(profData.specializations || []);
        setProfileLangs(profData.languages || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load counsellor portal data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Notes handling
  const handleOpenNotesModal = (apt: any) => {
    setSelectedAppointment(apt);
    setClinicalNotes(apt.privateCounsellorNotes?.replace('ENCRYPTED_NOTE: ', '') || '');
    setFollowUpNotes(apt.followUpNotes || '');
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    setIsSavingNotes(true);
    try {
      await api.saveClinicalNotes(selectedAppointment.id, clinicalNotes, followUpNotes);
      setFeedback('Clinical notes encrypted and saved to medical record.');
      setTimeout(() => setFeedback(''), 4000);
      loadPortalData();
      setSelectedAppointment(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Status updating
  const openStatusModal = (apt: any, status: string) => {
    setTargetApt(apt);
    setTargetStatus(status);
    setStatusReason('');
    setStatusModalOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!targetApt) return;
    if (targetStatus === 'CANCELLED' && statusReason.trim().length < 3) {
      setError('Please provide a cancellation reason.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await api.updateAppointmentStatus(targetApt.id, targetStatus, statusReason.trim() || undefined);
      setStatusModalOpen(false);
      setFeedback(`Session status updated to ${targetStatus}.`);
      setTimeout(() => setFeedback(''), 4000);
      loadPortalData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update session status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Availability handlers
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingSlot(true);
    try {
      await api.createAvailabilitySlot({
        dayOfWeek: Number(newDayOfWeek),
        startTime: newStartTime,
        endTime: newEndTime,
        slotDurationMin: Number(newSlotDuration),
        timezone: 'Asia/Kolkata',
      });
      setFeedback('Availability slot added.');
      setTimeout(() => setFeedback(''), 3000);
      const updated = await api.getCounsellorAvailabilities();
      setAvailabilitySlots(updated || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to create availability slot.');
    } finally {
      setIsAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await api.deleteAvailabilitySlot(slotId);
      setAvailabilitySlots((prev) => prev.filter((s) => s.id !== slotId));
      setFeedback('Availability slot removed.');
      setTimeout(() => setFeedback(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete slot.');
    }
  };

  // Task handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsAddingTask(true);
    try {
      await api.createCounsellorTask({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
        dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setFeedback('Clinical follow-up task added.');
      setTimeout(() => setFeedback(''), 3000);
      const updated = await api.getCounsellorTasks();
      setTasks(updated || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to create task.');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.updateCounsellorTask(task.id, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteCounsellorTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete task.');
    }
  };

  // Profile save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await api.updateMyCounsellorProfile({
        bio: profileBio,
        qualification: profileQual,
        specializations: profileSpecs,
        languages: profileLangs,
      });
      setFeedback('Counsellor profile details updated.');
      setTimeout(() => setFeedback(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) return <PageLoading label="Loading counsellor portal..." />;

  const filteredAppointments =
    statusFilter === 'ALL'
      ? appointments
      : appointments.filter((a) => a.status === statusFilter);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-6 bg-white border border-calm-200 rounded-2xl shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-calm-900 flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-brand-600" />
            <span>Counsellor Clinical Workspace</span>
          </h1>
          <p className="text-xs text-calm-500 mt-1">
            Logged in as {user?.firstName} {user?.lastName} • License:{' '}
            {user?.counsellorProfile?.licenseNumber || 'RCI Registered'}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>RCI & DPDP Act 2023 Consent Governance Active</span>
        </div>
      </div>

      {feedback && <SuccessBanner message={feedback} />}
      {error && <ErrorBanner message={error} onRetry={loadPortalData} />}

      {/* Tabs */}
      <TabGroup tabs={PORTAL_TABS} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

      {/* TAB 1: Caseload & Appointments */}
      {activeTab === 'caseload' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-3 rounded-xl border border-calm-200">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-calm-500 font-semibold">Filter Status:</span>
              {['ALL', 'REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === st
                      ? 'bg-brand-700 text-white'
                      : 'bg-calm-100 text-calm-600 hover:bg-calm-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <span className="text-xs text-calm-500 font-medium">
              Showing {filteredAppointments.length} sessions
            </span>
          </div>

          {filteredAppointments.length === 0 ? (
            <Card padding="lg" className="text-center text-xs text-calm-500 py-12">
              No appointments matching the selected status.
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((apt) => {
                const scheduledDate = new Date(apt.scheduledAt);
                const hasConsented = apt.student?.dataSharingConsented;

                return (
                  <Card
                    key={apt.id}
                    variant="elevated"
                    padding="lg"
                    className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:border-brand-200 transition-all"
                  >
                    <div className="space-y-3 flex-1">
                      {/* Alias + Academic Context + Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-calm-900 text-base">
                          @{apt.student?.anonymousAlias || 'Anonymous Student'}
                        </span>
                        <span className="text-[11px] font-bold text-calm-600 bg-calm-100 px-2 py-0.5 rounded-md">
                          {apt.student?.department} • Year {apt.student?.yearOfStudy}
                        </span>
                        <Badge
                          variant={
                            apt.status === 'CONFIRMED'
                              ? 'success'
                              : apt.status === 'REQUESTED'
                              ? 'warning'
                              : apt.status === 'RESCHEDULED'
                              ? 'purple'
                              : apt.status === 'COMPLETED'
                              ? 'info'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {apt.status}
                        </Badge>
                      </div>

                      {/* Time and Mode */}
                      <div className="flex items-center space-x-4 text-xs text-calm-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-brand-600" />
                          <span>
                            {scheduledDate.toLocaleDateString('en-IN', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            at{' '}
                            {scheduledDate.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {apt.meetingType === 'VIRTUAL' ? (
                            <>
                              <Video className="w-3.5 h-3.5 text-brand-600" />
                              <span>Virtual Meeting</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-brand-600" />
                              <span>In-Person (Room 204)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Student's Consultation Note */}
                      {apt.studentNotes && (
                        <p className="text-xs text-calm-700 italic bg-calm-50 p-2 rounded-lg border border-calm-200">
                          Student focus area: "{apt.studentNotes}"
                        </p>
                      )}

                      {/* Consented Psychological Data Context */}
                      <div className="pt-1">
                        {hasConsented ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <Eye className="w-3 h-3" /> Consented Data:
                            </span>
                            {apt.student?.recentStressAvg !== null && (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                                14-Day Stress Avg: <strong>{apt.student.recentStressAvg}/5</strong>
                              </span>
                            )}
                            {apt.student?.recentMoodAvg !== null && (
                              <span className="bg-calm-100 text-calm-800 border border-calm-200 px-2 py-0.5 rounded-md text-[11px]">
                                Mood Avg: <strong>{apt.student.recentMoodAvg}/5</strong>
                              </span>
                            )}
                            {apt.student?.recentAssessments?.map((ras: any, rIdx: number) => (
                              <span
                                key={rIdx}
                                className="bg-brand-50 text-brand-800 border border-brand-200 px-2 py-0.5 rounded-md text-[11px]"
                              >
                                {ras.code}: <strong>{ras.severity}</strong> (Score {ras.score})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-calm-500 flex items-center gap-1.5 bg-calm-50 px-2.5 py-1 rounded-md border border-calm-200">
                            <EyeOff className="w-3.5 h-3.5 text-calm-400" />
                            <span>
                              Psychological records withheld: Student has not granted counsellor data sharing consent.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Clinical Notes Summary indicator */}
                      {apt.privateCounsellorNotes && (
                        <div className="text-[11px] text-brand-700 font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-brand-600" />
                          <span>Confidential clinical notes recorded</span>
                        </div>
                      )}
                    </div>

                    {/* Session Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2 w-full lg:w-48">
                      {apt.status === 'CONFIRMED' && apt.meetingLinkOrLocation && apt.meetingType === 'VIRTUAL' && (
                        <a
                          href={apt.meetingLinkOrLocation}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full text-center"
                        >
                          <Button variant="primary" size="sm" className="w-full" leftIcon={<Video className="w-3.5 h-3.5" />}>
                            Start Video Call
                          </Button>
                        </a>
                      )}

                      {apt.status === 'REQUESTED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openStatusModal(apt, 'CONFIRMED')}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Accept Request
                        </Button>
                      )}

                      {['CONFIRMED', 'RESCHEDULED'].includes(apt.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStatusModal(apt, 'COMPLETED')}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Mark Completed
                        </Button>
                      )}

                      {['CONFIRMED', 'RESCHEDULED'].includes(apt.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStatusModal(apt, 'NO_SHOW')}
                          className="text-calm-600 hover:text-calm-800"
                        >
                          Mark No-Show
                        </Button>
                      )}

                      <Button
                        variant="calm"
                        size="sm"
                        onClick={() => handleOpenNotesModal(apt)}
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                      >
                        {apt.privateCounsellorNotes ? 'Edit Notes' : 'Clinical Notes'}
                      </Button>

                      {['REQUESTED', 'CONFIRMED', 'RESCHEDULED'].includes(apt.status) && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openStatusModal(apt, 'CANCELLED')}
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Follow-Up Clinical Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Create Task Form */}
          <Card padding="md" className="space-y-3">
            <h2 className="text-sm font-bold text-calm-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-600" />
              Add Clinical Follow-Up Task
            </h2>
            <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Task title (e.g. Share DBT Distress Tolerance worksheet)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
                  required
                />
              </div>

              <div>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900 bg-white"
                >
                  <option value="LOW">Priority: Low</option>
                  <option value="MEDIUM">Priority: Medium</option>
                  <option value="HIGH">Priority: High</option>
                  <option value="URGENT">Priority: Urgent</option>
                </select>
              </div>

              <div>
                <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isAddingTask}>
                  Create Task
                </Button>
              </div>
            </form>
          </Card>

          {/* Tasks List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-calm-700 uppercase tracking-wider">
              Pending & Active Tasks ({tasks.filter((t) => t.status !== 'COMPLETED').length})
            </h3>

            {tasks.length === 0 ? (
              <p className="text-xs text-calm-500 py-6 text-center">No follow-up tasks created.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const isDone = task.status === 'COMPLETED';

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isDone
                          ? 'bg-calm-50 border-calm-200 text-calm-400'
                          : 'bg-white border-calm-200 text-calm-900 shadow-soft'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className="text-brand-600 hover:text-brand-800"
                        >
                          {isDone ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-calm-400" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              isDone ? 'line-through text-calm-400' : 'text-calm-900'
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-calm-500 truncate">{task.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant={
                            task.priority === 'URGENT'
                              ? 'danger'
                              : task.priority === 'HIGH'
                              ? 'warning'
                              : 'calm'
                          }
                          size="sm"
                        >
                          {task.priority}
                        </Badge>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-calm-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Availability & Working Hours */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          {/* Add Slot Form */}
          <Card padding="md" className="space-y-4">
            <h2 className="text-sm font-bold text-calm-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Configure Recurring Weekly Availability
            </h2>

            <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-calm-600 block mb-1">Day of Week</label>
                <select
                  value={newDayOfWeek}
                  onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900 bg-white"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-calm-600 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-calm-600 block mb-1">End Time</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-calm-600 block mb-1">Duration (Min)</label>
                <input
                  type="number"
                  min={30}
                  max={90}
                  step={15}
                  value={newSlotDuration}
                  onChange={(e) => setNewSlotDuration(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
                  required
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={isAddingSlot}>
                  Add Slot
                </Button>
              </div>
            </form>
          </Card>

          {/* Existing Slots List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-calm-700 uppercase tracking-wider">
              Configured Working Slots ({availabilitySlots.length})
            </h3>

            {availabilitySlots.length === 0 ? (
              <Card padding="md" className="text-center text-xs text-calm-500 py-8">
                No working hours configured yet. Add your weekly available slots above.
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availabilitySlots.map((slot) => (
                  <Card key={slot.id} padding="sm" className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-calm-900">
                        {DAYS_NAMES[slot.dayOfWeek] || `Day ${slot.dayOfWeek}`}
                      </p>
                      <p className="text-[11px] text-calm-500">
                        {slot.startTime} - {slot.endTime} ({slot.slotDurationMin}m slots)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="text-calm-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Clinical Profile */}
      {activeTab === 'profile' && (
        <Card padding="lg" className="space-y-4 max-w-2xl">
          <h2 className="text-base font-bold text-calm-900 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-600" />
            Counsellor Bio & Clinical Credentials
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-calm-800">Professional Qualification</label>
              <input
                type="text"
                value={profileQual}
                onChange={(e) => setProfileQual(e.target.value)}
                placeholder="e.g., M.Phil in Clinical Psychology, NIMHANS"
                className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-calm-800">Professional Bio</label>
              <textarea
                rows={4}
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                placeholder="Brief introduction for students seeking consultations..."
                className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
              />
            </div>

            {/* Specializations Editor */}
            <div className="space-y-1.5">
              <label className="font-bold text-calm-800">Clinical Focus Areas / Specialties</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={specInput}
                  onChange={(e) => setSpecInput(e.target.value)}
                  placeholder="e.g. Academic Anxiety"
                  className="flex-1 p-2 rounded-xl border border-calm-300 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (specInput.trim() && !profileSpecs.includes(specInput.trim())) {
                      setProfileSpecs([...profileSpecs, specInput.trim()]);
                      setSpecInput('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {profileSpecs.map((sp) => (
                  <span
                    key={sp}
                    className="bg-brand-50 text-brand-800 border border-brand-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px]"
                  >
                    <span>{sp}</span>
                    <button
                      type="button"
                      onClick={() => setProfileSpecs(profileSpecs.filter((s) => s !== sp))}
                      className="hover:text-rose-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <Button type="submit" variant="primary" size="sm" isLoading={isSavingProfile}>
              Save Profile Changes
            </Button>
          </form>
        </Card>
      )}

      {/* Encrypted Clinical Notes Modal */}
      {selectedAppointment && (
        <Modal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          title="Encrypted Clinical Notes & Medical Record"
          size="lg"
        >
          <form onSubmit={handleSaveNotes} className="space-y-4 text-xs">
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-[11px] text-brand-900 flex items-start gap-2">
              <Lock className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Confidential Clinical Record:</strong> Notes are encrypted at rest and accessible only to attending licensed psychologists. University staff and administrators have zero access.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-calm-800">
                Confidential Case Observations & Psychological Formulations
              </label>
              <textarea
                rows={6}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Document client affect, risk appraisal, interventions applied, and clinical recommendations..."
                className="w-full p-3 border border-calm-300 rounded-xl text-xs text-calm-800 focus:ring-2 focus:ring-brand-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-calm-800">
                Student-Facing Follow-Up Notes <span className="text-calm-400 font-normal">(Visible on student's appointment page)</span>
              </label>
              <textarea
                rows={2}
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="e.g. Practice 4-7-8 breathing twice daily before sleep; review Box Breathing resource..."
                className="w-full p-2.5 border border-calm-300 rounded-xl text-xs text-calm-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-calm-100">
              <Button variant="ghost" size="sm" onClick={() => setSelectedAppointment(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingNotes}>
                Encrypt & Save Notes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Session Status Transition Modal */}
      {statusModalOpen && targetApt && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title={`Update Session Status: ${targetStatus}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-calm-600">
              Transition session with <strong>@{targetApt.student?.anonymousAlias}</strong> to{' '}
              <span className="font-bold text-calm-900">{targetStatus}</span>.
            </p>

            {targetStatus === 'CANCELLED' && (
              <div className="space-y-1.5">
                <label className="font-bold text-calm-800 block">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Provide clinical or logistical reason..."
                  className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-calm-100">
              <Button variant="ghost" size="sm" onClick={() => setStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={targetStatus === 'CANCELLED' ? 'danger' : 'primary'}
                size="sm"
                isLoading={isUpdatingStatus}
                disabled={targetStatus === 'CANCELLED' && statusReason.trim().length < 3}
                onClick={handleConfirmStatusUpdate}
              >
                Confirm Update
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
