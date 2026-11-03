import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Mail, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthScreenProps {
  onQuickDemoAccess: (customUser?: { email?: string; displayName?: string; isSignup?: boolean }) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onQuickDemoAccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showProviderGuide, setShowProviderGuide] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setShowProviderGuide(false);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (fullName.trim()) {
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const message = err instanceof Error ? err.message : String(err);

      if (
        message.includes('token-service-api-has-not-been-used') ||
        message.includes('securetoken.googleapis.com') ||
        code === 'auth/operation-not-allowed' ||
        message.includes('operation-not-allowed')
      ) {
        onQuickDemoAccess({
          email: email.trim() || undefined,
          displayName: fullName.trim() || email.trim().split('@')[0] || undefined,
          isSignup: mode === 'signup'
        });
        return;
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setErrorMsg('Email ya password ghalat hai. Dobara check karein.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('Yeh email pehle se registered hai. Login tab use karein.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Password kam az kam 6 characters ka hona chahiye.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('token-service-api-has-not-been-used') ||
        message.includes('securetoken.googleapis.com')
      ) {
        onQuickDemoAccess();
        return;
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs items-stretch">
        {/* Left Editorial Column */}
        <div className="lg:col-span-6 p-8 sm:p-10 bg-slate-900 text-white flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-slate-400">
              AtelierCV · Executive Resume Studio
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 leading-tight text-balance">
              Transform Raw Career Notes into ATS-Ready Executive CVs.
            </h1>
            <p className="text-sm text-slate-300 mt-4 leading-relaxed">
              Enter your experience in simple language or Roman Urdu/English. Our Groq Llama 3.3 70B engine rewrites every role into quantified, action-verb bullet points while keeping your original facts intact.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 space-y-3 text-xs text-slate-300">
            <div>01. 6 Configurable JSON/CSS Templates with 35×45mm Portrait Slot</div>
            <div>02. Full Inline Editing + Drag-and-Drop Reordering (dnd-kit)</div>
            <div>03. Offline-First Local + Firestore Auto-Save & PDF / Word (.docx) Export</div>
          </div>
        </div>

        {/* Right Auth Form Column */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Areeba Khan"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="space-y-1">
                  <p className="font-medium">{errorMsg}</p>
                  {showProviderGuide && (
                    <div className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded p-2 mt-1.5 space-y-1">
                      <p className="font-semibold">How to enable Email/Password in Firebase Console:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>
                          Open Firebase Console for project{' '}
                          <span className="font-mono font-semibold">{firebaseConfig.projectId}</span>
                        </li>
                        <li>Go to Authentication → Sign-in method</li>
                        <li>Click Email/Password → Enable → Save</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In with Email' : 'Create Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[11px] text-slate-400 font-medium">OR CONTINUE WITH</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <span>Continue with Google Account</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickDemoAccess()}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <span>Enter Interactive Workspace (Local Offline-First Session)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
