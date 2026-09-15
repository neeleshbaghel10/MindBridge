import React, { useState, useEffect } from 'react';
import {
  Calendar,
  User,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api } from '../services/api';

export const CounsellingPage: React.FC = () => {
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [selectedCounsellor, setSelectedCounsellor] = useState<any | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [meetingType, setMeetingType] = useState<'VIRTUAL' | 'IN_PERSON'>('VIRTUAL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('11:00');
  const [studentNotes, setStudentNotes] = useState<string>('');
  const [consentTrendShare, setConsentTrendShare] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [counsellorsRes, apptsRes] = await Promise.all([
        api.getCounsellors(),
        api.getMyAppointments().catch(() => []),
      ]);
      setCounsellors(counsellorsRes || []);
      setMyAppointments(apptsRes || []);
    } catch (err) {
      console.error('Failed to load counselling data:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Default to tomorrow for date picker
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleOpenBooking = (counsellor: any) => {
    setSelectedCounsellor(counsellor);
    setIsBookingOpen(true);
    setBookingSuccess(null);
    setError(null);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCounsellor || !selectedDate) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`);

      await api.bookAppointment({
        counsellorId: selectedCounsellor.id,
        scheduledAt: scheduledDateTime.toISOString(),
        meetingType,
        studentNotes: studentNotes.trim() || undefined,
      });

      setBookingSuccess('Your confidential counselling appointment has been scheduled!');
      loadData();
      setTimeout(() => {
        setIsBookingOpen(false);
        setBookingSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Slot conflict or booking error. Please try another time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 bg-white border border-calm-200 rounded-2xl shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-calm-900 flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-brand-600" />
            <span>Confidential Campus Counselling</span>
          </h1>
          <p className="text-xs text-calm-500 mt-1">
            Book 1-on-1 confidential sessions with licensed university clinical psychologists and counsellors.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Strict Clinical Privacy Protected</span>
        </div>
      </div>

      {/* Active Scheduled Appointments */}
      {myAppointments.length > 0 && (
        <div className="p-6 bg-white border border-calm-200 rounded-2xl shadow-soft space-y-4">
          <h2 className="text-base font-bold text-calm-900">Your Scheduled Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myAppointments.map(a => (
              <div
                key={a.id}
                className="p-4 bg-brand-50/40 border border-brand-200 rounded-xl flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-calm-900">{a.counsellor?.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-calm-500 mt-1">{a.counsellor?.qualification}</p>

                  <div className="mt-3 flex items-center space-x-4 text-xs text-calm-700">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      <span>{new Date(a.scheduledAt).toLocaleDateString()} at {new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {a.meetingType === 'VIRTUAL' ? (
                        <>
                          <Video className="w-3.5 h-3.5 text-brand-600" />
                          <span>Virtual</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5 text-brand-600" />
                          <span>In-Person</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {a.meetingLinkOrLocation && (
                  <div className="pt-2 border-t border-brand-100 flex items-center justify-between text-xs">
                    <span className="text-calm-500 text-[11px] truncate max-w-[200px]">
                      {a.meetingLinkOrLocation}
                    </span>
                    {a.meetingType === 'VIRTUAL' && (
                      <a
                        href={a.meetingLinkOrLocation}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-700 font-bold hover:underline flex items-center space-x-1"
                      >
                        <span>Join Call</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counsellor Directory */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-calm-900">Available Campus Counsellors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {counsellors.map(c => (
            <div
              key={c.id}
              className="p-6 bg-white border border-calm-200 hover:border-brand-300 rounded-2xl shadow-soft flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-800 font-bold text-base flex items-center justify-center shadow-xs">
                      {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-calm-900">{c.name}</h3>
                      <p className="text-xs text-brand-700 font-medium">{c.qualification}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-calm-500 bg-calm-100 px-2 py-1 rounded-md">
                    License: {c.licenseNumber}
                  </span>
                </div>

                <p className="text-xs text-calm-600 leading-relaxed">{c.bio}</p>

                {/* Focus areas */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-calm-400 uppercase tracking-wider">
                    Specializations:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {c.specializations.map((s: string) => (
                      <span key={s} className="text-[10px] font-medium bg-brand-50 text-brand-800 px-2 py-0.5 rounded-md border border-brand-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div className="flex items-center space-x-2 text-xs text-calm-500 pt-1">
                  <span className="font-semibold text-calm-700">Languages:</span>
                  <span>{c.languages.join(', ')}</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenBooking(c)}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-soft transition-all flex items-center justify-center space-x-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Select Slot & Book Session</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingOpen && selectedCounsellor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-calm-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white shadow-2xl rounded-2xl border border-calm-200 overflow-hidden">
            <div className="p-5 border-b border-calm-100 bg-gradient-to-r from-brand-50 to-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-calm-900 text-base">Book Confidential Appointment</h3>
                <p className="text-xs text-calm-500 mt-0.5">With {selectedCounsellor.name}</p>
              </div>
              <button
                onClick={() => setIsBookingOpen(false)}
                className="text-calm-400 hover:text-calm-600 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleBook} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-crisis-50 border border-crisis-200 rounded-xl text-crisis-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {bookingSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>{bookingSuccess}</span>
                </div>
              )}

              {/* Date Selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-calm-800">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 border border-calm-300 rounded-xl text-xs text-calm-800 focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              {/* Time Slot */}
              <div className="space-y-1.5">
                <label className="block font-bold text-calm-800">Select Time (45-Minute Session)</label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        selectedTime === slot
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-calm-50 text-calm-700 border-calm-200 hover:bg-calm-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="space-y-1.5">
                <label className="block font-bold text-calm-800">Session Modality</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMeetingType('VIRTUAL')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 font-bold ${
                      meetingType === 'VIRTUAL'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-calm-50 text-calm-700 border-calm-200'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Virtual Tele-Health</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingType('IN_PERSON')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 font-bold ${
                      meetingType === 'IN_PERSON'
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-calm-50 text-calm-700 border-calm-200'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>In-Person (Room 204)</span>
                  </button>
                </div>
              </div>

              {/* Student Note */}
              <div className="space-y-1.5">
                <label className="block font-bold text-calm-800">Brief Note for Counsellor (Optional)</label>
                <textarea
                  rows={2}
                  value={studentNotes}
                  onChange={e => setStudentNotes(e.target.value)}
                  placeholder="What would you like to focus on? (e.g. Exam panic, sleep issues)"
                  className="w-full p-2.5 border border-calm-300 rounded-xl text-xs text-calm-800 focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Consent Toggle */}
              <label className="flex items-start space-x-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={consentTrendShare}
                  onChange={e => setConsentTrendShare(e.target.checked)}
                  className="mt-0.5 rounded border-calm-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-calm-600 text-[11px] leading-tight">
                  I consent to sharing my recent anonymous check-in stress averages and screening score with Dr. {selectedCounsellor.name} to help prepare for our session.
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-soft transition-all mt-4"
              >
                {isSubmitting ? 'Confirming Slot...' : 'Confirm Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
