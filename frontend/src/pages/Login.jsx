import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, Loader2 } from 'lucide-react';
import posthog from '../lib/posthog';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('narrator'); // 'narrator' or 'recipient'
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let error;
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        error = signInError;
      } else {
        if (!name) {
          throw new Error('Name is required to sign up.');
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role
            }
          }
        });
        error = signUpError;
        if (!error) {
          posthog.capture('account_registered', { role });
          toast.success('Account created! Please check your email to confirm, then sign in.');
          setIsLogin(true);
          setLoading(false);
          return;
        }
      }

      if (error) throw error;
      if (isLogin) {
        posthog.capture('login_completed');
        toast.success('Logged in successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes('email not confirmed')) {
        toast.error('Please confirm your email first. Check your inbox for a verification link.', { duration: 6000 });
      } else {
        toast.error(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-sans selection:bg-accent selection:text-background">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 shadow-xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-secondary hover:text-accent transition-colors">
            <Heart className="w-6 h-6 text-accent fill-accent/10" />
            <span className="font-serif font-semibold text-xl tracking-wide text-primary">Pratidhvani</span>
          </Link>
          <h1 className="mt-6 text-2xl font-serif font-medium text-primary tracking-tight">
            {isLogin ? 'Sign in' : 'Create an Account'}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {isLogin 
              ? 'Welcome back. Access your secure legacy archive.' 
              : 'Begin preserving and sharing your most meaningful moments.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {!isLogin && (
            <>
              <div>
                <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">
                  I want to join as a:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('narrator')}
                    className={`py-2 px-3 rounded border text-xs text-left font-medium transition-all ${
                      role === 'narrator'
                        ? 'border-accent bg-accent/5 text-accent'
                        : 'border-border bg-background text-secondary hover:text-primary'
                    }`}
                  >
                    <div className="font-semibold text-primary">Narrator</div>
                    <div className="text-[10px] opacity-80 mt-0.5">I want to record my own stories</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('recipient')}
                    className={`py-2 px-3 rounded border text-xs text-left font-medium transition-all ${
                      role === 'recipient'
                        ? 'border-accent bg-accent/5 text-accent'
                        : 'border-border bg-background text-secondary hover:text-primary'
                    }`}
                  >
                    <div className="font-semibold text-primary">Recipient</div>
                    <div className="text-[10px] opacity-80 mt-0.5">I want to view a loved one's vault</div>
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-widest mb-1.5 font-semibold">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-background border border-border rounded px-3 py-2.5 text-sm text-primary placeholder-secondary outline-none focus:border-accent/40 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent text-background font-semibold text-sm py-2.5 rounded hover:bg-opacity-90 transition-all shadow-md mt-6 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Toggle */}
        <p className="mt-6 text-center text-sm text-secondary">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-accent hover:underline transition-all font-semibold"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>

      </div>
    </div>
  );
}
