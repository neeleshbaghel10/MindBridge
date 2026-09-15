import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Video, Building, ArrowLeft, CheckCircle, ShieldCheck, AlertCircle, Globe } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner } from '../components/common/ErrorBanner';

export const BookAppointmentPage: React.FC = () => {
  const { counsellorId } = useParams<{ counsellorId: string }>();
  const navigate = useNavigate();

  const [counsellor, setCounsellor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  // Dynamic slots state
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isWorkingDay, setIsWorkingDay] = useState(true);

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [meetingType, setMeetingType] = useState<'VIRTUAL' | 'IN_PERSON'>('VIRTUAL');
  const [studentNotes, setStudentNotes] = useState('');

  // Generate available dates (next 14 weekdays)
  const availableDates: { dateString: string; label: string; dayName: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    // Exclude Sundays (0)
    if (d.getDay() !== 0) {
      availableDates.push({
        dateString: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      });
    }
  }

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0].dateString);
    }
  }, []);

  useEffect(() => {
    const fetchCounsellor = async () => {
      setIsLoading(true);
      try {
        const all = await api.getCounsellors();
        const found = all.find((c: any) => c.id === counsellorId);
        if (found) {
          setCounsellor(found);
        } else {
          setError('Counsellor profile not found.');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load counsellor information.');
      } finally {
        setIsLoading(false);
      }
    };

    if (counsellorId) {
      fetchCounsellor();
    }
  }, [counsellorId]);

  // Fetch dynamic slots whenever selectedDate or counsellorId changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!counsellorId || !selectedDate) return;
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const slotData = await api.getCounsellorSlots(counsellorId, selectedDate, 'Asia/Kolkata');
        setAvailableSlots(slotData?.slots || []);
        setIsWorkingDay(slotData?.isWorkingDay ?? true);

        // Preselect first available slot if any
        const firstOpen = slotData?.slots?.find((s: any) => s.isAvailable);
        if (firstOpen) {
          setSelectedSlot(firstOpen);
        }
      } catch (err) {
        console.error('Failed to load slots:', err);
        // Fallback default slots
        const fallbackSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((t) => ({
          time: t,
          scheduledAt: `${selectedDate}T${t}:00.000Z`,
          isAvailable: true,
          durationMin: 45,
        }));
        setAvailableSlots(fallbackSlots);
        setSelectedSlot(fallbackSlots[0]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [counsellorId, selectedDate]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) {
      setError('Please choose an available date and time slot.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.bookAppointment({
        counsellorId,
        scheduledAt: selectedSlot.scheduledAt,
        durationMin: selectedSlot.durationMin || 45,
        meetingType,
        studentNotes: studentNotes.trim() || undefined,
        timezone: 'Asia/Kolkata',
      });
      setSuccess(res);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'SLOT_UNAVAILABLE') {
        setError(err.message || 'This specific time slot has just been reserved. Please pick another available slot.');
      } else {
        setError(err?.message || 'Failed to book appointment. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <PageLoading label="Loading appointment booking..." />;

  if (success) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-6 animate-fadeIn text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-soft">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-calm-900">Session Confirmed!</h1>
          <p className="text-sm text-calm-600 leading-relaxed max-w-md mx-auto">
            Your appointment has been successfully scheduled with{' '}
            <strong>Dr. {counsellor?.user?.firstName || counsellor?.name?.replace('Dr. ', '')}</strong>.
            You will receive a notification and reminder prior to the consultation.
          </p>
        </div>

        <Card variant="calm" padding="md" className="max-w-md mx-auto text-left space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-calm-200">
            <span className="text-calm-500">Date & Time:</span>
            <span className="font-bold text-calm-800">
              {new Date(success.scheduledAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })} (IST)
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-calm-200">
            <span className="text-calm-500">Mode:</span>
            <span className="font-bold text-calm-800">
              {meetingType === 'VIRTUAL' ? 'Virtual Video Session' : 'In-Person (Room 204, Wellness Center)'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-calm-500">Duration:</span>
            <span className="font-bold text-calm-800">45 Minutes</span>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/appointments">
            <Button variant="primary">View My Appointments</Button>
          </Link>
          <Link to="/counsellors">
            <Button variant="outline">Back to Counsellors</Button>
          </Link>
        </div>
      </div>
    );
  }

  const counsellorName = counsellor?.name || `Dr. ${counsellor?.user?.firstName || ''} ${counsellor?.user?.lastName || ''}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Back link */}
      <Link to="/counsellors" className="text-sm text-brand-600 font-semibold hover:underline flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Counsellor Directory
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-calm-900">Book a Counselling Session</h1>
        <p className="text-sm text-calm-500 mt-0.5">
          Select your preferred time slot and session format. Confidential and free for all students.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setError('')} />}

      {/* Counsellor Summary Card */}
      {counsellor && (
        <Card variant="elevated" padding="md" className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-bold flex items-center justify-center shadow-soft flex-shrink-0">
            {counsellor.user?.firstName?.[0] || 'D'}{counsellor.user?.lastName?.[0] || 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-calm-900 truncate">{counsellorName}</h2>
              <Badge variant="success" size="sm">RCI Verified</Badge>
            </div>
            {counsellor.licenseNumber && (
              <p className="text-[11px] text-calm-500 font-mono">Reg No: {counsellor.licenseNumber}</p>
            )}
            {counsellor.bio && (
              <p className="text-xs text-calm-500 line-clamp-1 mt-0.5">{counsellor.bio}</p>
            )}
          </div>
        </Card>
      )}

      {/* Booking Form */}
      <form onSubmit={handleBooking} className="space-y-6">
        {/* Step 1: Date Selection */}
        <Card padding="md" className="space-y-3">
          <label className="text-sm font-bold text-calm-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            1. Select Session Date
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {availableDates.map((item) => {
              const isSelected = selectedDate === item.dateString;
              return (
                <button
                  key={item.dateString}
                  type="button"
                  onClick={() => setSelectedDate(item.dateString)}
                  className={`flex flex-col items-center py-2.5 px-1.5 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-brand-700 text-white border-brand-700 shadow-soft font-bold'
                      : 'bg-white border-calm-200 text-calm-700 hover:border-brand-400'
                  }`}
                >
                  <span className="text-[10px] opacity-75 uppercase tracking-wider">{item.dayName}</span>
                  <span className="text-sm font-extrabold mt-0.5">{item.label.split(' ')[0]}</span>
                  <span className="text-[9px] opacity-75">{item.label.split(' ')[1]}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Step 2: Time Selection */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-calm-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              2. Select Available Slot
            </label>
            <span className="text-[11px] text-calm-500 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              IST (UTC+5:30)
            </span>
          </div>

          {isLoadingSlots ? (
            <div className="py-6 text-center text-xs text-calm-500">
              Checking real-time slot availability...
            </div>
          ) : !isWorkingDay ? (
            <div className="p-4 bg-calm-50 border border-calm-200 rounded-xl text-center text-xs text-calm-600">
              Counsellor is not available on this date. Please choose another day.
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="p-4 bg-calm-50 border border-calm-200 rounded-xl text-center text-xs text-calm-600">
              No slots configured for this date.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map((slot) => {
                const isSelected = selectedSlot?.time === slot.time;
                const isAvail = slot.isAvailable;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!isAvail}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                      !isAvail
                        ? 'bg-calm-100 text-calm-400 border-calm-200 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-brand-700 text-white border-brand-700 shadow-soft'
                        : 'bg-white border-calm-200 text-calm-800 hover:border-brand-400'
                    }`}
                  >
                    <span>{slot.time}</span>
                    <span className="text-[9px] font-normal opacity-80">
                      {isAvail ? 'Available' : 'Booked'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Step 3: Meeting Format */}
        <Card padding="md" className="space-y-3">
          <label className="text-sm font-bold text-calm-900 flex items-center gap-2">
            <Video className="w-4 h-4 text-brand-600" />
            3. Choose Consultation Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMeetingType('VIRTUAL')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                meetingType === 'VIRTUAL'
                  ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-soft'
                  : 'border-calm-200 bg-white hover:border-calm-300'
              }`}
            >
              <div className={`p-2 rounded-lg ${meetingType === 'VIRTUAL' ? 'bg-brand-600 text-white' : 'bg-calm-100 text-calm-600'}`}>
                <Video className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-calm-900">Virtual Session</p>
                <p className="text-[11px] text-calm-500 mt-0.5">Secure end-to-end video call</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMeetingType('IN_PERSON')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                meetingType === 'IN_PERSON'
                  ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20 shadow-soft'
                  : 'border-calm-200 bg-white hover:border-calm-300'
              }`}
            >
              <div className={`p-2 rounded-lg ${meetingType === 'IN_PERSON' ? 'bg-brand-600 text-white' : 'bg-calm-100 text-calm-600'}`}>
                <Building className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-calm-900">In-Person</p>
                <p className="text-[11px] text-calm-500 mt-0.5">Room 204, Campus Clinic</p>
              </div>
            </button>
          </div>
        </Card>

        {/* Step 4: Pre-session Student Notes */}
        <Card padding="md" className="space-y-2">
          <label htmlFor="notes" className="text-sm font-bold text-calm-900 block">
            4. What would you like to focus on? <span className="text-xs font-normal text-calm-400">(Optional)</span>
          </label>
          <p className="text-xs text-calm-500">
            A brief summary helps the psychologist prepare relevant resources for your session.
          </p>
          <textarea
            id="notes"
            rows={3}
            value={studentNotes}
            onChange={(e) => setStudentNotes(e.target.value)}
            placeholder="e.g., Struggling with mid-term exam anxiety and irregular sleep patterns..."
            maxLength={500}
            className="w-full p-3 rounded-xl border border-calm-200 text-xs text-calm-900 placeholder-calm-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <div className="flex justify-end text-[10px] text-calm-400">
            {studentNotes.length}/500
          </div>
        </Card>

        {/* Confidentiality Reminder */}
        <div className="flex items-center gap-2 text-xs text-calm-500 bg-calm-50 p-3 rounded-xl border border-calm-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Session bookings are protected under strict RCI ethical confidentiality standards.</span>
        </div>

        {/* Submit CTA */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
          disabled={!selectedSlot || !selectedSlot.isAvailable || isSubmitting}
        >
          Confirm Appointment Request
        </Button>
      </form>
    </div>
  );
};
