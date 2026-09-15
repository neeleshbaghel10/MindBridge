import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldAlert, Wind, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { PageLoading } from '../components/common/LoadingState';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white rounded-2xl rounded-bl-sm shadow-soft w-16">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 bg-calm-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function BreathingGuide({ phase }: { phase: 'inhale' | 'hold' | 'exhale' | 'idle' }) {
  return (
    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all duration-1000 ${
      phase === 'inhale' ? 'scale-125 border-brand-500 bg-brand-50' :
      phase === 'hold' ? 'border-amberwarm-400 bg-amberwarm-50' :
      phase === 'exhale' ? 'scale-75 border-calm-300 bg-calm-50' :
      'border-calm-200 bg-calm-50'
    }`}>
      <span className="text-[10px] text-calm-600 text-center leading-tight px-1">{phase === 'idle' ? '··' : phase}</span>
    </div>
  );
}

export const AiSupportPage: React.FC = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [sosOpen, setSosOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'idle'>('idle');
  const [breathRunning, setBreathRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.getOrCreateChatSession().then((session: any) => {
      setSessionId(session.id);
      setMessages(session.messages || []);
    }).catch(() => setError('Unable to start support session. Please try again.')).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const send = async () => {
    if (!sessionId || !input.trim() || isSending) return;
    const text = input.trim();
    setInput('');
    setIsSending(true);
    const temp: Message = { id: Date.now().toString(), role: 'USER', content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, temp]);
    try {
      const res = await api.sendMessage(sessionId, text);
      setMessages((prev) => [...prev.filter(m => m.id !== temp.id), { ...temp }, res.userMessage && res.aiMessage ? res.aiMessage : res]);
      if (res.messages) setMessages(res.messages);
    } catch {
      setMessages((prev) => prev.filter(m => m.id !== temp.id));
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const triggerSos = async () => {
    setSosLoading(true);
    try { if (user) await api.triggerEmergencySos(); } catch {}
    setSosLoading(false);
    setSosOpen(true);
  };

  const startBreathing = () => {
    if (breathRunning) return;
    setBreathRunning(true);
    let count = 0;
    const steps: { p: 'inhale' | 'hold' | 'exhale'; d: number }[] = [
      { p: 'inhale', d: 4000 }, { p: 'hold', d: 7000 }, { p: 'exhale', d: 8000 },
    ];
    const run = () => { const s = steps[count % 3]; setBreathPhase(s.p); count++; setTimeout(run, s.d); };
    run();
  };

  if (isLoading) return <PageLoading label="Starting your support session…" />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px] animate-fadeIn">
      {/* Crisis banner */}
      <div className="bg-crisis-50 border border-crisis-200 rounded-xl px-4 py-2 mb-3 flex items-center justify-between gap-3 flex-shrink-0">
        <p className="text-xs text-crisis-700 font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-crisis-600 flex-shrink-0" />
          In immediate danger? Call <a href="tel:14416" className="font-bold underline">14416</a>
        </p>
        <button onClick={triggerSos} disabled={sosLoading} className="text-xs text-crisis-600 font-bold border border-crisis-300 px-2 py-1 rounded-lg hover:bg-crisis-100 transition-colors whitespace-nowrap">
          {sosLoading ? '…' : 'Emergency SOS'}
        </button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Grounding drawer - desktop left panel */}
        <div className={`flex-shrink-0 transition-all duration-300 ${drawerOpen ? 'w-64' : 'w-0'} overflow-hidden hidden lg:block`}>
          <Card padding="md" className="h-full overflow-y-auto space-y-4">
            <h3 className="text-sm font-bold text-calm-900 flex items-center gap-2"><Wind className="w-4 h-4 text-brand-600" /> Grounding Techniques</h3>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-calm-700">4-7-8 Breathing</p>
              <div className="flex flex-col items-center gap-3">
                <BreathingGuide phase={breathPhase} />
                {!breathRunning && <button onClick={startBreathing} className="text-xs text-brand-600 font-semibold hover:underline">Start →</button>}
                <p className="text-[10px] text-calm-400 text-center">4 in · 7 hold · 8 out</p>
              </div>
            </div>
            <div className="space-y-2 border-t border-calm-100 pt-3">
              <p className="text-xs font-semibold text-calm-700">5-4-3-2-1 Grounding</p>
              <div className="space-y-1.5 text-[11px] text-calm-500">
                {['5 things you can see', '4 you can touch', '3 you can hear', '2 you can smell', '1 you can taste'].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{5 - i}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Chat panel */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Toggle drawer button */}
          <div className="hidden lg:flex mb-2">
            <button onClick={() => setDrawerOpen(v => !v)} className="text-xs text-calm-500 hover:text-calm-700 flex items-center gap-1 border border-calm-200 px-3 py-1.5 rounded-lg">
              <Wind className="w-3.5 h-3.5" />
              {drawerOpen ? <><ChevronLeft className="w-3.5 h-3.5" /> Hide Techniques</> : 'Grounding Techniques →'}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2" aria-live="polite" aria-label="Chat messages">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center text-2xl">💙</div>
                <p className="text-sm font-semibold text-calm-700">Hello, I'm here with you</p>
                <p className="text-xs text-calm-500 max-w-xs mx-auto">This is a safe space. Share how you're feeling or what's on your mind, and I'll do my best to support you.</p>
                <p className="text-[11px] text-calm-400">This is AI-assisted support, not therapy. For clinical help, speak with a <Link to="/counsellors" className="text-brand-600 hover:underline">counsellor</Link>.</p>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.role === 'CRISIS_SYSTEM') {
                return (
                  <div key={msg.id} className="bg-crisis-50 border border-crisis-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-crisis-700">
                      <ShieldAlert className="w-4 h-4" />
                      <p className="text-xs font-bold">Crisis Support Resources</p>
                    </div>
                    <p className="text-xs text-crisis-600">{msg.content}</p>
                    <div className="flex gap-2 flex-wrap">
                      <a href="tel:14416" className="text-xs text-crisis-700 font-bold border border-crisis-300 px-2 py-1 rounded-lg bg-white">📞 14416</a>
                      <a href="tel:18005990019" className="text-xs text-crisis-700 font-bold border border-crisis-300 px-2 py-1 rounded-lg bg-white">📞 1800-599-0019</a>
                    </div>
                  </div>
                );
              }

              const isUser = msg.role === 'USER';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${isUser ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white text-calm-800 shadow-soft rounded-bl-sm border border-calm-100'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isUser ? 'text-brand-200' : 'text-calm-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <ErrorBanner message={error} onRetry={() => setError('')} className="mt-2" />}

          {/* Input area */}
          <div className="flex-shrink-0 mt-3 flex gap-2 items-end border-t border-calm-100 pt-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Share what's on your mind…"
              disabled={isSending}
              aria-label="Message input"
              className="flex-1 rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 text-calm-900 placeholder-calm-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 max-h-24 overflow-y-auto"
            />
            <Button onClick={send} disabled={!input.trim() || isSending} variant="primary" size="sm" className="flex-shrink-0 h-10 w-10 !p-0 flex items-center justify-center" aria-label="Send message">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-calm-400 text-center mt-1">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      {/* SOS Modal */}
      <Modal isOpen={sosOpen} onClose={() => setSosOpen(false)} title="Emergency Alert Sent" size="sm">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm text-calm-700">Your campus crisis team has been alerted. Please call one of these helplines now:</p>
          <div className="space-y-2">
            <a href="tel:14416" className="flex items-center justify-center gap-2 p-3 bg-crisis-50 border border-crisis-200 rounded-xl text-crisis-700 font-bold">
              <Phone className="w-4 h-4" /> Tele-MANAS: 14416
            </a>
            <a href="tel:18005990019" className="flex items-center justify-center gap-2 p-3 bg-crisis-50 border border-crisis-200 rounded-xl text-crisis-700 font-bold">
              <Phone className="w-4 h-4" /> KIRAN: 1800-599-0019
            </a>
          </div>
          <Button onClick={() => setSosOpen(false)} variant="primary" className="w-full">I'm with someone safe</Button>
        </div>
      </Modal>
    </div>
  );
};

// Need this import at top-level for Link in message
import { Link } from 'react-router-dom';
