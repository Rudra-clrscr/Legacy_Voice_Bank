import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mic, Lock, Calendar, MessageSquare, ArrowRight, Heart } from 'lucide-react';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-background text-primary overflow-hidden font-sans selection:bg-accent selection:text-background">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/5 via-background to-background -z-10" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full flex justify-between items-center px-8 py-5 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Heart className="w-5 h-5 text-accent fill-accent/20" />
          <span className="font-serif font-semibold text-lg tracking-wide text-primary">Living Legacy</span>
        </div>
        <div className="flex space-x-6 items-center">
          <Link to="/login" className="text-sm font-medium text-secondary hover:text-accent transition-colors">Sign In</Link>
          <Link to="/login" className="text-sm font-medium bg-accent text-background px-5 py-2 rounded hover:bg-opacity-90 transition-all font-semibold shadow-sm">
            Preserve a Legacy
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-40 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center text-center">
        
        <motion.div 
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-border text-xs text-secondary bg-surface/50">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="uppercase tracking-widest font-medium text-[10px]">A Structured Voice Preservation System</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl lg:text-7xl font-serif font-medium tracking-tight text-primary pb-2 leading-[1.1]">
            Your voice. Your stories.<br/>
            <span className="italic text-accent">Preserved forever.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-base md:text-lg text-secondary max-w-2xl mx-auto font-light leading-relaxed">
            A guided, consent-first space designed for terminally ill patients to record their memories, values, and messages. Keep your voice alive for the moments that matter most.
          </motion.p>

          <motion.div variants={itemVariants} className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="flex items-center space-x-2 bg-accent text-background px-8 py-3.5 rounded font-semibold hover:bg-opacity-95 transition-all shadow-md">
              <span>Start Recording</span>
              <ArrowRight className="w-4 h-4 text-background" />
            </Link>
            <a href="#features" className="flex items-center space-x-2 bg-transparent text-primary border border-border px-8 py-3.5 rounded font-medium hover:bg-surface transition-colors">
              <span>How it Works</span>
            </a>
          </motion.div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          id="features"
          className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants} className="bg-surface p-8 rounded-lg border border-border text-left hover:-translate-y-1 hover:border-accent/40 transition-all duration-300">
            <Mic className="w-6 h-6 text-accent mb-6" />
            <h3 className="text-lg font-serif font-medium text-primary mb-2">Guided Capture</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Low-burden, voice-first sessions. Auto-saving keeps pacing gentle, allowing you to pause and resume anytime.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-surface p-8 rounded-lg border border-border text-left hover:-translate-y-1 hover:border-accent/40 transition-all duration-300">
            <Lock className="w-6 h-6 text-accent mb-6" />
            <h3 className="text-lg font-serif font-medium text-primary mb-2">The Vault</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Decide what is shared, with whom, and when. Full consent control remains in your hands at all times.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-surface p-8 rounded-lg border border-border text-left hover:-translate-y-1 hover:border-accent/40 transition-all duration-300">
            <Calendar className="w-6 h-6 text-accent mb-6" />
            <h3 className="text-lg font-serif font-medium text-primary mb-2">Timed Release</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Schedule voice messages for future birthdays, graduations, or weddings. A warm presence across the years.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-surface p-8 rounded-lg border border-border text-left hover:-translate-y-1 hover:border-accent/40 transition-all duration-300">
            <MessageSquare className="w-6 h-6 text-accent mb-6" />
            <h3 className="text-lg font-serif font-medium text-primary mb-2">Interactive Retrieval</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Loved ones ask questions to retrieve direct, unaltered clips of your recorded voice. Strictly no AI-synthesized cloning.
            </p>
          </motion.div>
        </motion.div>

      </main>
    </div>
  );
}
