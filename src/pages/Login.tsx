import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Chrome, Loader2, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
  type MultiFactorResolver,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  completeTotpMfaSignIn,
  getMfaResolver,
  getTotpEnrollmentId,
  isMultiFactorRequiredError,
} from '../lib/mfa';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaOtp, setMfaOtp] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const clearMfa = () => {
    setMfaResolver(null);
    setMfaOtp('');
  };

  const ensureUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) return;

    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || null,
      role: 'user',
      subscriptionStatus: 'inactive',
      createdAt: new Date().toISOString(),
    }, { merge: true });
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver) return;
    const enrollmentId = getTotpEnrollmentId(mfaResolver);
    if (!enrollmentId) {
      toast.error('TOTP authenticator тохируулаагүй байна. Админтай холбогдоно уу.');
      return;
    }
    setLoading(true);
    try {
      await completeTotpMfaSignIn(mfaResolver, enrollmentId, mfaOtp);
      if (auth.currentUser) {
        await ensureUserProfile(auth.currentUser);
      }
      toast.success('Амжилттай нэвтэрлээ');
      clearMfa();
      navigate(from, { replace: true });
    } catch (error: unknown) {
      console.error('MFA sign-in error:', error);
      const code = (error as { code?: string })?.code;
      if (code === 'auth/invalid-verification-code') {
        toast.error('Код буруу байна. Дахин оролдоно уу.');
      } else {
        toast.error('Баталгаажуулалт амжилтгүй боллоо.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Имэйл болон нууц үгээ оруулна уу');
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserProfile(result.user);
      toast.success('Амжилттай нэвтэрлээ');
      navigate(from, { replace: true });
    } catch (error: unknown) {
      console.error('Login error:', error);
      if (isMultiFactorRequiredError(error)) {
        const resolver = getMfaResolver(error);
        const enrollmentId = getTotpEnrollmentId(resolver);
        if (!enrollmentId) {
          toast.error('Таны бүртгэлд SMS эсвэл бусад 2FA тохируулагдсан боловч TOTP authenticator олдсонгүй.');
          return;
        }
        setMfaResolver(resolver);
        toast.message('Authenticator апп-аас 6 оронтой кодыг оруулна уу');
        return;
      }
      const code = (error as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Имэйл эсвэл нууц үг буруу байна');
      } else {
        toast.error('Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await ensureUserProfile(user);

      toast.success('Амжилттай нэвтэрлээ');
      navigate(from, { replace: true });
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (isMultiFactorRequiredError(error)) {
        const resolver = getMfaResolver(error);
        const enrollmentId = getTotpEnrollmentId(resolver);
        if (!enrollmentId) {
          toast.error('Таны Google бүртгэлд TOTP authenticator олдсонгүй.');
          return;
        }
        setMfaResolver(resolver);
        toast.message('Authenticator апп-аас 6 оронтой кодыг оруулна уу');
        return;
      }
      console.error('Google login error:', error);
      toast.error('Google-ээр нэвтрэхэд алдаа гарлаа');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (mfaResolver) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/40 text-brand-icon">
              <Shield size={28} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-serif italic text-brand-ink mb-2">Хоёр шаттай баталгаажуулалт</h1>
            <p className="text-brand-ink/60 font-light text-sm">Authenticator апп-аас 6 оронтой кодыг оруулна уу</p>
          </div>

          <div className="bg-secondary/30 backdrop-blur-sm p-8 rounded-[32px] border border-secondary shadow-sm">
            <form onSubmit={(e) => void handleMfaSubmit(e)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-4">
                  Нэг удаагийн код
                </label>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="000000"
                  value={mfaOtp}
                  onChange={(e) => setMfaOtp(e.target.value)}
                  className="bg-white border-none rounded-2xl h-14 text-center font-mono text-lg tracking-[0.35em] focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-ink text-white rounded-2xl h-14 font-bold text-sm hover:bg-brand-icon transition-all group"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    Баталгаажуулах
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                  </>
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full rounded-2xl" onClick={clearMfa} disabled={loading}>
                Буцах
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif italic text-brand-ink mb-3">Тавтай морил</h1>
          <p className="text-brand-ink/60 font-light">Өөрийн бүртгэлээр нэвтэрч ороорой</p>
        </div>

        <div className="bg-secondary/30 backdrop-blur-sm p-8 rounded-[32px] border border-secondary shadow-sm">
          <form onSubmit={(e) => void handleEmailLogin(e)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-4">Имэйл хаяг</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink/20" size={18} />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 bg-white border-none rounded-2xl h-14 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Нууц үг</label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                  Нууц үг мартсан?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink/20" size={18} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 bg-white border-none rounded-2xl h-14 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-ink text-white rounded-2xl h-14 font-bold text-sm hover:bg-brand-icon transition-all group"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Нэвтрэх
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                </>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-ink/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-transparent px-4 text-brand-ink/40">Эсвэл</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => void handleGoogleLogin()}
            disabled={googleLoading}
            className="w-full bg-white border-brand-ink/10 text-brand-ink rounded-2xl h-14 font-bold text-sm hover:bg-gray-50 transition-all"
          >
            {googleLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Chrome className="mr-2" size={18} />
                Google-ээр нэвтрэх
              </>
            )}
          </Button>

          <p className="text-center mt-8 text-sm text-brand-ink/60 font-light">
            Бүртгэлгүй юу?{' '}
            <Link to="/signup" className="text-primary font-bold hover:underline">
              Бүртгүүлэх
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
