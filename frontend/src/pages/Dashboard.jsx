import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import posthog from '../lib/posthog';
import {
  Mic, MicOff, Play, Pause, Save, Plus, Trash2, Edit3,
  Lock, Unlock, Clock, UserPlus, Users, Volume2, Heart,
  Search, Image, FileText, Check, LogOut, Settings,
  AlertCircle, Calendar, Share2, MessageSquare, BookOpen,
  ArrowRight, Sparkles, RefreshCw
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');

// Theme Presets for Guided Capture
const PROMPT_THEMES = [
  {
    id: "stories",
    title: "Life Stories",
    description: "Childhood, love, turning points, and major adventures.",
    prompts: [
      "Tell me about the day you met the love of your life.",
      "What is your happiest childhood memory?",
      "Describe a major turning point that changed the course of your life.",
      "Tell me about your favorite job or career adventure.",
      "What was the house you grew up in like?"
    ]
  },
  {
    id: "values",
    title: "Values & Beliefs",
    description: "What has guided your life decisions, lessons, and faith.",
    prompts: [
      "What are the three most important values you lived by?",
      "If you could give your 20-year-old self one piece of advice, what would it be?",
      "How did you handle the hardest year of your life?",
      "What does faith, spirituality, or purpose mean to you?",
      "What defines a life well lived?"
    ]
  },
  {
    id: "messages",
    title: "Personal Messages",
    description: "Special words dedicated by name to specific family members.",
    prompts: [
      "Record a message for your children about how proud you are of them.",
      "What are your hopes for your grandchildren as they grow up?",
      "What would you like to say to your spouse or life partner?",
      "Leave a message for your closest friends, thanking them."
    ]
  },
  {
    id: "practical",
    title: "Practical & Fun",
    description: "Family recipes, how-to-fix-it advice, and humor.",
    prompts: [
      "Explain how to make your famous signature family recipe.",
      "What is a practical skill you want to pass down (e.g. gardening, fixing things)?",
      "Tell a funny story or share a favorite joke that always makes you laugh.",
      "What is your favorite book, movie, or song, and why?"
    ]
  }
];

export default function Dashboard() {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState({ name: 'User', role: 'narrator' });
  const [activeTab, setActiveTab] = useState('capture'); // 'capture', 'vault', 'recipients', 'collab'
  
  // API Call Headers
  const getHeaders = useCallback(() => ({
    headers: { Authorization: `Bearer ${session?.access_token}` }
  }), [session]);

  // Fetch Profile
  useEffect(() => {
    if (!session) return;
    axios.get(`${API}/api/auth/profile`, getHeaders())
      .then(res => {
        setProfile(res.data);
        // Default active tab based on role
        if (res.data.role === 'recipient') {
          setActiveTab('ask');
        }
      })
      .catch(err => {
        console.error('Failed to load profile:', err);
        toast.error('Error synchronizing profile.');
      });
  }, [session, getHeaders]);

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Heart className="w-5 h-5 text-accent fill-accent/20" />
          <span className="font-serif font-semibold text-lg tracking-wide">Living Legacy</span>
          <span className="text-[10px] bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
            {profile.role === 'narrator' ? 'Narrator' : 'Recipient'}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-secondary">Logged in as</p>
            <p className="text-sm font-semibold text-primary font-serif">{profile.name}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs border border-border hover:border-danger hover:text-danger px-3 py-1.5 rounded transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 flex flex-col gap-2">
          {profile.role === 'narrator' ? (
            <>
              <button
                onClick={() => setActiveTab('capture')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'capture'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Recording Studio</span>
              </button>
              <button
                onClick={() => setActiveTab('vault')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'vault'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>The Vault</span>
              </button>
              <button
                onClick={() => setActiveTab('recipients')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'recipients'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Recipient Directory</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('ask')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'ask'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Ask Them</span>
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'archive'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Preserved Archive</span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('collab')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'collab'
                ? 'bg-accent text-background font-semibold shadow'
                : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Collaboration Wall</span>
          </button>
        </aside>

        {/* Dynamic Content Panel */}
        <main className="lg:col-span-3 bg-surface border border-border rounded-xl p-6 shadow-sm min-h-[500px]">
          {profile.role === 'narrator' ? (
            <>
              {activeTab === 'capture' && <RecordingStudio getHeaders={getHeaders} />}
              {activeTab === 'vault' && <VaultView getHeaders={getHeaders} />}
              {activeTab === 'recipients' && <RecipientsView getHeaders={getHeaders} />}
              {activeTab === 'collab' && <CollabWallView getHeaders={getHeaders} role="narrator" />}
            </>
          ) : (
            <>
              {activeTab === 'ask' && <AskThemView getHeaders={getHeaders} />}
              {activeTab === 'archive' && <ArchiveView getHeaders={getHeaders} />}
              {activeTab === 'collab' && <CollabWallView getHeaders={getHeaders} role="recipient" />}
            </>
          )}
        </main>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATOR COMPONENT: Recording Studio
// ─────────────────────────────────────────────────────────────────────────────
function RecordingStudio({ getHeaders }) {
  const [selectedTheme, setSelectedTheme] = useState(PROMPT_THEMES[0]);
  const [currentPrompt, setCurrentPrompt] = useState(PROMPT_THEMES[0].prompts[0]);
  const [sessionRecord, setSessionRecord] = useState(null);
  
  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [releaseRule, setReleaseRule] = useState('now');
  const [releaseDate, setReleaseDate] = useState('');
  const [releaseEventDesc, setReleaseEventDesc] = useState('');
  const [visibility, setVisibility] = useState('shared');
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  
  // Speech Recognition refs (native browser Speech API)
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(prev => prev + finalTranscript);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript('');
    setRecordingTime(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      posthog.capture('recording_started', { theme: selectedTheme.id });
      
      // Start browser transcript capture
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('Microphone error:', err);
      toast.error('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      posthog.capture('recording_completed', {
        theme: selectedTheme.id,
        recording_duration_seconds: recordingTime
      });
      
      // Stop browser transcript capture
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const triggerGeminiTranscription = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');

    try {
      const res = await axios.post(`${API}/api/transcribe`, formData, {
        headers: {
          ...getHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      setTranscript(res.data.transcript);
      posthog.capture('transcription_completed');
      toast.success('Gemini generated the transcript!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to run Gemini speech-to-text.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const triggerTTSPrompt = async () => {
    try {
      const res = await axios.post(`${API}/api/tts`, { text: currentPrompt }, {
        ...getHeaders(),
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(res.data);
      const audio = new Audio(blobUrl);
      audio.play();
      toast.success('Playing guide voice prompt...');
    } catch (err) {
      toast.error('Failed to generate prompt voice.');
    }
  };

  const saveToVault = async (e) => {
    e.preventDefault();
    if (!audioBlob) {
      toast.error('Please record some audio first.');
      return;
    }
    if (!title) {
      toast.error('Please enter a title.');
      return;
    }

    setIsSaving(true);
    
    try {
      // 1. Create or verify current session
      let currentSessionId = sessionRecord?.id;
      if (!currentSessionId) {
        const sRes = await axios.post(`${API}/api/sessions`, {
          theme: selectedTheme.title,
          facilitator: "Self"
        }, getHeaders());
        setSessionRecord(sRes.data);
        currentSessionId = sRes.data.id;
      }

      // 2. Upload audio + metadata
      const formData = new FormData();
      formData.append('session_id', currentSessionId);
      formData.append('title', title);
      formData.append('transcript', transcript || 'Audio clip without transcript');
      formData.append('release_rule', releaseRule);
      if (releaseDate) formData.append('release_date', new Date(releaseDate).toISOString());
      if (releaseEventDesc) formData.append('release_event_desc', releaseEventDesc);
      formData.append('visibility', visibility);
      formData.append('file', audioBlob, 'legacy_clip.webm');

      await axios.post(`${API}/api/clips`, formData, {
        headers: {
          ...getHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      posthog.capture('clip_saved', {
        theme: selectedTheme.id,
        release_rule: releaseRule,
        visibility
      });
      toast.success('Clip successfully preserved in The Vault!');
      
      // Reset form
      setAudioBlob(null);
      setAudioUrl(null);
      setTranscript('');
      setTitle('');
      setRecordingTime(0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to preserve audio clip.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remains = secs % 60;
    return `${mins}:${remains < 10 ? '0' : ''}${remains}`;
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-primary">Recording Studio</h2>
          <p className="text-xs text-secondary">A gentle, low-burden space to record and transcribe your legacy.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Prompt Selector */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Select a Theme</h3>
          <div className="space-y-2">
            {PROMPT_THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  setSelectedTheme(theme);
                  setCurrentPrompt(theme.prompts[0]);
                  setSessionRecord(null); // start new session on theme switch
                }}
                className={`w-full text-left p-3.5 rounded border text-xs transition-all ${
                  selectedTheme.id === theme.id
                    ? 'border-accent bg-accent/5 text-primary'
                    : 'border-border bg-surface/20 text-secondary hover:text-primary hover:border-gray-800'
                }`}
              >
                <div className="font-semibold">{theme.title}</div>
                <div className="text-[10px] opacity-80 mt-1">{theme.description}</div>
              </button>
            ))}
          </div>

          <div className="bg-surface/50 border border-border p-4 rounded-lg">
            <h4 className="text-xs font-semibold text-primary mb-2">Selected Theme Prompts</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedTheme.prompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPrompt(p)}
                  className={`w-full text-left text-xs p-2 rounded hover:bg-background/40 transition-colors ${
                    currentPrompt === p ? 'text-accent font-medium border-l-2 border-accent pl-1.5' : 'text-secondary'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recorder and Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Active Prompt display */}
          <div className="bg-background/60 border border-border rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-3">
              <Sparkles className="w-5 h-5 text-accent opacity-20" />
            </div>
            <div>
              <span className="text-[10px] text-accent font-semibold tracking-widest uppercase">{selectedTheme.title} Prompt</span>
              <h3 className="text-xl font-serif text-primary mt-2 mb-4 leading-snug">"{currentPrompt}"</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={triggerTTSPrompt}
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline bg-accent/5 border border-accent/20 rounded-full px-3 py-1 font-medium"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear prompt voice guide</span>
              </button>
            </div>
          </div>

          {/* Recording panel */}
          <div className="bg-surface/60 border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
            
            {isRecording ? (
              <div className="space-y-3">
                <div className="relative inline-block">
                  <span className="absolute inset-0 rounded-full bg-danger/20 animate-ping" />
                  <button
                    onClick={stopRecording}
                    className="relative w-16 h-16 rounded-full bg-danger text-primary flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <MicOff className="w-6 h-6 text-primary" />
                  </button>
                </div>
                <p className="text-xs uppercase tracking-widest text-danger font-semibold">Recording live...</p>
                <p className="text-2xl font-mono text-primary font-bold">{formatTime(recordingTime)}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-accent text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <Mic className="w-6 h-6 text-background" />
                </button>
                <p className="text-xs uppercase tracking-widest text-accent font-semibold">Click to speak</p>
                <p className="text-xs text-secondary max-w-xs">Speak naturally. Real-time translation will capture your words below.</p>
              </div>
            )}

            {audioUrl && (
              <div className="w-full pt-3 flex flex-col items-center gap-3">
                <audio src={audioUrl} controls className="w-full max-w-md mx-auto" />
                <button
                  onClick={triggerGeminiTranscription}
                  disabled={isTranscribing}
                  className="flex items-center gap-2 text-xs text-primary border border-border hover:border-accent hover:text-accent px-4 py-2 rounded-full transition-all disabled:opacity-50"
                >
                  {isTranscribing ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Transcribing...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5 text-accent" /> Run Gemini High-Quality STT</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Transcript Panel */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest text-secondary font-semibold">Preserved Transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your transcript will appear here automatically. You can edit this text to fix any mistakes..."
              rows={4}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          {/* Save / Release Panel */}
          {audioBlob && (
            <form onSubmit={saveToVault} className="bg-surface/80 border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Metadata & Release Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Clip Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. My childhood in Oklahoma"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary outline-none focus:border-accent/40"
                  >
                    <option value="shared">Share with connected family</option>
                    <option value="family_archive">Move to private family archive</option>
                    <option value="private">Strictly Private (Just Me)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-4">
                <div>
                  <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Release Rule</label>
                  <select
                    value={releaseRule}
                    onChange={(e) => setReleaseRule(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary outline-none focus:border-accent/40"
                  >
                    <option value="now">Release Immediately</option>
                    <option value="date">Future Date</option>
                    <option value="event">Triggered Event</option>
                    <option value="never">Keep Locked</option>
                  </select>
                </div>
                
                {releaseRule === 'date' && (
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Release Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary outline-none focus:border-accent/40"
                    />
                  </div>
                )}

                {releaseRule === 'event' && (
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Unlocking Event Trigger</label>
                    <input
                      type="text"
                      required
                      value={releaseEventDesc}
                      onChange={(e) => setReleaseEventDesc(e.target.value)}
                      placeholder="e.g. When Sarah turns 18 / My wedding anniversary"
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-accent text-background font-semibold text-sm px-6 py-2.5 rounded hover:bg-opacity-90 transition-all shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="w-4 h-4 text-background" /> Save to Vault</>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATOR COMPONENT: The Vault View
// ─────────────────────────────────────────────────────────────────────────────
function VaultView({ getHeaders }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClip, setEditingClip] = useState(null);
  
  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [editRule, setEditRule] = useState('now');
  const [editVisibility, setEditVisibility] = useState('shared');

  const fetchClips = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/clips`, getHeaders())
      .then(res => setClips(res.data))
      .catch(() => toast.error('Failed to load clips.'))
      .finally(() => setLoading(false));
  }, [getHeaders]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this clip from your legacy? This action is permanent.")) return;
    try {
      await axios.delete(`${API}/api/clips/${id}`, getHeaders());
      posthog.capture('clip_deleted');
      toast.success('Clip removed successfully.');
      fetchClips();
    } catch (err) {
      toast.error('Failed to delete clip.');
    }
  };

  const handleEdit = (clip) => {
    setEditingClip(clip);
    setEditTitle(clip.title);
    setEditTranscript(clip.transcript);
    setEditRule(clip.release_rule);
    setEditVisibility(clip.visibility);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/api/clips/${editingClip.id}`, {
        title: editTitle,
        transcript: editTranscript,
        release_rule: editRule,
        visibility: editVisibility
      }, getHeaders());
      posthog.capture('clip_updated', {
        release_rule: editRule,
        visibility: editVisibility
      });
      toast.success('Clip updated.');
      setEditingClip(null);
      fetchClips();
    } catch (err) {
      toast.error('Failed to update clip.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-semibold text-primary">The Vault</h2>
        <p className="text-xs text-secondary">Your organized legacy archive. Edit your text, manage sharing, and preview audio.</p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-secondary">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading archive...
        </div>
      ) : clips.length === 0 ? (
        <div className="bg-surface/30 border border-border rounded-xl p-12 text-center text-secondary">
          <Lock className="w-8 h-8 text-accent mx-auto mb-4 opacity-40" />
          <p className="font-serif text-lg text-primary mb-1">Your Vault is Empty</p>
          <p className="text-xs mb-4">Go to the Recording Studio to preserve your first story.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clips.map(clip => (
            <div key={clip.id} className="bg-surface/50 border border-border rounded-xl p-5 flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-serif font-semibold text-primary text-lg">{clip.title}</h3>
                  <span className="text-[10px] bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                    {clip.release_rule}
                  </span>
                  <span className="text-[10px] bg-border text-secondary border border-border px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                    {clip.visibility}
                  </span>
                </div>
                <p className="text-xs text-secondary italic">Recorded on {new Date(clip.created_at).toLocaleDateString()}</p>
                <div className="bg-background/40 border border-border/60 rounded p-3 text-xs text-secondary line-clamp-2">
                  {clip.transcript}
                </div>
                
                {clip.audio_url && (
                  <audio src={clip.audio_url.startsWith('http') ? clip.audio_url : `${API}${clip.audio_url}`} controls className="w-full max-w-md pt-2" />
                )}
              </div>

              <div className="flex md:flex-col justify-end gap-2 shrink-0">
                <button
                  onClick={() => handleEdit(clip)}
                  className="flex items-center justify-center gap-1.5 text-xs border border-border hover:border-accent hover:text-accent px-3.5 py-2 rounded transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(clip.id)}
                  className="flex items-center justify-center gap-1.5 text-xs border border-border hover:border-danger hover:text-danger px-3.5 py-2 rounded transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editing Modal */}
      {editingClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <form onSubmit={saveEdit} className="bg-surface border border-border rounded-xl w-full max-w-xl mx-4 p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-xl font-serif font-semibold text-primary">Edit Legacy Item</h2>
              <p className="text-xs text-secondary">Modify details or update accessibility settings.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Clip Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Transcript Text</label>
                <textarea
                  required
                  value={editTranscript}
                  onChange={(e) => setEditTranscript(e.target.value)}
                  rows={4}
                  className="w-full bg-background border border-border rounded p-3 text-sm text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Release Rule</label>
                  <select
                    value={editRule}
                    onChange={(e) => setEditRule(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary"
                  >
                    <option value="now">Release Immediately</option>
                    <option value="date">Future Date</option>
                    <option value="event">Triggered Event</option>
                    <option value="never">Keep Locked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Visibility</label>
                  <select
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary"
                  >
                    <option value="shared">Share with connected family</option>
                    <option value="family_archive">Private Family Archive</option>
                    <option value="private">Strictly Private (Just Me)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setEditingClip(null)}
                className="text-xs border border-border hover:bg-background px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs bg-accent text-background font-semibold px-4 py-2 rounded hover:bg-opacity-90"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATOR COMPONENT: Recipients Directory
// ─────────────────────────────────────────────────────────────────────────────
function RecipientsView({ getHeaders }) {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');

  const fetchRecipients = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/recipients`, getHeaders())
      .then(res => setRecipients(res.data))
      .catch(() => toast.error('Failed to load recipients list.'))
      .finally(() => setLoading(false));
  }, [getHeaders]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/recipients`, { name, email, relationship }, getHeaders());
      posthog.capture('recipient_added');
      toast.success(`${name} added to your legacy circle.`);
      setName('');
      setEmail('');
      setRelationship('');
      fetchRecipients();
    } catch (err) {
      toast.error('Failed to add recipient. They might already be added.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this recipient? They will lose access to any custom shared clips.")) return;
    try {
      await axios.delete(`${API}/api/recipients/${id}`, getHeaders());
      posthog.capture('recipient_removed');
      toast.success('Recipient removed.');
      fetchRecipients();
    } catch (err) {
      toast.error('Failed to remove recipient.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-semibold text-primary">Recipient Directory</h2>
        <p className="text-xs text-secondary">Manage family and loved ones who are granted access to view and search your archive.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add form */}
        <form onSubmit={handleSubmit} className="md:col-span-1 bg-surface/50 border border-border rounded-xl p-5 space-y-4 h-fit">
          <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Add Loved One</h3>
          
          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Vance"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40"
            />
          </div>

          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40"
            />
          </div>

          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Relationship</label>
            <input
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Daughter, Grandchild"
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 bg-accent text-background font-semibold text-sm py-2.5 rounded hover:bg-opacity-90 transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-background" />
            <span>Add to Circle</span>
          </button>
        </form>

        {/* List */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Legacy Circle</h3>

          {loading ? (
            <div className="h-32 flex items-center justify-center text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading circle...
            </div>
          ) : recipients.length === 0 ? (
            <div className="bg-surface/20 border border-border/40 rounded-xl p-8 text-center text-secondary text-xs">
              No family members added yet. Add a loved one to start sharing.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recipients.map(r => (
                <div key={r.id} className="bg-surface/50 border border-border rounded-xl p-4 flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-serif font-semibold text-primary">{r.name}</p>
                    <p className="text-xs text-accent">{r.relationship}</p>
                    <p className="text-xs text-secondary font-mono">{r.email}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-secondary hover:text-danger p-1 rounded hover:bg-background/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIPIENT COMPONENT: Ask Them Search
// ─────────────────────────────────────────────────────────────────────────────
function AskThemView({ getHeaders }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await axios.get(`${API}/api/ask`, {
        params: { query },
        ...getHeaders()
      });
      setResult(res.data);
      posthog.capture('archive_search_completed', {
        result_found: Boolean(res.data.found),
        retrieval_method: res.data.method || 'none'
      });
    } catch (err) {
      toast.error('Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto pt-6 space-y-3">
        <Heart className="w-10 h-10 text-accent fill-accent/15 mx-auto mb-2" />
        <h2 className="text-3xl font-serif font-medium text-primary">Ask Your Loved One</h2>
        <p className="text-sm text-secondary">
          Enter a question, and the system will locate and play the exact audio recording where your loved one discussed that topic.
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What was your advice about money and saving?"
          className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40"
        />
        <button
          type="submit"
          disabled={loading || !query}
          className="bg-accent text-background font-semibold px-6 py-3 rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-background" />}
          <span>Search</span>
        </button>
      </form>

      {/* Privacy / Ethical Guardrail Notice */}
      <div className="max-w-xl mx-auto bg-surface/40 border border-border rounded-lg p-3.5 flex items-start gap-2.5 text-[11px] text-secondary">
        <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p>
          <strong>Ethical Guardrail:</strong> This is a secure archive retrieval engine. It matches your queries strictly to the narrator's <em>actual recorded voice clips</em>. It does NOT generate new sentences, clone voices, or simulate alive interaction.
        </p>
      </div>

      {/* Result Display */}
      {result && (
        <div className="max-w-xl mx-auto border-t border-border pt-6">
          {result.found ? (
            <div className="bg-background/80 border border-accent/20 rounded-xl p-5 space-y-4 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 flex gap-2">
                <span className="text-[10px] bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                  Match Score {(result.score * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] bg-border text-secondary border border-border px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                  {result.method === 'gemini' ? 'Gemini Semantic Match' : 'Keyword Match'}
                </span>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-accent font-semibold">{result.clip.narrator_name}'s Words</p>
                <h3 className="text-xl font-serif text-primary mt-1 font-medium leading-snug">"{result.clip.title}"</h3>
              </div>

              <div className="bg-surface/50 border border-border/80 rounded-lg p-4 text-sm text-primary leading-relaxed font-serif italic">
                "{result.clip.transcript}"
              </div>

              {result.clip.audio_url && (
                <div className="pt-2">
                  <audio 
                    src={result.clip.audio_url.startsWith('http') ? result.clip.audio_url : `${API}${result.clip.audio_url}`} 
                    controls 
                    autoPlay
                    className="w-full" 
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface/30 border border-border rounded-xl p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-secondary/60 mx-auto mb-2" />
              <p className="font-serif text-lg text-primary">No Recorded Memory Found</p>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                {result.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECIPIENT COMPONENT: Preserved Archive View
// ─────────────────────────────────────────────────────────────────────────────
function ArchiveView({ getHeaders }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/clips`, getHeaders())
      .then(res => setClips(res.data))
      .catch(() => toast.error('Failed to load archive.'))
      .finally(() => setLoading(false));
  }, [getHeaders]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-semibold text-primary">Preserved Archive</h2>
        <p className="text-xs text-secondary">Browse the unlocked memories and voice records shared with you.</p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-secondary">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading archive...
        </div>
      ) : clips.length === 0 ? (
        <div className="bg-surface/30 border border-border rounded-xl p-12 text-center text-secondary">
          <Lock className="w-8 h-8 text-accent mx-auto mb-4 opacity-40" />
          <p className="font-serif text-lg text-primary">No Shared Items Yet</p>
          <p className="text-xs">Once the narrator records clips and sets them to release, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clips.map(clip => (
            <div key={clip.id} className="bg-surface/50 border border-border rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-accent font-semibold">Preserved Clip</span>
                  <span className="text-[10px] text-secondary font-mono">{new Date(clip.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="font-serif font-semibold text-primary text-lg leading-tight">{clip.title}</h3>
                
                <div className="bg-background/40 border border-border/60 rounded p-3 text-xs text-secondary leading-relaxed font-serif italic max-h-24 overflow-y-auto">
                  "{clip.transcript}"
                </div>
              </div>

              {clip.audio_url && (
                <audio src={clip.audio_url.startsWith('http') ? clip.audio_url : `${API}${clip.audio_url}`} controls className="w-full" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENT: Collaboration Memory Wall
// ─────────────────────────────────────────────────────────────────────────────
function CollabWallView({ getHeaders, role }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [content, setContent] = useState('');
  const [type, setType] = useState('note'); // 'note', 'memory', 'photo'
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/collab`, getHeaders())
      .then(res => setItems(res.data))
      .catch(() => toast.error('Failed to load memory wall.'))
      .finally(() => setLoading(false));
  }, [getHeaders]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content) return;
    setIsSubmitting(true);

    try {
      await axios.post(`${API}/api/collab`, { content, type, media_url: mediaUrl }, getHeaders());
      posthog.capture('collaboration_post_created', { post_type: type });
      toast.success('Memory posted to the wall.');
      setContent('');
      setMediaUrl('');
      fetchItems();
    } catch (err) {
      toast.error('Failed to add note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeClass = (itemType) => {
    switch (itemType) {
      case 'photo': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'memory': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-accent/10 text-accent border border-accent/20';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-2xl font-serif font-semibold text-primary">Collaboration Wall</h2>
        <p className="text-xs text-secondary">
          A shared family wall to post notes, photos, and messages, clearly distinguished from the patient's voice clips.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="md:col-span-1 bg-surface/50 border border-border rounded-xl p-5 space-y-4 h-fit">
          <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Share a Memory</h3>

          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Post Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['note', 'memory', 'photo'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-1.5 px-2 rounded border text-xs capitalize text-center font-medium transition-all ${
                    type === t
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-border bg-background text-secondary hover:text-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Content</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'photo' ? 'Describe the photo or occasion...' : 'Share a reflection, note, or thought...'}
              rows={3}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40"
            />
          </div>

          {type === 'photo' && (
            <div>
              <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">Photo Link/URL</label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-1.5 bg-accent text-background font-semibold text-sm py-2.5 rounded hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4 text-background" />
            <span>Post to Wall</span>
          </button>
        </form>

        {/* List of items */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xs font-semibold text-accent uppercase tracking-widest">Shared Memory Wall</h3>

          {loading ? (
            <div className="h-32 flex items-center justify-center text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading posts...
            </div>
          ) : items.length === 0 ? (
            <div className="bg-surface/20 border border-border/40 rounded-xl p-8 text-center text-secondary text-xs">
              No notes or memories posted yet. Write the first memory to display.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {items.map(item => (
                <div key={item.id} className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-semibold text-sm text-primary">{item.author_name}</span>
                      {role === 'narrator' && item.author_id === session?.user?.id ? (
                        <span className="text-[8px] bg-accent/20 text-accent px-1.5 py-0.2 rounded font-semibold">Self</span>
                      ) : null}
                    </div>
                    <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${getBadgeClass(item.type)}`}>
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs text-primary leading-relaxed">{item.content}</p>

                  {item.media_url && (
                    <div className="rounded-lg overflow-hidden border border-border max-h-48 max-w-md bg-surface/50">
                      <img src={item.media_url} alt="Memory Attachment" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="text-[9px] text-secondary flex justify-between">
                    <span>Posted on {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
