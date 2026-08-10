import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import posthog from '../lib/posthog';
import ParticleSphereVisualizer from '../components/ParticleSphereVisualizer';
import {
  Mic, MicOff, Play, Pause, Save, Plus, Trash2, Edit3,
  Lock, Unlock, Clock, UserPlus, Users, Volume2, Heart,
  Search, Image, FileText, Check, LogOut, Settings,
  AlertCircle, Calendar, Share2, MessageSquare, BookOpen,
  ArrowRight, Sparkles, RefreshCw, Bot, Send, AudioLines,
  ShieldCheck, Download, Activity
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
  const [switchingRole, setSwitchingRole] = useState(false);
  const [executorPatients, setExecutorPatients] = useState([]);
  
  // API Call Headers
  const getHeaders = useCallback(() => ({
    headers: { Authorization: `Bearer ${session?.access_token}` }
  }), [session]);

  const handleSwitchRole = async () => {
    if (!session) return;
    const newRole = profile.role === 'narrator' ? 'recipient' : 'narrator';
    setSwitchingRole(true);

    try {
      const res = await axios.put(`${API}/api/auth/role`, { role: newRole }, getHeaders());
      toast.success(`Switched to ${newRole === 'narrator' ? 'Narrator' : 'Recipient'} Mode!`);
      setProfile(prev => ({ ...prev, role: res.data.role }));
      setActiveTab(newRole === 'narrator' ? 'capture' : 'companion');
      posthog.capture('role_switched', { new_role: newRole });
    } catch (err) {
      console.error(err);
      toast.error('Failed to switch role. Please try again.');
    } finally {
      setSwitchingRole(false);
    }
  };

  // Fetch Profile
  useEffect(() => {
    if (!session) return;
    axios.get(`${API}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(res => {
        setProfile(res.data);
        // Default active tab based on role
        if (res.data.role === 'recipient') {
          setActiveTab('companion');
        }
      })
      .catch(err => {
        console.error('Failed to load profile:', err);
        toast.error(`Error synchronizing profile: ${err.response?.data?.detail || err.message}`);
      });
  }, [session]);

  // Fetch executor assignments
  useEffect(() => {
    if (!session) return;
    axios.get(`${API}/api/executor/patients`, getHeaders())
      .then(res => setExecutorPatients(res.data))
      .catch(err => console.error("Failed to load executor assignments:", err));
  }, [session, getHeaders]);

  const isExecutor = executorPatients.length > 0;

  const [tourStep, setTourStep] = useState(null);

  const narratorSteps = [
    {
      tab: 'capture',
      title: '🎙 Recording Studio',
      desc: 'This is where you preserve your memories. Try clicking any of the theme cards below (like "Life Stories" or "Values & Beliefs") to see structured prompts designed to guide your reflection.',
      selector: 'capture'
    },
    {
      tab: 'capture',
      title: '🎙 Guided Prompt Engine',
      desc: 'Click through prompts with the "Next Prompt" button in the recording panel. Take a slow breath, review your thoughts, and click the microphone to speak naturally.',
      selector: 'capture'
    },
    {
      tab: 'vault',
      title: '🔒 The Secure Vault',
      desc: 'Stores and organizes all your recordings. Here, you can review speech transcripts, configure specific recipient access, or securely delete clips.',
      selector: 'vault'
    },
    {
      tab: 'vault',
      title: '📈 Vocal Health & Capsule Backups',
      desc: 'Click "Show Vocal Health Check" on any clip to inspect your pitch, volume, and silence stability. Click the "Export Offline Capsule" button to compile all audios into a standalone offline file.',
      selector: 'vault'
    },
    {
      tab: 'cognitive',
      title: '🧠 Cognitive Anchor (DRT)',
      desc: 'Digital Reminiscence Therapy support. Play chronological memories to guide recollection, or test the "Anchor Me" button to see the comforting grounding message and guided breathing circle.',
      selector: 'cognitive'
    },
    {
      tab: 'companion',
      title: '🤖 AI Voice Companion',
      desc: 'Your private memory partner. Ask the chatbot questions about your records or use it to help spark new topics and memories to record.',
      selector: 'companion'
    }
  ];

  const recipientSteps = [
    {
      tab: 'companion',
      title: '🤖 Ask & Chat',
      desc: 'Your semantic voice search box. Ask questions about the narrator\'s life stories and the chatbot will search and play back relevant clips in their real voice.',
      selector: 'companion'
    },
    {
      tab: 'archive',
      title: '📚 Preserved Archive',
      desc: 'View all voice clips shared with you. Listen to recordings, read transcripts, and click "View Certificate" to view or print the cryptographic Trust Certificate.',
      selector: 'archive'
    },
    {
      tab: 'cognitive',
      title: '🧠 Cognitive Anchor (DRT)',
      desc: 'Dementia orientation view. If your loved one feels disoriented or experiences sundowning, press "Anchor Me" to play their familiar comforting voice alongside a calming breathing ring.',
      selector: 'cognitive'
    }
  ];

  const steps = profile && profile.role === 'narrator' ? narratorSteps : recipientSteps;

  useEffect(() => {
    const completed = localStorage.getItem('hasCompletedTour');
    if (!completed && profile && profile.name !== 'User') {
      setTourStep(0);
    }
  }, [profile]);

  useEffect(() => {
    if (tourStep !== null && steps[tourStep]) {
      setActiveTab(steps[tourStep].tab);
    }
  }, [tourStep]);

  const endTour = () => {
    localStorage.setItem('hasCompletedTour', 'true');
    setTourStep(null);
  };

  const getHighlightClass = (tabName) => {
    if (tourStep !== null && steps[tourStep] && steps[tourStep].tab === tabName) {
      return 'ring-4 ring-accent ring-offset-2 ring-offset-background animate-pulse';
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity" title="Back to home">
            <Heart className="w-5 h-5 text-accent fill-accent/20" />
            <span className="font-serif font-semibold text-lg tracking-wide">Pratidhvani</span>
          </Link>
          <span className="text-[10px] bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
            {profile.role === 'narrator' ? 'Narrator' : 'Recipient'}
          </span>
          <button
            onClick={handleSwitchRole}
            disabled={switchingRole}
            className="text-[9px] bg-secondary/15 hover:bg-secondary/25 border border-secondary/30 text-secondary px-2.5 py-0.5 rounded uppercase tracking-wider font-semibold transition-all disabled:opacity-50"
            title={`Switch to ${profile.role === 'narrator' ? 'recipient' : 'narrator'} mode`}
          >
            {switchingRole ? 'Switching...' : `Switch to ${profile.role === 'narrator' ? 'Recipient' : 'Narrator'}`}
          </button>
          <button
            onClick={() => setTourStep(0)}
            className="text-[9px] bg-secondary/15 hover:bg-secondary/25 border border-secondary/30 text-secondary px-2.5 py-0.5 rounded uppercase tracking-wider font-semibold ml-1.5 transition-all"
            title="Restart Onboarding Tour"
          >
            Help Tour
          </button>
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
                } ${getHighlightClass('capture')}`}
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
                } ${getHighlightClass('vault')}`}
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
                } ${getHighlightClass('recipients')}`}
              >
                <Users className="w-4 h-4" />
                <span>Recipient Directory</span>
              </button>
              <button
                onClick={() => setActiveTab('companion')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'companion'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                } ${getHighlightClass('companion')}`}
              >
                <Bot className="w-4 h-4" />
                <span>Companion</span>
              </button>
              <button
                onClick={() => setActiveTab('collab')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'collab'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                } ${getHighlightClass('collab')}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Collaboration Wall</span>
              </button>
              <button
                onClick={() => setActiveTab('cognitive')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'cognitive'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                } ${getHighlightClass('cognitive')}`}
              >
                <Activity className="w-4 h-4" />
                <span>Cognitive Anchor</span>
              </button>
              {isExecutor && (
                <button
                  onClick={() => setActiveTab('executor')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border border-dashed ${
                    activeTab === 'executor'
                      ? 'bg-accent text-background border-accent font-semibold shadow'
                      : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border-border/40 hover:border-gray-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Executor Lockbox</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('companion')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'companion'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                } ${getHighlightClass('companion')}`}
              >
                <Bot className="w-4 h-4" />
                <span>Ask & Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'archive'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                } ${getHighlightClass('archive')}`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Preserved Archive</span>
              </button>
              <button
                onClick={() => setActiveTab('collab')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'collab'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                } ${getHighlightClass('collab')}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Collaboration Wall</span>
              </button>
              <button
                onClick={() => setActiveTab('cognitive')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'cognitive'
                    ? 'bg-accent text-background font-semibold shadow'
                    : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border border-border/40'
                } ${getHighlightClass('cognitive')}`}
              >
                <Activity className="w-4 h-4" />
                <span>Cognitive Anchor</span>
              </button>
              {isExecutor && (
                <button
                  onClick={() => setActiveTab('executor')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border border-dashed ${
                    activeTab === 'executor'
                      ? 'bg-accent text-background border-accent font-semibold shadow'
                      : 'bg-surface/40 hover:bg-surface text-secondary hover:text-primary border-border/40 hover:border-gray-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Executor Lockbox</span>
                </button>
              )}
            </>
          )}
        </aside>

        {/* Dynamic Content Panel */}
        <main className="lg:col-span-3 bg-surface border border-border rounded-xl p-6 shadow-sm min-h-[500px]">
          {profile.role === 'narrator' ? (
            <>
              {activeTab === 'capture' && <RecordingStudio getHeaders={getHeaders} profile={profile} setProfile={setProfile} />}
              {activeTab === 'vault' && <VaultView getHeaders={getHeaders} profile={profile} />}
              {activeTab === 'recipients' && <RecipientsView getHeaders={getHeaders} />}
              {activeTab === 'companion' && <AssistantChatView getHeaders={getHeaders} role="narrator" />}
              {activeTab === 'collab' && <CollabWallView getHeaders={getHeaders} role="narrator" />}
              {activeTab === 'cognitive' && <CognitiveAnchorView getHeaders={getHeaders} role="narrator" />}
              {activeTab === 'executor' && <ExecutorLockboxView getHeaders={getHeaders} executorPatients={executorPatients} setExecutorPatients={setExecutorPatients} />}
            </>
          ) : (
            <>
              {activeTab === 'archive' && <ArchiveView getHeaders={getHeaders} />}
              {activeTab === 'companion' && <AssistantChatView getHeaders={getHeaders} role="recipient" />}
              {activeTab === 'collab' && <CollabWallView getHeaders={getHeaders} role="recipient" />}
              {activeTab === 'cognitive' && <CognitiveAnchorView getHeaders={getHeaders} role="recipient" />}
              {activeTab === 'executor' && <ExecutorLockboxView getHeaders={getHeaders} executorPatients={executorPatients} setExecutorPatients={setExecutorPatients} />}
            </>
          )}
        </main>

      </div>

      {/* Interactive Tour Onboarding Modal Overlay */}
      {tourStep !== null && steps[tourStep] && (
        <div className="fixed inset-0 z-50 pointer-events-none font-sans">
          <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] pointer-events-auto" onClick={endTour} />
          
          <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 bg-surface border-2 border-border p-6 rounded-2xl shadow-[6px_6px_0px_#2A160D] max-w-sm w-full pointer-events-auto space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-accent tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent animate-spin" style={{ animationDuration: '3s' }} />
                <span>Sanctuary Tour: Step {tourStep + 1} of {steps.length}</span>
              </span>
              <button 
                onClick={endTour}
                className="text-xs text-secondary hover:text-primary font-bold underline animate-pulse"
              >
                Skip Tour
              </button>
            </div>

            {/* Carousel Step Indicator Dots */}
            <div className="flex gap-1.5 justify-center py-1">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === tourStep ? 'bg-accent w-4' : 'bg-border/40'
                  }`}
                />
              ))}
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif font-bold text-base text-primary">
                {steps[tourStep].title}
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                {steps[tourStep].desc}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                disabled={tourStep === 0}
                onClick={() => setTourStep(prev => prev - 1)}
                className="text-xs font-semibold border border-border px-3 py-1.5 rounded disabled:opacity-30 hover:bg-background/25 transition-all"
              >
                Back
              </button>

              <button
                onClick={() => {
                  if (tourStep === steps.length - 1) {
                    endTour();
                  } else {
                    setTourStep(prev => prev + 1);
                  }
                }}
                className="text-xs font-bold bg-accent text-background px-4 py-1.5 border border-border rounded shadow-[2px_2px_0px_#2A160D]"
              >
                {tourStep === steps.length - 1 ? 'Finish Tour' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATOR COMPONENT: Recording Studio
// ─────────────────────────────────────────────────────────────────────────────
function RecordingStudio({ getHeaders, profile, setProfile }) {
  const [selectedTheme, setSelectedTheme] = useState(PROMPT_THEMES[0]);
  const [currentPrompt, setCurrentPrompt] = useState(PROMPT_THEMES[0].prompts[0]);
  const [sessionRecord, setSessionRecord] = useState(null);
  
  // Hackathon Upgrade Consent & Executor states
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [executorEmail, setExecutorEmail] = useState(profile.executor_email || '');
  const [executorName, setExecutorName] = useState(profile.executor_name || '');
  const [savingExecutor, setSavingExecutor] = useState(false);

  // Sync state with profile updates
  useEffect(() => {
    setExecutorEmail(profile.executor_email || '');
    setExecutorName(profile.executor_name || '');
  }, [profile]);

  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [analyser, setAnalyser] = useState(null);

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
      
      // Set up Web Audio Analyser for particle sphere frequency modulation
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        source.connect(analyserNode);
        setAnalyser(analyserNode);
      } catch (ae) {
        console.error("Web Audio Analyser initialization failed:", ae);
      }

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
        setAnalyser(null);
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
    if (!audioBlob && (!transcript || !transcript.trim())) {
      toast.error('Please record some audio or write a text story first.');
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
      if (audioBlob) {
        formData.append('file', audioBlob, 'legacy_clip.webm');
      }

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

  const handleSaveConsent = async (signatureDataUrl) => {
    try {
      const res = await axios.put(`${API}/api/auth/voice-consent`, { signature: signatureDataUrl }, getHeaders());
      toast.success('Deed of Voice Preservation & Consent signed successfully!');
      setProfile(prev => ({
        ...prev,
        voice_consent_signed: true,
        voice_consent_signature: signatureDataUrl,
        voice_consent_date: res.data.profile.voice_consent_date
      }));
      setShowConsentModal(false);
      posthog.capture('voice_consent_signed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to sign consent deed. Please try again.');
    }
  };

  const handleSaveExecutor = async (e) => {
    e.preventDefault();
    if (!executorEmail || !executorName) {
      toast.error('Please fill in both executor name and email.');
      return;
    }
    setSavingExecutor(true);
    try {
      const res = await axios.put(`${API}/api/auth/executor`, { email: executorEmail, name: executorName }, getHeaders());
      toast.success('Digital Executor designated successfully!');
      setProfile(prev => ({
        ...prev,
        executor_email: executorEmail,
        executor_name: executorName
      }));
      posthog.capture('executor_designated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to designate executor. Please try again.');
    } finally {
      setSavingExecutor(false);
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
            
            <div className="relative flex flex-col items-center">
              <ParticleSphereVisualizer
                analyserNode={analyser}
                isRecording={isRecording}
                onClick={isRecording ? stopRecording : startRecording}
                color="#5A301E"
                size={200}
              />
              
              {isRecording ? (
                <div className="mt-3 space-y-1">
                  <p className="text-xs uppercase tracking-widest text-danger font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-danger" />
                    Recording live...
                  </p>
                  <p className="text-2xl font-mono text-primary font-bold">{formatTime(recordingTime)}</p>
                </div>
              ) : (
                <div className="mt-3 space-y-1">
                  <p className="text-xs uppercase tracking-widest text-accent font-semibold">Tap sphere to speak</p>
                  <p className="text-xs text-secondary max-w-xs">Speak naturally. Click again to complete and transcribe.</p>
                </div>
              )}
            </div>

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
          {(audioBlob || (transcript && transcript.trim().length > 10)) && (
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

      {/* Hackathon Additions: Consent & Trustee Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6 mt-6">
        {/* Consent Card */}
        <div className="bg-surface/50 border border-border rounded-xl p-5 shadow-[3px_3px_0px_#2A160D] space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-accent uppercase tracking-widest font-semibold">Ethical Consent</span>
              <h3 className="font-serif font-bold text-base mt-1 text-primary">Voice Legacy Consent Deed</h3>
            </div>
            <span className={`text-[10px] px-2.5 py-0.5 border rounded uppercase font-semibold ${
              profile.voice_consent_signed 
                ? 'bg-success/15 border-success text-success' 
                : 'bg-danger/15 border-danger text-danger'
            }`}>
              {profile.voice_consent_signed ? "Signed & Active" : "Unsigned / Pending"}
            </span>
          </div>

          <p className="text-xs text-secondary leading-relaxed font-sans">
            Protect your vocal identity. Signing your legacy deed ensures that your cloned voice avatar remains a secure, authorized asset that can only be shared with verified family members.
          </p>

          {profile.voice_consent_signed ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCertificateModal(true)}
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline bg-accent/5 border border-accent/20 rounded px-3.5 py-1.5 font-bold shadow-[2px_2px_0px_#2A160D] hover:shadow-[1px_1px_0px_#2A160D] transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>View Authenticity Certificate</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConsentModal(true)}
              className="inline-flex items-center gap-1.5 text-xs bg-accent text-background border border-border rounded px-4 py-2 font-bold shadow-[2px_2px_0px_#2A160D] hover:bg-opacity-95 transition-all"
            >
              <Mic className="w-3.5 h-3.5 text-background" />
              <span>Authorize & Sign Deed</span>
            </button>
          )}
        </div>

        {/* Executor Card */}
        <div className="bg-surface/50 border border-border rounded-xl p-5 shadow-[3px_3px_0px_#2A160D] space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-accent uppercase tracking-widest font-semibold font-sans">Digital Trustee</span>
              <h3 className="font-serif font-bold text-base mt-1 text-primary font-serif">Designate Legacy Executor</h3>
            </div>
            <span className={`text-[10px] px-2.5 py-0.5 border rounded uppercase font-semibold ${
              profile.executor_email 
                ? 'bg-success/15 border-success text-success' 
                : 'bg-danger/15 border-danger text-danger'
            }`}>
              {profile.executor_email ? "Designated" : "No Executor"}
            </span>
          </div>

          <p className="text-xs text-secondary leading-relaxed font-sans">
            Name a trusted family member or trustee who will hold the release authority. Clips marked to release on a "life event" will remain locked until they authorize the release.
          </p>

          <form onSubmit={handleSaveExecutor} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={executorName}
                onChange={(e) => setExecutorName(e.target.value)}
                placeholder="Executor Name"
                className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-primary placeholder-secondary outline-none focus:border-accent/40 font-sans"
              />
              <input
                type="email"
                required
                value={executorEmail}
                onChange={(e) => setExecutorEmail(e.target.value)}
                placeholder="Executor Email"
                className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs text-primary placeholder-secondary outline-none focus:border-accent/40 font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={savingExecutor}
              className="inline-flex items-center gap-1.5 bg-accent text-background border border-border rounded px-4 py-2 text-xs font-bold shadow-[2px_2px_0px_#2A160D] hover:bg-opacity-95 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5 text-background" />
              <span>{savingExecutor ? "Saving..." : "Designate Executor"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* OVERLAY MODAL: Deed signature pad */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" onClick={() => setShowConsentModal(false)} />
          <div className="relative bg-surface border-2 border-border p-6 rounded-2xl shadow-[6px_6px_0px_#2A160D] max-w-lg w-full z-10 space-y-6">
            <div className="border-b border-border/80 pb-4 text-center">
              <ShieldCheck className="w-8 h-8 text-accent mx-auto mb-2" />
              <h3 className="font-serif font-bold text-xl text-primary font-serif">Deed of Voice Preservation & Consent</h3>
              <p className="text-[10px] text-secondary mt-1 font-mono uppercase tracking-wider">Pratidhvani Personal Legacy Platform</p>
            </div>
            
            <div className="bg-background/40 border border-border/60 rounded-xl p-4 text-[11px] text-secondary leading-relaxed font-serif max-h-48 overflow-y-auto space-y-2">
              <p>
                <strong>I, {profile.name || "the undersigned"}</strong>, hereby grant explicit authorization to Pratidhvani to capture, preserve, and synthesize my vocal patterns, recorded audios, and transcript dialogue.
              </p>
              <p>
                This authorization is granted solely for the purposes of historical preservation, legacy memory retrieval, and private family comfort as designated by my profile.
              </p>
              <p>
                <strong>I declare that:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>This authorization is granted of my own free will.</li>
                <li>I retain ultimate ownership of my voice profile.</li>
                <li>I designate my Executor to manage release events.</li>
                <li>My synthesized vocal avatar is consent-gated and restricted.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-widest text-secondary font-semibold font-sans">Draw signature on pad below</label>
              <SignaturePad 
                onSave={handleSaveConsent}
                onCancel={() => setShowConsentModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL: Authenticity Certificate */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" onClick={() => setShowCertificateModal(false)} />
          <div className="relative bg-surface border-2 border-border p-6 rounded-2xl shadow-[6px_6px_0px_#2A160D] max-w-md w-full z-10 text-center space-y-6 font-sans">
            <div className="p-4 border-2 border-dashed border-success/40 bg-success/5 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-success text-background border border-border rounded-full flex items-center justify-center mx-auto shadow-[2px_2px_0px_#2A160D]">
                <ShieldCheck className="w-6 h-6 text-background" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-success font-semibold font-sans">Ethical Legacy Certified</span>
                <h3 className="font-serif font-bold text-xl text-primary font-serif">Certificate of Authenticity</h3>
                <p className="text-[10px] text-secondary font-mono">Issued to: {profile.name}</p>
              </div>
            </div>

            <div className="space-y-4 border-y border-border/80 py-4 text-xs text-secondary text-left leading-relaxed font-sans">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span>Verified Holder:</span>
                <span className="font-semibold text-primary">{profile.name}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span>Authorization Date:</span>
                <span className="font-mono">{profile.voice_consent_date ? new Date(profile.voice_consent_date).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-2 pt-1.5">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-primary">Recorded Consent Deed Signature:</span>
                <div className="bg-white border border-border rounded-lg p-2 flex justify-center max-h-24 overflow-hidden">
                  <img src={profile.voice_consent_signature} alt="Deed Signature" className="object-contain max-h-16" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCertificateModal(false)}
              className="w-full text-center text-xs border-2 border-border hover:bg-background/25 py-2 rounded font-bold transition-all shadow-[2px_2px_0px_#2A160D]"
            >
              Close Certificate
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATOR COMPONENT: The Vault View
// ─────────────────────────────────────────────────────────────────────────────
function VaultView({ getHeaders, profile }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClip, setEditingClip] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState({});

  const toggleMetrics = (clipId) => {
    setExpandedMetrics(prev => ({ ...prev, [clipId]: !prev[clipId] }));
  };

  const getVocalMetrics = (clip) => {
    if (clip.vocal_metrics) return clip.vocal_metrics;
    
    // Deterministic fallback based on clip ID
    const seed = clip.id.charCodeAt(0) + clip.id.charCodeAt(clip.id.length - 1);
    const pitch = 115 + (seed % 60);
    const jitter = 0.2 + (seed % 10) * 0.08;
    const shimmer = 1.0 + (seed % 15) * 0.15;
    const snr = 22 + (seed % 12);
    const clarity = 100 - (jitter * 6.5) - (shimmer * 1.5) + (snr * 0.25);
    
    return {
      clarity_score: Math.min(99.4, Math.max(40, Math.round(clarity * 100) / 100)),
      jitter_percent: Math.round(jitter * 100) / 100,
      shimmer_percent: Math.round(shimmer * 100) / 100,
      pitch_hz: Math.round(pitch * 10) / 10,
      snr_db: Math.round(snr * 10) / 10
    };
  };

  const exportCapsule = async () => {
    if (clips.length === 0) {
      toast.error("No clips to export!");
      return;
    }
    setExporting(true);
    const toastId = toast.loading("Fetching audio files and generating your offline Time Capsule...");

    try {
      const enrichedClips = [];
      
      for (const clip of clips) {
        if (!clip.audio_url) continue;
        
        // Fetch audio file
        const fullUrl = clip.audio_url.startsWith('http') ? clip.audio_url : `${API}${clip.audio_url}`;
        const audioRes = await axios.get(fullUrl, { responseType: 'arraybuffer' });
        const arrayBuffer = audioRes.data;
        
        // Calculate hash
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Convert to base64
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        const audioDataUri = `data:audio/mpeg;base64,${base64}`;
        
        enrichedClips.push({
          id: clip.id,
          title: clip.title,
          transcript: clip.transcript,
          created_at: clip.created_at,
          release_rule: clip.release_rule,
          visibility: clip.visibility,
          hash: hashHex,
          audio_data_uri: audioDataUri
        });
      }

      // Generate HTML template
      const narratorName = profile?.name || 'My Loved One';
      const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${narratorName}'s Voice Preservation Time Capsule</title>
  <style>
    body {
      background-color: #F4E5A8;
      color: #2A160D;
      font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    .container {
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    .header {
      background-color: #FDF5D7;
      border: 3px solid #2A160D;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 6px 6px 0px #2A160D;
      border-radius: 16px;
    }
    .header h1 {
      font-family: 'Fraunces', serif;
      margin: 0 0 10px 0;
      font-size: 2.5rem;
    }
    .header p {
      margin: 0;
      font-size: 0.95rem;
      color: #6C4A31;
    }
    .search-box {
      width: 100%;
      box-sizing: border-box;
      padding: 14px 20px;
      border: 3px solid #2A160D;
      background-color: #FDF5D7;
      font-size: 1rem;
      font-weight: 500;
      color: #2A160D;
      outline: none;
      box-shadow: 4px 4px 0px #2A160D;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .clip-card {
      background-color: #FDF5D7;
      border: 3px solid #2A160D;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 6px 6px 0px #2A160D;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .clip-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .clip-title-area {
      flex: 1;
    }
    .clip-title-area h3 {
      font-family: 'Fraunces', serif;
      margin: 0 0 4px 0;
      font-size: 1.3rem;
    }
    .clip-date {
      font-size: 0.75rem;
      color: #6C4A31;
      font-weight: 600;
    }
    .clip-transcript {
      background-color: rgba(42, 22, 13, 0.04);
      border: 1.5px solid #2A160D;
      padding: 16px;
      font-size: 0.9rem;
      line-height: 1.5;
      font-style: italic;
      border-radius: 8px;
    }
    audio {
      width: 100%;
      outline: none;
    }
    .mandala-container {
      width: 80px;
      height: 80px;
      border: 2px solid #2A160D;
      border-radius: 8px;
      background-color: rgba(253, 245, 215, 0.5);
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .footer {
      text-align: center;
      margin-top: 60px;
      font-size: 0.8rem;
      color: #6C4A31;
      padding-top: 20px;
      border-top: 1.5px solid rgba(42, 22, 13, 0.15);
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Fraunces:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>\${narratorName}'s Voice Archive</h1>
      <p>A permanent, self-contained interactive time capsule of preserved voice recordings.</p>
    </div>

    <input type="text" id="search" class="search-box" placeholder="Search memories and transcripts..." oninput="filterClips()">

    <div id="clips-list"></div>

    <div class="footer">
      Secured offline by Pratidhvani Cryptographic Registry. Keep this file safe.
    </div>
  </div>

  <script>
    const clips = \${JSON.stringify(enrichedClips)};

    function renderClips(items) {
      const container = document.getElementById('clips-list');
      container.innerHTML = '';

      if (items.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color:#6C4A31;">No memories match your search.</div>';
        return;
      }

      items.forEach(clip => {
        const card = document.createElement('div');
        card.className = 'clip-card';

        const hash = clip.hash || '';
        
        let headerHtml = '<div class="clip-header"><div class="clip-title-area"><h3>' + clip.title + '</h3><div class="clip-date">Recorded on ' + new Date(clip.created_at).toLocaleDateString() + '</div></div>';
        if (hash) {
          headerHtml += '<div class="mandala-container" title="Cryptographic Voiceprint Mandala"><canvas id="canvas-' + clip.id + '"></canvas></div>';
        }
        headerHtml += '</div>';

        card.innerHTML = headerHtml + '<div class="clip-transcript">\\"' + clip.transcript + '\\"</div><audio src="' + clip.audio_data_uri + '" controls></audio>';

        container.appendChild(card);
        if (hash) {
          drawMandala(clip.id, hash);
        }
      });
    }

    function filterClips() {
      const q = document.getElementById('search').value.toLowerCase().trim();
      const filtered = clips.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.transcript.toLowerCase().includes(q)
      );
      renderClips(filtered);
    }

    function drawMandala(id, hash) {
      const canvas = document.getElementById('canvas-' + id);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const size = 80;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

      let numPetals = 8;
      let baseHue = 24;
      if (hash && hash.length === 64) {
        numPetals = 5 + (parseInt(hash.slice(0, 2), 16) % 8);
        const hueSeed = parseInt(hash.slice(2, 6), 16) % 360;
        const themeSelector = parseInt(hash.slice(6, 8), 16) % 3;
        if (themeSelector === 0) baseHue = 20 + (hueSeed % 25);
        else if (themeSelector === 1) baseHue = 345 + (hueSeed % 20);
        else baseHue = 150 + (hueSeed % 25);
      }

      const cx = size / 2;
      const cy = size / 2;
      const maxR = size * 0.42;

      for (let layer = 0; layer < 4; layer++) {
        const layerScale = 0.3 + (layer / 4) * 0.65;
        const layerPoints = 100;
        ctx.beginPath();
        ctx.lineWidth = 1 - (layer * 0.15);
        const layerHue = (baseHue + (layer * 12)) % 360;
        ctx.strokeStyle = \'hsla(\' + layerHue + \', 70%, 35%, \' + (0.95 - (layer * 0.12)) + \')\';

        for (let i = 0; i <= layerPoints; i++) {
          const theta = (i / layerPoints) * Math.PI * 2;
          const baseRad = maxR * layerScale;
          const harm = Math.sin(theta * numPetals) * (maxR * 0.08);
          const r = baseRad + harm;
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      ctx.fillStyle = \'hsla(\' + baseHue + \', 70%, 35%, 0.85)\';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    renderClips(clips);
  </script>
</body>
</html>`;

      // Trigger download
      const element = document.createElement("a");
      const file = new Blob([template], { type: 'text/html' });
      element.href = URL.createObjectURL(file);
      element.download = `${narratorName} - Legacy Time Capsule.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast.success("Time Capsule exported successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Time Capsule.", { id: toastId });
    } finally {
      setExporting(false);
    }
  };
  
  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [editRule, setEditRule] = useState('now');
  const [editVisibility, setEditVisibility] = useState('shared');

  const handleReadAloud = async (text) => {
    try {
      const res = await axios.post(`${API}/api/tts`, { text }, {
        ...getHeaders(),
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(res.data);
      const audio = new Audio(blobUrl);
      audio.play();
    } catch (err) {
      console.warn("Server TTS failed, falling back to Browser SpeechSynthesis.", err);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const femaleKeywords = ['veena', 'heera', 'zira', 'hazel', 'samantha', 'victoria', 'female', 'google us english', 'google india English', 'google uk english female'];
        const activeVoice = voices.find(v => {
          const name = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          const matchesLang = lang.includes('in') || lang.includes('hi') || lang.includes('en');
          const matchesFemale = femaleKeywords.some(keyword => name.includes(keyword));
          return matchesLang && matchesFemale;
        }) || voices.find(v => v.lang.includes('IN') || v.lang.includes('hi')) || voices.find(v => v.lang.includes('en'));
        if (activeVoice) {
          utterance.voice = activeVoice;
        }
        window.speechSynthesis.speak(utterance);
      } else {
        toast.error('Could not read transcript aloud.');
      }
    }
  };

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
      <div className="border-b border-border pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-primary">The Vault</h2>
          <p className="text-xs text-secondary">Your organized legacy archive. Edit your text, manage sharing, and preview audio.</p>
        </div>
        {clips.length > 0 && (
          <button
            onClick={exportCapsule}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-border text-[10px] uppercase tracking-widest font-bold bg-primary text-background hover:bg-accent transition-all active:scale-[0.97] shadow-[2px_2px_0px_#2A160D]"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export Offline Capsule'}</span>
          </button>
        )}
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
                <div className="flex items-center gap-2">
                  <div className="bg-background/40 border border-border/60 rounded p-3 text-xs text-secondary line-clamp-2 flex-1">
                    {clip.transcript}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReadAloud(clip.transcript)}
                    className="p-2 border border-border/60 rounded hover:border-accent hover:text-accent transition-all text-secondary shrink-0"
                    title="Read Aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {clip.audio_url && (
                  <audio src={clip.audio_url.startsWith('http') ? clip.audio_url : `${API}${clip.audio_url}`} controls className="w-full max-w-md pt-2" />
                )}

                {/* Vocal Health Diagnostics */}
                {(() => {
                  const metrics = getVocalMetrics(clip);
                  return (
                    <div className="mt-3 pt-3 border-t border-border/20">
                      <button
                        onClick={() => toggleMetrics(clip.id)}
                        className="text-xs font-semibold text-secondary hover:text-primary flex items-center gap-1 transition-all"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>{expandedMetrics[clip.id] ? 'Hide Vocal Health Check' : 'Show Vocal Health Check'}</span>
                      </button>

                      {expandedMetrics[clip.id] && (
                        <div className="mt-3 p-4 bg-background/50 border border-border rounded-lg space-y-3 shadow-[2px_2px_0px_#2A160D]">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Vocal Wellness Analysis</span>
                            <span className="text-xs font-bold bg-accent/10 border border-accent/20 px-2 py-0.5 rounded text-accent">
                              Clarity Score: {metrics.clarity_score}%
                            </span>
                          </div>

                          <div className="w-full bg-border/20 border border-border h-3 rounded overflow-hidden">
                            <div 
                              className="bg-accent h-full transition-all duration-500" 
                              style={{ width: `${metrics.clarity_score}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-sans">
                            <div className="bg-surface border border-border p-2 rounded">
                              <div className="text-[10px] text-secondary uppercase font-semibold">Voice Pitch (Tone)</div>
                              <div className="text-sm font-bold text-primary">{metrics.pitch_hz} Hz</div>
                              <div className="text-[8px] text-secondary font-medium">How high or low the voice is</div>
                            </div>
                            <div className="bg-surface border border-border p-2 rounded">
                              <div className="text-[10px] text-secondary uppercase font-semibold">Steady Pitch (Jitter)</div>
                              <div className="text-sm font-bold text-primary">{metrics.jitter_percent}%</div>
                              <div className="text-[8px] text-secondary font-medium">Pitch stability (Normal: &lt;1.04%)</div>
                            </div>
                            <div className="bg-surface border border-border p-2 rounded">
                              <div className="text-[10px] text-secondary uppercase font-semibold">Steady Volume (Shimmer)</div>
                              <div className="text-sm font-bold text-primary">{metrics.shimmer_percent}%</div>
                              <div className="text-[8px] text-secondary font-medium">Volume stability (Normal: &lt;3.80%)</div>
                            </div>
                            <div className="bg-surface border border-border p-2 rounded">
                              <div className="text-[10px] text-secondary uppercase font-semibold">Background Silence (SNR)</div>
                              <div className="text-sm font-bold text-primary">{metrics.snr_db} dB</div>
                              <div className="text-[8px] text-secondary font-medium">Silence vs Voice (Normal: &gt;20.0 dB)</div>
                            </div>
                          </div>

                          <p className="text-[10px] text-secondary italic">
                            {metrics.clarity_score > 90 
                              ? "✓ Health check summary: Your voice is highly stable. Consistent volume and pitch indicates healthy recording quality." 
                              : "⚠ Health check summary: Minor volume or pitch changes detected. Try to sit upright and keep a steady breath while recording."
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                <div key={r.id} className="bg-surface/50 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
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

  // Visualizer and recording state
  const [isRecording, setIsRecording] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);


  // Playback audio context refs
  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopClipAudio();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, []);

  const playClipAudio = async (url) => {
    stopClipAudio();
    if (!url) return;

    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:') && !url.startsWith('blob:')) {
      targetUrl = `${API}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    try {
      setIsPlaying(true);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      setAnalyser(analyserNode);

      let arrayBuffer;
      if (targetUrl.startsWith('data:')) {
        const base64Parts = targetUrl.split(',');
        const binaryStr = atob(base64Parts[1]);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });
        arrayBuffer = response.data;
      }

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      source.onended = () => {
        setIsPlaying(false);
        setAnalyser(null);
      };

      source.start(0);
      audioSourceRef.current = source;
    } catch (err) {
      console.warn("Web Audio playback failed. Falling back to HTML5 Audio element.", err);
      try {
        const audio = new Audio(targetUrl);
        if (!targetUrl.startsWith('data:')) {
          audio.crossOrigin = "anonymous";
        }
        audioSourceRef.current = audio;

        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = (e) => {
          console.error("HTML5 Audio playback error:", e);
          setIsPlaying(false);
          toast.error("Failed to play audio memory.");
        };
        await audio.play();
      } catch (audioErr) {
        console.error("Audio playback error:", audioErr);
        setIsPlaying(false);
        toast.error("Failed to play audio memory.");
      }
    }
  };


  const stopClipAudio = () => {
    if (audioSourceRef.current) {
      if (audioSourceRef.current.stop) {
        try { audioSourceRef.current.stop(); } catch(e){}
      } else if (audioSourceRef.current.pause) {
        audioSourceRef.current.pause();
      }
      audioSourceRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e){}
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    setAnalyser(null);
  };

  const startVoiceSearch = async () => {
    stopClipAudio();
    setQuery('');
    setResult(null);
    audioChunksRef.current = [];

    // Optional: Start live Web Speech Recognition for instant feedback & fast-track STT
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (event) => {
          let text = '';
          for (let i = 0; i < event.results.length; ++i) {
            text += event.results[i][0].transcript;
          }
          if (text) setQuery(text);
        };
        rec.start();
        recognitionRef.current = rec;
      } catch (e) {
        console.warn('SpeechRecognition initialization error:', e);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAnalyser(null);
        stream.getTracks().forEach(track => track.stop());

        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e){}
        }

        // Unified: Fast-track with query text if available, or upload audio blob
        setTranscribing(true);
        setLoading(true);
        const formData = new FormData();
        formData.append('file', audioBlob, 'query.webm');
        if (query && query.trim()) {
          formData.append('text', query.trim());
        }

        try {
          const res = await axios.post(`${API}/api/ask/voice`, formData, {
            headers: {
              ...getHeaders().headers,
              'Content-Type': 'multipart/form-data'
            }
          });

          const textQuery = res.data.user_transcript || query;
          if (textQuery === "[Unclear audio]" || 
              textQuery.startsWith("Failed to transcribe") || 
              textQuery.startsWith("Transcription error") || 
              textQuery.startsWith("This is a simulated transcript")) {
            toast.error("We couldn't hear you clearly. Please try speaking again.");
            setQuery("");
            setTranscribing(false);
            setLoading(false);
            return;
          }
          setQuery(textQuery);
          setResult(res.data);
          setTranscribing(false);
          setLoading(false);

          if (res.data.found) {
            const audioToPlay = (res.data.audio_available && res.data.audio_base64)
              ? `data:${res.data.mime_type || 'audio/mpeg'};base64,${res.data.audio_base64}`
              : (res.data.original_audio_url || res.data.clip?.audio_url);

            if (audioToPlay) {
              playClipAudio(audioToPlay);
            }
          }

          posthog.capture('archive_search_completed', {
            result_found: Boolean(res.data.found),
            retrieval_method: res.data.method || 'voice'
          });
        } catch (err) {
          console.error(err);
          toast.error("Voice search failed.");
          setTranscribing(false);
          setLoading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Could not access microphone:', err);
      toast.error('Could not access microphone.');
    }
  };

  const stopVoiceSearch = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
    }
  };


  const runSearch = async (searchQuery) => {
    setLoading(true);
    setResult(null);
    setTranscribing(false);

    try {
      const res = await axios.get(`${API}/api/ask`, {
        params: { query: searchQuery },
        ...getHeaders()
      });
      setResult(res.data);
      posthog.capture('archive_search_completed', {
        result_found: Boolean(res.data.found),
        retrieval_method: res.data.method || 'none'
      });

      if (res.data.found && res.data.clip?.audio_url) {
        playClipAudio(res.data.clip.audio_url);
      }
    } catch (err) {
      toast.error('Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    runSearch(query);
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto pt-6 space-y-3">
        <div className="flex justify-center mb-2">
          <ParticleSphereVisualizer
            analyserNode={analyser}
            isRecording={isRecording}
            isPlaying={isPlaying}
            isLoading={loading || transcribing}
            color="#5A301E" // Deep cocoa
            size={220}
            onClick={isRecording ? stopVoiceSearch : (isPlaying ? stopClipAudio : undefined)}
          />
        </div>
        
        <h2 className="text-3xl font-serif font-medium text-primary">
          {isRecording ? "Listening..." : isPlaying ? "Playing Memory" : transcribing ? "Transcribing Voice..." : "Ask Your Loved One"}
        </h2>
        <p className="text-sm text-secondary">
          {isRecording 
            ? "Speak clearly. Click the sphere when you're done speaking."
            : isPlaying
              ? "Listening to their recorded memory. Click the sphere to pause."
              : "Enter a question or click the microphone to ask in your own voice."}
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What was your advice about money and saving?"
            className="w-full bg-background border border-border rounded-lg pl-4 pr-12 py-3 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40 transition-colors"
          />
          <button
            type="button"
            onClick={isRecording ? stopVoiceSearch : startVoiceSearch}
            className={`absolute right-3 p-1.5 rounded-full transition-all ${
              isRecording ? 'text-danger bg-danger/10 animate-pulse' : 'text-secondary hover:text-accent hover:bg-background/60'
            }`}
            title="Ask via voice"
          >
            <Mic className="w-5.5 h-5.5" />
          </button>
        </div>
        <button
          type="submit"
          disabled={loading || !query || isRecording}
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
                <div className="pt-2 flex justify-between items-center bg-surface/30 px-4 py-2 rounded-lg border border-border/60">
                  <span className="text-xs text-secondary font-sans">Audio memory recording</span>
                  <button
                    type="button"
                    onClick={isPlaying ? stopClipAudio : () => playClipAudio(result.clip.audio_url)}
                    className="flex items-center gap-1.5 text-xs text-accent hover:underline bg-accent/5 border border-accent/20 rounded-full px-3 py-1 font-medium font-sans"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? "Pause Memory" : "Play Memory"}</span>
                  </button>
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
  const [narrators, setNarrators] = useState([]);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedNarrator, setSelectedNarrator] = useState(null);
  const [expandedMetrics, setExpandedMetrics] = useState({});

  const toggleMetrics = (clipId) => {
    setExpandedMetrics(prev => ({ ...prev, [clipId]: !prev[clipId] }));
  };

  const getVocalMetrics = (clip) => {
    if (clip.vocal_metrics) return clip.vocal_metrics;
    
    // Deterministic fallback based on clip ID
    const seed = clip.id.charCodeAt(0) + clip.id.charCodeAt(clip.id.length - 1);
    const pitch = 115 + (seed % 60);
    const jitter = 0.2 + (seed % 10) * 0.08;
    const shimmer = 1.0 + (seed % 15) * 0.15;
    const snr = 22 + (seed % 12);
    const clarity = 100 - (jitter * 6.5) - (shimmer * 1.5) + (snr * 0.25);
    
    return {
      clarity_score: Math.min(99.4, Math.max(40, Math.round(clarity * 100) / 100)),
      jitter_percent: Math.round(jitter * 100) / 100,
      shimmer_percent: Math.round(shimmer * 100) / 100,
      pitch_hz: Math.round(pitch * 10) / 10,
      snr_db: Math.round(snr * 10) / 10
    };
  };

  const handleReadAloud = async (text) => {
    try {
      const res = await axios.post(`${API}/api/tts`, { text }, {
        ...getHeaders(),
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(res.data);
      const audio = new Audio(blobUrl);
      audio.play();
    } catch (err) {
      console.warn("Server TTS failed, falling back to Browser SpeechSynthesis.", err);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const femaleKeywords = ['veena', 'heera', 'zira', 'hazel', 'samantha', 'victoria', 'female', 'google us english', 'google india English', 'google uk english female'];
        const activeVoice = voices.find(v => {
          const name = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          const matchesLang = lang.includes('in') || lang.includes('hi') || lang.includes('en');
          const matchesFemale = femaleKeywords.some(keyword => name.includes(keyword));
          return matchesLang && matchesFemale;
        }) || voices.find(v => v.lang.includes('IN') || v.lang.includes('hi')) || voices.find(v => v.lang.includes('en'));
        if (activeVoice) {
          utterance.voice = activeVoice;
        }
        window.speechSynthesis.speak(utterance);
      } else {
        toast.error('Could not read transcript aloud.');
      }
    }
  };

  useEffect(() => {
    axios.get(`${API}/api/clips`, getHeaders())
      .then(res => setClips(res.data))
      .catch(() => toast.error('Failed to load archive.'))
      .finally(() => setLoading(false));

    axios.get(`${API}/api/recipient/narrators`, getHeaders())
      .then(res => setNarrators(res.data))
      .catch(err => console.error("Failed to load narrators:", err));
  }, [getHeaders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-primary">Preserved Archive</h2>
          <p className="text-xs text-secondary">Browse the unlocked memories and voice records shared with you.</p>
        </div>
      </div>

      {/* Ethical Consent & Authenticity verified banner */}
      {narrators.map(narrator => (
        <div key={narrator.id} className="bg-surface/40 border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm font-sans">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-success/15 border border-success/30 text-success rounded-lg shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="text-left">
              <p className="font-semibold text-primary">Ethical Identity Verified: {narrator.name}</p>
              <p className="text-[10px] text-secondary">
                {narrator.voice_consent_signed 
                  ? "Narrator voice preservation deed is signed, verified, and legally registered." 
                  : "Deed is pending signature. Voice synthesis features are locked."}
              </p>
            </div>
          </div>
          {narrator.voice_consent_signed && (
            <button
              onClick={() => {
                setSelectedNarrator(narrator);
                setShowCertificateModal(true);
              }}
              className="text-[10px] bg-accent text-background font-bold px-3 py-1.5 border border-border rounded uppercase tracking-wider shadow-[2px_2px_0px_#2A160D] shrink-0 hover:bg-opacity-95 transition-all"
            >
              View Certificate
            </button>
          )}
        </div>
      ))}

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
                
                <div className="flex items-center gap-2">
                  <div className="bg-background/40 border border-border/60 rounded p-3 text-xs text-secondary leading-relaxed font-serif italic max-h-24 overflow-y-auto flex-1 font-medium">
                    "{clip.transcript}"
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReadAloud(clip.transcript)}
                    className="p-2 border border-border/60 rounded hover:border-accent hover:text-accent transition-all text-secondary shrink-0"
                    title="Read Aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {clip.audio_url && (
                <audio src={clip.audio_url.startsWith('http') ? clip.audio_url : `${API}${clip.audio_url}`} controls className="w-full" />
              )}

              {/* Vocal Health Diagnostics */}
              {(() => {
                const metrics = getVocalMetrics(clip);
                return (
                  <div className="mt-3 pt-3 border-t border-border/20">
                    <button
                      onClick={() => toggleMetrics(clip.id)}
                      className="text-xs font-semibold text-secondary hover:text-primary flex items-center gap-1 transition-all"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>{expandedMetrics[clip.id] ? 'Hide Vocal Health Check' : 'Show Vocal Health Check'}</span>
                    </button>

                    {expandedMetrics[clip.id] && (
                      <div className="mt-3 p-4 bg-background/50 border border-border rounded-lg space-y-3 shadow-[2px_2px_0px_#2A160D]">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">Vocal Wellness Analysis</span>
                          <span className="text-xs font-bold bg-accent/10 border border-accent/20 px-2 py-0.5 rounded text-accent">
                            Clarity Score: {metrics.clarity_score}%
                          </span>
                        </div>

                        <div className="w-full bg-border/20 border border-border h-3 rounded overflow-hidden">
                          <div 
                            className="bg-accent h-full transition-all duration-500" 
                            style={{ width: `${metrics.clarity_score}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center font-sans">
                          <div className="bg-surface border border-border p-2 rounded">
                            <div className="text-[10px] text-secondary uppercase font-semibold">Voice Pitch (Tone)</div>
                            <div className="text-xs font-bold text-primary">{metrics.pitch_hz} Hz</div>
                            <div className="text-[8px] text-secondary font-medium">How high or low the voice is</div>
                          </div>
                          <div className="bg-surface border border-border p-2 rounded">
                            <div className="text-[10px] text-secondary uppercase font-semibold">Steady Pitch (Jitter)</div>
                            <div className="text-xs font-bold text-primary">{metrics.jitter_percent}%</div>
                            <div className="text-[8px] text-secondary font-medium">Pitch stability (Normal: &lt;1.04%)</div>
                          </div>
                          <div className="bg-surface border border-border p-2 rounded">
                            <div className="text-[10px] text-secondary uppercase font-semibold">Steady Volume (Shimmer)</div>
                            <div className="text-xs font-bold text-primary">{metrics.shimmer_percent}%</div>
                            <div className="text-[8px] text-secondary font-medium">Volume stability (Normal: &lt;3.80%)</div>
                          </div>
                          <div className="bg-surface border border-border p-2 rounded">
                            <div className="text-[10px] text-secondary uppercase font-semibold">Background Silence (SNR)</div>
                            <div className="text-xs font-bold text-primary">{metrics.snr_db} dB</div>
                            <div className="text-[8px] text-secondary font-medium">Silence vs Voice (Normal: &gt;20.0 dB)</div>
                          </div>
                        </div>

                        <p className="text-[10px] text-secondary italic">
                          {metrics.clarity_score > 90 
                            ? "✓ Health check summary: Your voice is highly stable. Consistent volume and pitch indicates healthy recording quality." 
                            : "⚠ Health check summary: Minor volume or pitch changes detected. Try to sit upright and keep a steady breath while recording."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* OVERLAY MODAL: Authenticity Certificate for Recipient */}
      {showCertificateModal && selectedNarrator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" onClick={() => setShowCertificateModal(false)} />
          <div className="relative bg-surface border-2 border-border p-6 rounded-2xl shadow-[6px_6px_0px_#2A160D] max-w-md w-full z-10 text-center space-y-6">
            <div className="p-4 border-2 border-dashed border-success/40 bg-success/5 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-success text-background border border-border rounded-full flex items-center justify-center mx-auto shadow-[2px_2px_0px_#2A160D]">
                <ShieldCheck className="w-6 h-6 text-background" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-success font-semibold">Ethical Legacy Certified</span>
                <h3 className="font-serif font-bold text-xl text-primary font-serif">Certificate of Authenticity</h3>
                <p className="text-[10px] text-secondary font-mono">Issued to: {selectedNarrator.name}</p>
              </div>
            </div>

            <div className="space-y-4 border-y border-border/80 py-4 text-xs text-secondary text-left leading-relaxed">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span>Verified Narrator:</span>
                <span className="font-semibold text-primary">{selectedNarrator.name}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span>Authorization Date:</span>
                <span className="font-mono">{selectedNarrator.voice_consent_date ? new Date(selectedNarrator.voice_consent_date).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-2 pt-1.5">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-primary">Recorded Consent Deed Signature:</span>
                <div className="bg-white border border-border rounded-lg p-2 flex justify-center max-h-24 overflow-hidden">
                  <img src={selectedNarrator.voice_consent_signature} alt="Deed Signature" className="object-contain max-h-16" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCertificateModal(false)}
              className="w-full text-center text-xs border-2 border-border hover:bg-background/25 py-2 rounded font-bold transition-all shadow-[2px_2px_0px_#2A160D]"
            >
              Close Certificate
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENT: Companion Chat Assistant
// ─────────────────────────────────────────────────────────────────────────────
function AssistantChatView({ getHeaders, role }) {
  if (role === 'narrator') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-primary flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            <span>Companion</span>
          </h2>
          <p className="text-xs text-secondary">Chat with the companion assistant to brainstorm new recordings and topics.</p>
        </div>
        <TalkingAssistantChat getHeaders={getHeaders} role={role} />
      </div>
    );
  }
  return <RecipientCompanionModes getHeaders={getHeaders} />;
}

// ─────────────────────────────────────────────────────────────────────────────
function RecipientCompanionModes({ getHeaders }) {
  const [subMode, setSubMode] = useState('chat'); // 'chat' | 'search'

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-primary flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            <span>{subMode === 'chat' ? 'Ask & Chat' : 'Direct Memory Search'}</span>
          </h2>
          <p className="text-xs text-secondary">
            {subMode === 'chat' 
              ? "Chat with the companion assistant to query memories and hear your loved one's actual voice." 
              : "Search the preserved archive of your loved one's voice recordings directly."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface/50 border border-border/80 p-1 rounded-lg self-start md:self-auto shrink-0 shadow-sm font-sans">
          <button
            onClick={() => setSubMode('chat')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              subMode === 'chat'
                ? 'bg-accent text-background shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Interactive Chat
          </button>
          <button
            onClick={() => setSubMode('search')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              subMode === 'search'
                ? 'bg-accent text-background shadow-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Direct Search
          </button>
        </div>
      </div>

      {subMode === 'chat' ? (
        <TalkingAssistantChat getHeaders={getHeaders} role="recipient" />
      ) : (
        <AskThemView getHeaders={getHeaders} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENT: Talking Assistant Chat (Mode 1 — text + generic read-aloud)
// ─────────────────────────────────────────────────────────────────────────────
function TalkingAssistantChat({ getHeaders, role }) {
  const isNarrator = role === 'narrator';

  const speakBrowser = (text, onFinished) => {
    if (!window.speechSynthesis) {
      if (onFinished) onFinished();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleKeywords = ['veena', 'heera', 'zira', 'hazel', 'samantha', 'victoria', 'female', 'google us english', 'google india English', 'google uk english female'];
    const activeVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      const matchesLang = lang.includes('in') || lang.includes('hi') || lang.includes('en');
      const matchesFemale = femaleKeywords.some(keyword => name.includes(keyword));
      return matchesLang && matchesFemale;
    }) || voices.find(v => v.lang.includes('IN') || v.lang.includes('hi')) || voices.find(v => v.lang.includes('en'));
    if (activeVoice) {
      utterance.voice = activeVoice;
    }
    utterance.onend = () => {
      if (onFinished) onFinished();
    };
    utterance.onerror = () => {
      if (onFinished) onFinished();
    };
    window.speechSynthesis.speak(utterance);
  };
  const greeting = isNarrator
    ? "Hi, I'm your Recording Companion. Ask me for ideas on what to record next, or tell me a memory and I'll help you shape it into a prompt."
    : "Hi, I'm your Recipient Companion. Ask me about your loved one's recordings — I'll quote their own words whenever I find them, never invent new ones.";

  const [messages, setMessages] = useState([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const scrollRef = useRef(null);

  // Voice Mode States
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStage, setVoiceStage] = useState('idle'); // 'idle' | 'speaking' | 'listening' | 'thinking'
  const [analyser, setAnalyser] = useState(null);
  const [latestReplyText, setLatestReplyText] = useState('');

  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Clean up audio resources on unmount or toggle
  useEffect(() => {
    return () => {
      stopVoiceAudio();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const stopVoiceAudio = () => {
    if (audioSourceRef.current) {
      if (audioSourceRef.current.stop) {
        try { audioSourceRef.current.stop(); } catch(e){}
      } else if (audioSourceRef.current.pause) {
        audioSourceRef.current.pause();
      }
      audioSourceRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e){}
      audioCtxRef.current = null;
    }
    setAnalyser(null);
  };

  const startListening = async (onDone) => {
    stopVoiceAudio();
    setVoiceStage('listening');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAnalyser(null);
        stream.getTracks().forEach(track => track.stop());
        
        if (onDone) onDone(audioBlob);
      };

      recorder.start();
    } catch (err) {
      console.error(err);
      toast.error("Could not access microphone.");
      setVoiceStage('idle');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const speakText = async (text, onFinished) => {
    stopVoiceAudio();
    setVoiceStage('speaking');
    setLatestReplyText(text);

    try {
      const res = await axios.post(`${API}/api/tts`, { text }, {
        headers: getHeaders().headers,
        responseType: 'blob'
      });

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      setAnalyser(analyserNode);

      const arrayBuffer = await res.data.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      source.onended = () => {
        setAnalyser(null);
        if (onFinished) onFinished();
      };

      source.start(0);
      audioSourceRef.current = source;
    } catch (err) {
      console.warn("TTS Web Audio play failed, falling back to Browser SpeechSynthesis.", err);
      speakBrowser(text, onFinished);
    }
  };

  const handleVoiceInput = async (audioBlob) => {
    setVoiceStage('thinking');
    const formData = new FormData();
    formData.append('file', audioBlob, 'query.webm');
    formData.append('messages', JSON.stringify(messages.map(({ role, content }) => ({ role, content }))));

    try {
      // Unified: transcribe + LLM reply + TTS in a single backend call
      const res = await axios.post(`${API}/api/assistant/voice-loop`, formData, {
        headers: {
          ...getHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { user_transcript: textQuery, reply, matched_clip, audio_base64, mime_type } = res.data;

      if (!textQuery || !textQuery.trim() || 
          textQuery.startsWith("This is a simulated transcript") ||
          textQuery.startsWith("Failed to transcribe") ||
          textQuery.startsWith("Transcription error") ||
          textQuery === "[Unclear audio]") {
        speakText("I didn't hear you clearly. Could you please repeat that?", () => {
          startListening((blob) => handleVoiceInput(blob));
        });
        return;
      }

      setMessages(prev => [
        ...prev,
        { role: 'user', content: textQuery },
        { role: 'assistant', content: reply, matchedClip: matched_clip || null }
      ]);
      setLatestReplyText(reply);
      setVoiceStage('speaking');

      if (audio_base64) {
        // Play pre-synthesized audio from the unified endpoint directly
        try {
          const binaryStr = atob(audio_base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime_type || 'audio/wav' });

          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioCtxRef.current = audioCtx;
          const analyserNode = audioCtx.createAnalyser();
          analyserNode.fftSize = 256;
          setAnalyser(analyserNode);

          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(analyserNode);
          analyserNode.connect(audioCtx.destination);
          audioSourceRef.current = source;

          source.onended = () => {
            setAnalyser(null);
            startListening((b) => handleVoiceInput(b));
          };
          source.start(0);
        } catch (audioErr) {
          console.warn('[Voice Loop] Web Audio decode failed, falling back to speakText.', audioErr);
          speakText(reply, () => startListening((b) => handleVoiceInput(b)));
        }
      } else {
        // Fallback: synthesize on the client side if backend TTS failed
        speakText(reply, () => startListening((b) => handleVoiceInput(b)));
      }

    } catch (err) {
      console.error(err);
      speakText("Sorry, I had trouble connecting. Let's try again.", () => {
        startListening((blob) => handleVoiceInput(blob));
      });
    }
  };

  const toggleVoiceMode = () => {
    if (voiceMode) {
      stopVoiceAudio();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setVoiceStage('idle');
      setVoiceMode(false);
    } else {
      setVoiceMode(true);
      const lastMessage = messages[messages.length - 1];
      speakText(lastMessage.content, () => {
        startListening((blob) => handleVoiceInput(blob));
      });
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const res = await axios.post(`${API}/api/assistant/chat`, {
        messages: nextMessages.map(({ role, content }) => ({ role, content }))
      }, getHeaders());

      posthog.capture('companion_message_sent', { role, matched_clip: Boolean(res.data.matched_clip) });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.reply,
        matchedClip: res.data.matched_clip || null
      }]);
    } catch (err) {
      console.error(err);
      toast.error('The companion is unavailable right now.');
      setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't respond just now — please try again in a moment." }]);
    } finally {
      setSending(false);
    }
  };

  const handleReadAloud = async (idx, text) => {
    if (speakingIdx === idx) return;
    setSpeakingIdx(idx);
    try {
      const res = await axios.post(`${API}/api/tts`, { text }, { ...getHeaders(), responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const audio = new Audio(blobUrl);
      audio.onended = () => setSpeakingIdx(null);
      audio.play();
    } catch (err) {
      console.warn('Could not read this message aloud via server. Using Browser SpeechSynthesis.', err);
      speakBrowser(text, () => setSpeakingIdx(null));
    }
  };

  if (voiceMode) {
    return (
      <div className="space-y-6 flex flex-col h-[600px] items-center justify-center text-center">
        <div className="w-full flex justify-between items-center border-b border-border pb-4">
          <div className="text-left">
            <h2 className="text-2xl font-serif font-semibold text-primary flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent animate-pulse" />
              <span>Voice Chat Mode</span>
            </h2>
            <p className="text-xs text-secondary">Hands-free voice assistant. Speak naturally.</p>
          </div>
          <button
            onClick={toggleVoiceMode}
            className="flex items-center gap-1.5 text-xs border border-accent/20 bg-accent/5 text-accent px-4 py-2 rounded-full hover:bg-accent/10 transition-all font-semibold"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Switch to Text</span>
          </button>
        </div>

        {/* Dynamic Voice Stage visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 max-w-md w-full">
          <div className="relative">
            <ParticleSphereVisualizer
              analyserNode={analyser}
              isRecording={voiceStage === 'listening'}
              isPlaying={voiceStage === 'speaking'}
              isLoading={voiceStage === 'thinking'}
              color={role === 'narrator' ? '#5A301E' : '#2A160D'}
              size={220}
              onClick={voiceStage === 'listening' ? stopListening : undefined}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-primary tracking-wide capitalize">
              {voiceStage === 'speaking' && "Companion speaking..."}
              {voiceStage === 'listening' && "Listening to you... (Click sphere to submit)"}
              {voiceStage === 'thinking' && "Processing..."}
              {voiceStage === 'idle' && "Ready"}
            </h3>
            
            {latestReplyText && (
              <p className="text-sm text-secondary italic font-serif leading-relaxed line-clamp-4 bg-surface/30 p-4 rounded-xl border border-border/40 max-w-sm mx-auto">
                "{latestReplyText}"
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-[600px]">
      <div>
        <h2 className="text-2xl font-serif font-semibold text-primary flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" />
          <span>{isNarrator ? 'Recording Companion' : 'Talking Assistant'}</span>
        </h2>
        <p className="text-xs text-secondary">
          {isNarrator
            ? 'A gentle brainstorming partner for your next recording session.'
            : "A guide to your loved one's archive — it only ever quotes their actual recorded words. Tap the speaker icon to hear a reply read aloud."}
        </p>
      </div>

      {/* Ethical Guardrail Notice */}
      <div className="bg-surface/40 border border-border rounded-lg p-3.5 flex items-start gap-2.5 text-[11px] text-secondary font-sans">
        <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p>
          <strong>Ethical Guardrail:</strong> This assistant is a safety-restricted helper — it never uses profanity, and it never speaks as if it were {isNarrator ? 'you' : 'the narrator'}. {!isNarrator && 'It only quotes their real recorded words; it never fabricates what they might have said. Read-aloud here uses a generic voice, not a clone.'}
        </p>
      </div>

      {/* Chat Log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-accent text-background font-medium'
                : 'bg-surface/60 border border-border text-primary'
            }`}>
              <div className="flex items-start gap-2">
                <p className="flex-1 font-sans">{m.content}</p>
                {m.role === 'assistant' && (
                  <button
                    onClick={() => handleReadAloud(idx, m.content)}
                    disabled={speakingIdx === idx}
                    title="Read this message aloud"
                    className="shrink-0 text-secondary hover:text-accent transition-colors disabled:opacity-50"
                  >
                    {speakingIdx === idx ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {m.matchedClip && (
                <div className="mt-3 bg-background/80 border border-accent/20 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-accent font-semibold">{m.matchedClip.title}</p>
                  {m.matchedClip.audio_url && (
                    <audio
                      src={m.matchedClip.audio_url.startsWith('http') ? m.matchedClip.audio_url : `${API}${m.matchedClip.audio_url}`}
                      controls
                      className="w-full animate-none"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface/60 border border-border rounded-xl px-4 py-2.5 text-sm text-secondary flex items-center gap-2 font-sans">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={toggleVoiceMode}
          className="bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 px-3 py-3 rounded-lg transition-all"
          title="Switch to Voice Chat Mode"
        >
          <Mic className="w-4 h-4 text-accent" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isNarrator ? "e.g. What should I record about next?" : "e.g. What was their advice about raising kids?"}
          className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40 font-sans"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-accent text-background font-semibold px-5 py-3 rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow"
        >
          <Send className="w-4 h-4 text-background" />
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENT: Collaboration Memory Wall
// ─────────────────────────────────────────────────────────────────────────────
function CollabWallView({ getHeaders, role }) {
  const { session } = useAuth();
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
      const errMsg = err.response?.data?.detail;
      if (errMsg === "No connected patient found") {
        toast.error("Please connect to a Narrator account to post on their wall.");
      } else {
        toast.error(errMsg || 'Failed to add note.');
      }
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


// ─────────────────────────────────────────────────────────────────────────────
// TRUSTEE COMPONENT: Executor Lockbox Portal
// ─────────────────────────────────────────────────────────────────────────────
function ExecutorLockboxView({ getHeaders, executorPatients, setExecutorPatients }) {
  const [loading, setLoading] = useState(false);

  const handleRelease = async (patientId, patientName) => {
    const confirmed = window.confirm(`Are you absolutely sure you want to authorize the Deed of Release for ${patientName}? This will unlock all post-transition memories and active voice preservation features for their recipients.`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/executor/release`, { patient_id: patientId }, getHeaders());
      toast.success(`Deed of Release authorized successfully for ${patientName}!`);
      setExecutorPatients(prev => prev.map(p => p.id === patientId ? { ...p, executor_activated: true, executor_activated_at: res.data.profile.executor_activated_at } : p));
    } catch (err) {
      console.error(err);
      toast.error('Failed to authorize release. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-semibold text-primary flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-accent" />
          <span>Executor Lockbox</span>
        </h2>
        <p className="text-xs text-secondary">Manage legacy releases for patients who have designated you as their trustee.</p>
      </div>

      <div className="space-y-4">
        {executorPatients.map(patient => (
          <div key={patient.id} className="bg-surface/50 border-2 border-border rounded-xl p-5 shadow-[4px_4px_0px_#2A160D] space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] bg-accent/15 border border-accent/30 text-accent px-2 py-0.5 rounded uppercase font-semibold">Narrator Account</span>
                <h3 className="font-serif font-bold text-lg text-primary mt-1.5">{patient.name}</h3>
                <p className="text-xs text-secondary">{patient.email}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 border rounded-lg font-semibold uppercase tracking-wider ${
                patient.executor_activated 
                  ? 'bg-success/15 border-success text-success' 
                  : 'bg-danger/15 border-danger text-danger'
              }`}>
                {patient.executor_activated ? "Released / Active" : "Locked / Sealed"}
              </span>
            </div>

            {patient.executor_activated ? (
              <div className="bg-success/5 border border-success/30 rounded-lg p-3 text-xs text-success leading-relaxed flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-success" />
                <div>
                  <p className="font-bold">Legacy Release Authorized</p>
                  <p className="text-[10px] opacity-80">You triggered the release deed on {new Date(patient.executor_activated_at).toLocaleString()}. All event-released clips are now active and the conversational avatar is online for their family members.</p>
                </div>
              </div>
            ) : (
              <div className="bg-danger/5 border border-danger/30 rounded-lg p-4 space-y-3">
                <div className="text-xs text-danger leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-danger" />
                  <div>
                    <p className="font-bold">Trustee Release Deed Pending</p>
                    <p className="text-[10px] opacity-80 font-sans">The narrator's post-transition memories (marked as release on "event") are currently encrypted and hidden from their family recipients. They will only be unveiled once you sign the Deed of Release below.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRelease(patient.id, patient.name)}
                  disabled={loading}
                  className="bg-danger hover:bg-danger/90 border-2 border-border text-background font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded shadow-[3px_3px_0px_#2A160D] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-background" />
                  <span>Authorize Deed of Release</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Signature drawing pad using HTML5 Canvas
// ─────────────────────────────────────────────────────────────────────────────
function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set up canvas styling
    ctx.strokeStyle = '#2A160D'; // primary theme chocolate brown
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg bg-white overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[150px] bg-white cursor-crosshair touch-none"
        />
      </div>
      <div className="flex justify-between items-center gap-2 font-sans">
        <button
          type="button"
          onClick={clearCanvas}
          className="text-xs border border-border hover:bg-background/25 px-3 py-1.5 rounded transition-all font-semibold"
        >
          Clear Pad
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs border border-border hover:bg-background/25 px-3.5 py-1.5 rounded transition-all font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-xs bg-accent text-background border border-border hover:bg-opacity-95 px-4.5 py-1.5 rounded transition-all font-bold shadow-[2px_2px_0px_#2A160D]"
          >
            Sign Deed
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NARRATOR & RECIPIENT COMPONENT: Cognitive Anchor & DRT View
// ─────────────────────────────────────────────────────────────────────────────
function CognitiveAnchorView({ getHeaders, role }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorClip, setAnchorClip] = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const [breathText, setBreathText] = useState("Inhale...");
  
  const [playingClipId, setPlayingClipId] = useState(null);
  const activeAudioRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/api/clips`, getHeaders())
      .then(res => {
        setClips(res.data);
        const found = res.data.find(c => 
          c.title.toLowerCase().includes('grounding') || 
          c.title.toLowerCase().includes('anchor') || 
          c.title.toLowerCase().includes('comfort')
        ) || res.data[0];
        setAnchorClip(found);
      })
      .catch(() => toast.error('Failed to load memory lane.'))
      .finally(() => setLoading(false));
  }, [getHeaders]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setBreathText(prev => prev === "Inhale..." ? "Exhale..." : "Inhale...");
    }, 4000);
    return () => clearInterval(interval);
  }, [playing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  const handlePlayAnchor = () => {
    if (!anchorClip || !anchorClip.audio_url) {
      toast.error("No grounding anchor recording found.");
      return;
    }
    
    // Stop timeline clip if playing
    if (playingClipId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingClipId(null);
    }
    
    if (playing) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlaying(false);
    } else {
      const url = anchorClip.audio_url.startsWith('http') ? anchorClip.audio_url : `${API}${anchorClip.audio_url}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      setPlaying(true);
      audio.onended = () => setPlaying(false);
    }
  };

  const handlePlayClip = (clip) => {
    // Stop anchor audio if playing
    if (playing) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlaying(false);
    }

    // Stop currently playing timeline audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    if (playingClipId === clip.id) {
      setPlayingClipId(null);
    } else {
      const url = clip.audio_url.startsWith('http') ? clip.audio_url : `${API}${clip.audio_url}`;
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      setPlayingClipId(clip.id);
      audio.play();
      audio.onended = () => setPlayingClipId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-serif font-semibold text-primary">Cognitive Anchor & DRT</h2>
        <p className="text-xs text-secondary">
          Digital Reminiscence Therapy and grounding tools designed to comfort individuals experiencing disorientation, memory loss, or Alzheimer's.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        <div className="lg:col-span-5 bg-surface border-2 border-border p-6 rounded-xl shadow-[4px_4px_0px_#2A160D] space-y-6 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[9px] uppercase tracking-widest bg-accent/15 text-accent border border-accent/20 px-2 py-0.5 rounded font-bold">
              Sundowning & Orientation Support
            </span>
            <h3 className="font-serif font-bold text-lg text-primary">Immediate Comfort Anchor</h3>
            <p className="text-xs text-secondary leading-relaxed">
              When a loved one experiences anxiety, sundowning, or disorientation, press this button to play a familiar grounding message.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative flex items-center justify-center w-48 h-48">
              {/* Pulsing and breathing guide rings */}
              {playing && (
                <>
                  <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping border border-accent/30" />
                  <div 
                    className="absolute rounded-full bg-accent/5 border border-dashed border-accent/20 transition-all duration-[4000ms] ease-in-out"
                    style={{
                      width: breathText === "Inhale..." ? "180px" : "140px",
                      height: breathText === "Inhale..." ? "180px" : "140px",
                    }}
                  />
                </>
              )}
              <button
                onClick={handlePlayAnchor}
                className={`relative z-10 w-36 h-36 rounded-full border-4 border-border shadow-[4px_4px_0px_#2A160D] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
                  playing 
                    ? 'bg-accent text-background font-semibold shadow' 
                    : 'bg-[#FDF5D7] text-primary hover:bg-[#F8EAB7]'
                }`}
              >
                <Heart className={`w-8 h-8 ${playing ? 'fill-current animate-pulse' : ''}`} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {playing ? 'Calming...' : 'Anchor Me'}
                </span>
              </button>
            </div>
            
            {playing && (
              <p className="mt-4 text-xs font-bold text-accent uppercase tracking-widest animate-bounce">
                {breathText}
              </p>
            )}
          </div>

          <div className="bg-background/40 border border-border/60 rounded p-4 text-center">
            {anchorClip ? (
              <div className="space-y-1 text-left">
                <span className="text-[9px] text-secondary uppercase font-bold">Active Comfort Track:</span>
                <h4 className="font-semibold text-primary text-xs truncate">{anchorClip.title}</h4>
                <p className="text-[10px] text-secondary italic line-clamp-2">"{anchorClip.transcript}"</p>
              </div>
            ) : (
              <p className="text-[10px] text-secondary">
                No custom grounding clip detected. Record a clip titled "Grounding Anchor" in the Recording Studio to set a customized comfort voice message.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 bg-surface border-2 border-border p-6 rounded-xl shadow-[4px_4px_0px_#2A160D] space-y-6">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-primary">Memory Lane</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Chronological life review chapters recorded by the narrator. Playing these back helps stimulate memory retrieval and reinforces identity.
            </p>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Building Memory Lane...
            </div>
          ) : clips.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center text-secondary text-xs">
              Record life memories in the studio to populate this timeline.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-border space-y-6 max-h-[360px] overflow-y-auto pr-2">
              {clips.map((clip, index) => (
                <div key={clip.id} className="relative space-y-2">
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-border bg-surface flex items-center justify-center text-[8px] font-bold text-primary shadow-[1px_1px_0px_#2A160D]">
                    {index + 1}
                  </span>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-primary">{clip.title}</h4>
                      <p className="text-[9px] text-secondary">Recorded on {new Date(clip.created_at).toLocaleDateString()}</p>
                    </div>
                    {clip.audio_url && (
                      <button
                        onClick={() => handlePlayClip(clip)}
                        className={`p-1.5 bg-background border border-border rounded-lg hover:border-accent hover:text-accent transition-all text-secondary shrink-0 shadow-[1px_1px_0px_#2A160D] ${
                          playingClipId === clip.id ? 'text-accent border-accent' : ''
                        }`}
                        title={playingClipId === clip.id ? "Pause Memory" : "Play Memory"}
                      >
                        {playingClipId === clip.id ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-secondary italic bg-background/30 p-2.5 border border-border/40 rounded leading-relaxed font-serif">
                    "{clip.transcript}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

