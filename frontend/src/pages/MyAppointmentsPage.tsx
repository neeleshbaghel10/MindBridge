import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  Building,
  XCircle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Bell,
  ArrowRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { TabGroup } from '../components/common/TabGroup';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner, SuccessBanner } from '../components/common/ErrorBanner';

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeVariant: 'success' | 'warning' | 'info' | 'danger' | 'calm' | 'purple' }
> = {
  REQUESTED: { label: 'Requested', badgeVariant: 'warning' },
  CONFIRMED: { label: 'Confirmed', badgeVariant: 'success' },
  RESCHEDULED: { label: 'Rescheduled', badgeVariant: 'purple' },
  COMPLETED: { label: 'Completed', badgeVariant: 'info' },
  CANCELLED: { label: 'Cancelled', badgeVariant: 'danger' },
  NO_SHOW: { label: 'Missed (No-Show)', badgeVariant: 'calm' },
};

const TABS = [
  { id: 'upcoming', label: 'Upcoming Sessions' },
  { id: 'past', label: 'Past & History' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const MyAppointmentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Rescheduling Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getMyAppointments();
      setAppointments(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load your appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Filter lists according to tabs
  const upcomingAppointments = appointments.filter(
    (a) => ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'].includes(a.status) && a.isUpcoming !== false
  );

  const pastAppointments = appointments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'NO_SHOW' || (!a.isUpcoming && a.status !== 'CANCELLED')
  );

  const cancelledAppointments = appointments.filter((a) => a.status === 'CANCELLED');

  // Cancel flow
  const openCancelModal = (apt: any) => {
    setSelectedAppointment(apt);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return;
    if (cancelReason.trim().length < 3) {
      setError('Please provide a cancellation reason (minimum 3 characters).');
      return;
    }

    setIsCancelling(true);
    try {
      await api.cancelAppointment(selectedAppointment.id, cancelReason.trim());
      setCancelModalOpen(false);
      setFeedback('Appointment has been successfully cancelled and the slot has been liberated.');
      setTimeout(() => setFeedback(''), 4000);
      loadAppointments();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Reschedule flow
  const openRescheduleModal = (apt: any) => {
    setSelectedAppointment(apt);
    setRescheduleReason('');
    setRescheduleDate('');
    setRescheduleTime('');
    setAvailableSlots([]);
    setRescheduleModalOpen(true);
  };

  // Fetch slots for reschedule date
  useEffect(() => {
    if (!selectedAppointment || !rescheduleDate) return;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const slotData = await api.getCounsellorSlots(selectedAppointment.counsellor.id, rescheduleDate);
        setAvailableSlots(slotData?.slots || []);
      } catch (err) {
        console.error('Failed to load reschedule slots:', err);
        setAvailableSlots([
          { time: '10:00', isAvailable: true },
          { time: '11:00', isAvailable: true },
          { time: '14:00', isAvailable: true },
          { time: '15:00', isAvailable: true },
        ]);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedAppointment, rescheduleDate]);

  const handleConfirmReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) {
      setError('Please select both a date and a time slot for rescheduling.');
      return;
    }

    setIsRescheduling(true);
    try {
      const newScheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
      await api.rescheduleAppointment(
        selectedAppointment.id,
        newScheduledAt,
        rescheduleReason.trim() || 'Rescheduled by student'
      );
      setRescheduleModalOpen(false);
      setFeedback('Your appointment has been successfully rescheduled.');
      setTimeout(() => setFeedback(''), 4000);
      loadAppointments();
    } catch (err: any) {
      setError(err?.message || 'Failed to reschedule appointment.');
    } finally {
      setIsRescheduling(false);
    }
  };

  if (isLoading) return <PageLoading label="Loading your counselling schedule..." />;

  const displayedList =
    activeTab === 'upcoming'
      ? upcomingAppointments
      : activeTab === 'past'
      ? pastAppointments
      : cancelledAppointments;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-calm-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-brand-600" />
            My Counselling Appointments
          </h1>
          <p className="text-sm text-calm-500 mt-0.5">
            Manage your booked 1-on-1 consultations with campus psychologists.
          </p>
        </div>

        <Link to="/counsellors">
          <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Book New Session
          </Button>
        </Link>
      </div>

      {feedback && <SuccessBanner message={feedback} />}
      {error && <ErrorBanner message={error} onRetry={loadAppointments} />}

      {/* Tabs */}
      <TabGroup tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

      {/* Appointment Cards */}
      {displayedList.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={
            activeTab === 'upcoming'
              ? 'No upcoming sessions'
              : activeTab === 'past'
              ? 'No session history'
              : 'No cancelled sessions'
          }
          description={
            activeTab === 'upcoming'
              ? 'You do not have any upcoming appointments. Campus psychologists are available for confidential consultations.'
              : 'Your session records will appear here after consultations are completed.'
          }
          actionLabel={activeTab === 'upcoming' ? 'Browse Counsellors' : undefined}
          onAction={activeTab === 'upcoming' ? () => (window.location.href = '/counsellors') : undefined}
        />
      ) : (
        <div className="space-y-4">
          {displayedList.map((apt) => {
            const scheduled = new Date(apt.scheduledAt);
            const isWithin24Hours = scheduled.getTime() - Date.now() < 24 * 60 * 60 * 1000 && scheduled.getTime() > Date.now();
            const statusMeta = STATUS_CONFIG[apt.status] || { label: apt.status, badgeVariant: 'info' };

            return (
              <Card
                key={apt.id}
                variant="elevated"
                padding="lg"
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-brand-200 transition-all"
              >
                <div className="space-y-3 flex-1">
                  {/* Status + Timezone + Reminders */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusMeta.badgeVariant as any} size="sm">
                      {statusMeta.label}
                    </Badge>
                    <span className="text-xs text-calm-500 font-mono">
                      {apt.timezone || 'Asia/Kolkata'}
                    </span>
                    {isWithin24Hours && (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        Upcoming in 24h
                      </span>
                    )}
                  </div>

                  {/* Counsellor Info */}
                  <div>
                    <h2 className="text-base font-bold text-calm-900">{apt.counsellor.name}</h2>
                    <p className="text-xs text-calm-500 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-calm-400" />
                      <span>{apt.counsellor.qualification}</span>
                      {apt.counsellor.licenseNumber && (
                        <span>• Reg: {apt.counsellor.licenseNumber}</span>
                      )}
                    </p>
                  </div>

                  {/* Date, Time & Meeting Type */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-calm-700">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-600" />
                      <strong>
                        {scheduled.toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <strong>
                        {scheduled.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>{' '}
                      ({apt.durationMin} mins)
                    </span>

                    <span className="flex items-center gap-1.5">
                      {apt.meetingType === 'VIRTUAL' ? (
                        <>
                          <Video className="w-3.5 h-3.5 text-brand-600" />
                          <span>Virtual Video Call</span>
                        </>
                      ) : (
                        <>
                          <Building className="w-3.5 h-3.5 text-brand-600" />
                          <span>Campus Wellness Center</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Previous schedule (if rescheduled) */}
                  {apt.previousScheduledAt && (
                    <div className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 p-2 rounded-lg flex items-center gap-1.5">
                      <RotateCcw className="w-3 h-3 flex-shrink-0" />
                      <span>
                        Originally scheduled for{' '}
                        {new Date(apt.previousScheduledAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                        . {apt.rescheduleReason && `Reason: "${apt.rescheduleReason}"`}
                      </span>
                    </div>
                  )}

                  {/* Cancellation details */}
                  {apt.status === 'CANCELLED' && apt.cancellationReason && (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                      <span className="font-semibold">Cancellation Reason:</span> "{apt.cancellationReason}"
                      {apt.cancelledByRole && (
                        <span className="text-[10px] text-rose-500 block mt-0.5">
                          Cancelled by {apt.cancelledByRole.toLowerCase()} on{' '}
                          {apt.cancelledAt ? new Date(apt.cancelledAt).toLocaleDateString() : 'earlier date'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Student's initial note */}
                  {apt.studentNotes && (
                    <p className="text-xs text-calm-500 italic bg-calm-50 p-2 rounded-lg">
                      Your note: "{apt.studentNotes}"
                    </p>
                  )}

                  {/* Counsellor student-facing follow-up note */}
                  {apt.followUpNotes && (
                    <div className="text-xs text-calm-800 bg-calm-100 p-2.5 rounded-lg border border-calm-200">
                      <span className="font-bold">Counsellor Follow-up Note:</span>
                      <p className="mt-0.5">{apt.followUpNotes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 w-full md:w-44">
                  {apt.status === 'CONFIRMED' && apt.meetingType === 'VIRTUAL' && apt.meetingLinkOrLocation && (
                    <a
                      href={apt.meetingLinkOrLocation}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full text-center"
                    >
                      <Button variant="primary" size="sm" className="w-full" leftIcon={<Video className="w-3.5 h-3.5" />}>
                        Join Video Call
                      </Button>
                    </a>
                  )}

                  {['REQUESTED', 'CONFIRMED', 'RESCHEDULED'].includes(apt.status) && apt.isUpcoming !== false && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRescheduleModal(apt)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Reschedule
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => openCancelModal(apt)}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Cancel Session
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Counselling Appointment"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-calm-600 leading-relaxed">
            Are you sure you want to cancel your session with{' '}
            <strong>{selectedAppointment?.counsellor?.name}</strong>?
            Liberating your slot allows fellow students in need of psychological support to book the time.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-calm-800 block">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Academic timetable conflict, feeling better, personal emergency..."
              className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900 focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-calm-100">
            <Button variant="ghost" size="sm" onClick={() => setCancelModalOpen(false)}>
              Keep Appointment
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isCancelling}
              disabled={cancelReason.trim().length < 3 || isCancelling}
              onClick={handleConfirmCancel}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rescheduling Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Appointment"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-calm-600">
            Select a new date and available slot for your consultation with{' '}
            <strong>{selectedAppointment?.counsellor?.name}</strong>.
          </p>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-calm-800 block">Select New Date</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
            />
          </div>

          {/* Time Slot Picker */}
          {rescheduleDate && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-calm-800 block">Select New Time Slot</label>
              {isLoadingSlots ? (
                <p className="text-xs text-calm-500">Checking available slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-calm-500">No available slots on this date.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.isAvailable}
                      onClick={() => setRescheduleTime(s.time)}
                      className={`p-2 rounded-lg border text-xs font-semibold ${
                        !s.isAvailable
                          ? 'bg-calm-100 text-calm-400 border-calm-200 cursor-not-allowed'
                          : rescheduleTime === s.time
                          ? 'bg-brand-700 text-white border-brand-700'
                          : 'bg-white border-calm-200 text-calm-800 hover:border-brand-400'
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-calm-800 block">
              Reason for Rescheduling <span className="text-calm-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g., Class schedule changed"
              className="w-full p-2.5 rounded-xl border border-calm-300 text-xs text-calm-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-calm-100">
            <Button variant="ghost" size="sm" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isRescheduling}
              disabled={!rescheduleDate || !rescheduleTime || isRescheduling}
              onClick={handleConfirmReschedule}
            >
              Confirm Reschedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
