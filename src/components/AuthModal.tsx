import React, { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import { parseFirebaseAuthError, ParsedAuthError } from '../lib/authErrorHandler';

interface AuthScreenProps {
  onQuickDemoAccess: (customUser?: { email?: string; displayName?: string; isSignup?: boolean }) => void;
  initialEmail?: string;
  initialFullName?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onQuickDemoAccess,
  initialEmail = '',
  initialFullName = ''
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedError, setParsedError] = useState<ParsedAuthError | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
    if (initialFullName && !fullName) {
      setFullName(initialFullName);
    }
  }, [initialEmail, initialFullName, email, fullName]);

  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname : 'atlier-cv.vercel.app';

  useEffect(() => {
    getRedirectResult(auth).catch((err: unknown) => {
      if (err) {
        const analyzed = parseFirebaseAuthError(err, currentHostname, firebaseConfig.projectId);
        setParsedError(analyzed);
        setErrorMsg(analyzed.userMessage);
      }
    });
  }, [currentHostname]);

  const handleCopyDomain = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    } catch {
      setCopiedDomain(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setParsedError(null);
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
      const analyzed = parseFirebaseAuthError(err, currentHostname, firebaseConfig.projectId);
      if (analyzed.shouldAutoFallbackToDemo) {
        onQuickDemoAccess({
          email: email.trim() || undefined,
          displayName: fullName.trim() || email.trim().split('@')[0] || undefined,
          isSignup: mode === 'signup'
        });
        return;
      }
      setParsedError(analyzed);
      setErrorMsg(analyzed.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setParsedError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const analyzed = parseFirebaseAuthError(err, currentHostname, firebaseConfig.projectId);
      if (analyzed.shouldAutoFallbackToDemo) {
        onQuickDemoAccess();
        return;
      }
      if (analyzed.isPopupBlocked) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          // If redirect also fails, show the analyzed error below
        }
      }
      setParsedError(analyzed);
      setErrorMsg(analyzed.userMessage);
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
                setParsedError(null);
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
                setParsedError(null);
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
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
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
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
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
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 text-slate-900"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="font-medium break-words">{errorMsg}</p>

                  {parsedError?.isUnauthorizedDomain && (
                    <div className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                      <p className="font-semibold text-slate-900">
                        Vercel / Custom Domain par Google Login on karne ka tareeqa (30 sec fix):
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600">
                        <li>
                          Firebase Console kholein (Project:{' '}
                          <span className="font-mono font-semibold text-slate-900">
                            {firebaseConfig.projectId}
                          </span>
                          )
                        </li>
                        <li>
                          <span className="font-semibold text-slate-800">
                            Authentication → Settings → Authorized domains
                          </span>{' '}
                          mein jayein
                        </li>
                        <li>
                          <span className="font-semibold text-slate-800">Add domain</span> par click
                          karein aur yeh domain paste karein:
                        </li>
                      </ol>

                      <div className="flex items-center justify-between gap-2 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5">
                        <code className="font-mono text-xs font-bold text-slate-900 truncate">
                          {parsedError.unauthorizedHostname}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyDomain(parsedError.unauthorizedHostname)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-white border border-slate-300 rounded text-slate-800 hover:bg-slate-50 shrink-0"
                        >
                          {copiedDomain ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Domain</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <a
                          href={parsedError.firebaseConsoleAuthSettingsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
                        >
                          <span>Open Firebase Authorized Domains</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
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
