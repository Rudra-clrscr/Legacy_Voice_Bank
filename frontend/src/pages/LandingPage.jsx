import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mic, Lock, Calendar, MessageSquare, ArrowRight, Heart, Shield, ChevronDown, Volume2, VolumeX, X } from 'lucide-react';

export default function LandingPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Show tooltip on first entry if they haven't muted/played yet
    const hasSeen = localStorage.getItem('hasSeenVoiceoverPrompt');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
      }, 1200); // Gentle delay after load
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      // Mark as seen when they interact with it
      localStorage.setItem('hasSeenVoiceoverPrompt', 'true');
      setShowTooltip(false);
    }
    setIsPlaying(!isPlaying);
  };

  const dismissTooltip = (e) => {
    e.stopPropagation();
    localStorage.setItem('hasSeenVoiceoverPrompt', 'true');
    setShowTooltip(false);
  };

  const fadeUp = {
    hidden: { y: 30, opacity: 0 },
    visible: (i = 0) => ({
      y: 0,
      opacity: 1,
      transition: { duration: 0.7, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }
    })
  };

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } }
  };

  const features = [
    {
      icon: Mic,
      title: "Guided Capture",
      desc: "Low-burden, voice-first sessions with auto-saving. Pause, breathe, and resume at your own pace — no pressure, ever.",
      num: "01"
    },
    {
      icon: Lock,
      title: "The Vault",
      desc: "Decide what is shared, with whom, and when. Full consent control remains completely in your hands at all times.",
      num: "02"
    },
    {
      icon: Calendar,
      title: "Timed Release",
      desc: "Schedule voice messages for future milestones — birthdays, weddings, anniversaries. A warm presence across the years.",
      num: "03"
    },
    {
      icon: MessageSquare,
      title: "Interactive Retrieval",
      desc: "Loved ones ask questions to retrieve direct, unaltered clips of your recorded voice — with an optional, consent-gated voice clone for comfort in the moments grief feels heaviest.",
      num: "04"
    }
  ];

  const steps = [
    { step: "1", title: "Create Your Space", desc: "Sign up and set up your private vault in under a minute." },
    { step: "2", title: "Speak When Ready", desc: "Gentle prompts guide you through recording at your own pace." },
    { step: "3", title: "Set Your Wishes", desc: "Choose who receives each message, and when they should hear it." },
  ];

  return (
    <div className="min-h-screen bg-background text-primary font-sans selection:bg-primary selection:text-background">

      {/* Hidden audio element */}
      <audio ref={audioRef} src="/audio.mp3" loop onEnded={() => setIsPlaying(false)} />

      {/* ─── NAVBAR — Glassmorphism, scrolls with page ─── */}
      <nav className="relative w-full z-50 border-b border-border/30"
        style={{
          background: 'rgba(244, 229, 168, 0.35)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 30px rgba(42, 22, 13, 0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-10 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full border-2 border-border/40 flex items-center justify-center bg-background/30 backdrop-blur-sm group-hover:bg-accent group-hover:border-accent transition-all duration-300">
              <Heart className="w-3.5 h-3.5 text-primary group-hover:text-background transition-colors fill-primary/10" />
            </div>
            <span className="font-serif font-semibold text-lg tracking-tight">Pratidhvani</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Audio toggle container for relative tooltip positioning */}
            <div className="relative">
              <button
                onClick={toggleAudio}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-border/30 text-xs font-medium text-secondary hover:text-primary hover:border-border/60 transition-all duration-200 bg-background/20 backdrop-blur-sm"
                title={isPlaying ? 'Mute voiceover' : 'Play voiceover'}
              >
                {isPlaying ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-accent" />
                    <span className="hidden sm:inline">Playing</span>
                    {/* Animated bars */}
                    <span className="flex items-end gap-[2px] h-3 ml-0.5">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-[2px] bg-accent rounded-full"
                          animate={{ height: ['30%', '100%', '30%'] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                        />
                      ))}
                    </span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Listen</span>
                  </>
                )}
              </button>

              {/* Tooltip Popup */}
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="absolute right-0 top-full mt-3 w-64 p-4 border border-border/20 rounded-xl shadow-xl text-left z-50"
                    style={{
                      background: 'rgba(42, 22, 13, 0.92)', // Deep rich chocolate brown
                      backdropFilter: 'blur(8px)',
                      color: '#F4E5A8', // Warm butter yellow text
                    }}
                  >
                    {/* Tooltip arrow pointing up to the button */}
                    <div className="absolute right-6 -top-2 w-4 h-4 rotate-45" style={{ background: 'rgba(42, 22, 13, 0.92)', borderLeft: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
                    
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-2">
                        <span className="relative flex h-2 w-2 mt-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-background opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-background"></span>
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold tracking-wide uppercase text-background font-serif">Voice Guide</h4>
                          <p className="text-[11px] leading-relaxed text-[#FDF5D7]/85">
                            Click this button to play a calming guiding voiceover and explore the sanctuary.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={dismissTooltip}
                        className="text-[#F4E5A8]/50 hover:text-[#F4E5A8] transition-colors p-0.5 rounded-full hover:bg-white/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Link to="/verify" className="text-sm font-medium text-secondary hover:text-primary transition-colors hidden sm:block mr-2">
              Verify Voice
            </Link>
            <Link to="/login" className="text-sm font-medium text-secondary hover:text-primary transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold bg-primary/90 text-background px-5 py-2.5 rounded-lg border border-border/20 hover:bg-accent transition-all duration-200 active:scale-[0.97] backdrop-blur-sm"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <header className="relative min-h-screen flex items-center justify-center px-6 md:px-10 overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ zIndex: 0 }}>
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/legacy_vid.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Warm butter-yellow overlay — tints the video, keeps text readable */}
        <div className="absolute inset-0 bg-background/40" style={{ zIndex: 1 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" style={{ zIndex: 2 }} />

        {/* Floating decorative shapes */}
        <motion.div
          className="absolute top-32 right-[8%] w-24 h-24 border-2 border-border/15 rounded-full"
          style={{ zIndex: 3 }}
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-48 left-[5%] w-16 h-16 border-2 border-border/10 rotate-45"
          style={{ zIndex: 3 }}
          animate={{ y: [0, 10, 0], rotate: [45, 50, 45] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative max-w-5xl mx-auto text-center" style={{ zIndex: 10 }}>
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">



            {/* Heading */}
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-semibold tracking-tight leading-[1.05]"
            >
              Your voice.<br />
              <span className="italic font-normal text-accent">Preserved forever.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-base md:text-lg text-secondary max-w-2xl mx-auto leading-relaxed font-light"
            >
              A consent-first, guided space for terminally ill patients to record their memories, values, and messages — keeping your real voice alive for the moments that matter most.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/login"
                className="flex items-center gap-2.5 bg-primary text-background px-8 py-4 border-2 border-border font-semibold text-sm hover:bg-accent hover:border-accent transition-all duration-200 active:scale-[0.97] shadow-[4px_4px_0px_0px_#2A160D] hover:shadow-[2px_2px_0px_0px_#5A301E]"
              >
                Start Recording
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 px-8 py-4 border-2 border-border font-medium text-sm text-primary hover:bg-surface transition-all duration-200 active:scale-[0.97]"
              >
                How it Works
                <ChevronDown className="w-4 h-4" />
              </a>
            </motion.div>
          </motion.div>

          {/* Voice Visualizer Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-16 md:mt-24 max-w-3xl mx-auto"
          >
            <div className="bg-surface border-2 border-border p-6 md:p-8 shadow-[6px_6px_0px_0px_#2A160D]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Live Voice Capture</span>
                </div>
                <span className="text-xs font-mono text-secondary/60">00:04:32</span>
              </div>

              {/* Waveform */}
              <div className="flex items-end justify-center gap-[3px] h-20 md:h-28 mb-6">
                {[35, 55, 25, 70, 45, 80, 30, 60, 50, 75, 20, 65, 40, 85, 55, 30, 70, 45, 60, 35, 75, 50, 25, 65, 40, 80, 55, 30, 70, 45, 60, 35].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-[6px] md:w-[8px] bg-primary/80 rounded-sm"
                    animate={{
                      height: [`${h * 0.35}%`, `${h}%`, `${h * 0.35}%`],
                    }}
                    transition={{
                      duration: 1.2 + (i % 5) * 0.15,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.04,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between border-t-2 border-border/30 pt-4">
                <p className="text-xs text-secondary font-light">Your authentic voice — captured in high fidelity, never cloned.</p>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Encrypted</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </header>



      {/* ─── ABOUT / EMOTIONAL SECTION ─── */}
      <section className="py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Why Pratidhvani</span>
            <h2 className="text-3xl md:text-5xl font-serif font-semibold tracking-tight leading-[1.15]">
              A gentle voice is a<br />
              <span className="italic font-normal">timeless presence.</span>
            </h2>
            <p className="text-secondary font-light leading-relaxed text-base">
              We understand that talking about the end of life is not easy. That is why we have made this process incredibly slow, gentle, and comforting. Soft, thoughtful prompts invite you to speak at your own pace, on your own terms.
            </p>
            <blockquote className="border-l-4 border-accent pl-5 py-2 italic text-secondary text-sm font-light leading-relaxed">
              "Hearing the real tone, the laughter, and the unique pauses of a loved one's voice provides a kind of comfort that no AI generation can ever mimic."
            </blockquote>
          </motion.div>

          {/* Animated Resonance Visualizer */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative w-72 h-72 md:w-80 md:h-80">
              {/* Concentric breathing circles */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-border/10"
                animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-6 rounded-full border-2 border-border/15"
                animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />
              <motion.div
                className="absolute inset-12 rounded-full border-2 border-border/20"
                animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.4, 0.15] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
              />
              <motion.div
                className="absolute inset-[4.5rem] rounded-full border-2 border-accent/25 bg-accent/5"
                animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
              {/* Center mic */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary border-2 border-border flex items-center justify-center shadow-[3px_3px_0px_0px_#5A301E]">
                  <Mic className="w-6 h-6 text-background" />
                </div>
              </div>
              {/* Corner label */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">
                Voice Resonance
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 md:py-32 px-6 md:px-10 border-t-2 border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-20"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Features</span>
            <h2 className="mt-4 text-3xl md:text-5xl font-serif font-semibold tracking-tight">
              Designed for<br className="sm:hidden" /> peace of mind.
            </h2>
            <p className="mt-4 text-secondary font-light max-w-lg mx-auto">
              Every detail is crafted to minimize burden, ensure safety, and deliver comfort.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-border">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`group p-8 md:p-10 bg-surface hover:bg-background transition-colors duration-300 relative
                  ${i % 2 === 0 ? 'md:border-r-2 border-border' : ''}
                  ${i < 2 ? 'border-b-2 border-border' : ''}
                  ${i === 1 ? 'border-b-2 border-border' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 border-2 border-border bg-background flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                    <f.icon className="w-5 h-5 text-primary group-hover:text-background transition-colors" />
                  </div>
                  <span className="text-4xl font-serif font-semibold text-border/10 group-hover:text-border/20 transition-colors">{f.num}</span>
                </div>
                <h3 className="text-lg font-serif font-semibold text-primary mb-3">{f.title}</h3>
                <p className="text-sm text-secondary font-light leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 md:py-32 px-6 md:px-10 bg-primary text-background border-t-2 border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-20"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-background/50">How It Works</span>
            <h2 className="mt-4 text-3xl md:text-5xl font-serif font-semibold tracking-tight">
              Three gentle steps.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className={`p-8 md:p-10 border-2 border-background/15 ${i < 2 ? 'md:border-r-0' : ''} ${i > 0 ? 'border-t-0 md:border-t-2' : ''}`}
              >
                <div className="w-10 h-10 rounded-full border-2 border-background/30 flex items-center justify-center mb-6">
                  <span className="text-sm font-serif font-semibold">{s.step}</span>
                </div>
                <h3 className="text-lg font-serif font-semibold mb-3">{s.title}</h3>
                <p className="text-sm text-background/60 font-light leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUOTE ─── */}
      <section className="py-24 md:py-32 px-6 md:px-10 border-t-2 border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <Heart className="w-8 h-8 text-accent mx-auto" />
          <blockquote className="text-2xl md:text-4xl font-serif font-normal italic leading-snug text-primary">
            "Hearing the voice of someone you love is the closest thing to having them in the room."
          </blockquote>
          <p className="text-xs uppercase tracking-[0.2em] text-secondary font-semibold">— The Pratidhvani Philosophy</p>
          <p className="text-sm text-secondary font-light max-w-xl mx-auto leading-relaxed">
            At the heart of it, we preserve the real, unfiltered warmth of your presence — every pause, every laugh, exactly as you are. Voice cloning exists too, but only as an explicit, revocable choice you make — never the default.
          </p>
        </motion.div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 md:py-32 px-6 md:px-10 border-t-2 border-border bg-surface">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center space-y-8"
        >
          <h2 className="text-3xl md:text-5xl font-serif font-semibold tracking-tight">
            Begin whenever<br /> you're ready.
          </h2>
          <p className="text-secondary font-light leading-relaxed max-w-lg mx-auto">
            There is no rush, and you are completely in control. Create an account, and take all the time you need to record your legacy.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
            <Link
              to="/login"
              className="flex items-center gap-2.5 bg-primary text-background px-10 py-4 border-2 border-border font-semibold text-sm hover:bg-accent hover:border-accent transition-all duration-200 active:scale-[0.97] shadow-[4px_4px_0px_0px_#2A160D] hover:shadow-[2px_2px_0px_0px_#5A301E]"
            >
              Start Preserving Your Voice
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t-2 border-border bg-background py-10 px-6 md:px-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full border-2 border-border flex items-center justify-center bg-surface">
              <Heart className="w-3 h-3 text-primary fill-primary/10" />
            </div>
            <span className="font-serif font-semibold text-sm">Pratidhvani</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3">
            <p className="text-[11px] text-secondary font-light text-center md:text-right max-w-sm">
              Designed with deep respect, care, and empathy to keep memories alive in their truest, warmest form.
            </p>
            <div className="flex gap-4">
              <Link to="/verify" className="text-[10px] text-accent hover:underline font-semibold uppercase tracking-wider">
                Verify Legacy Voice Prints
              </Link>
            </div>
          </div>
          <span className="text-[10px] text-secondary/50 font-light">
            &copy; {new Date().getFullYear()} Pratidhvani
          </span>
        </div>
      </footer>
    </div>
  );
}
