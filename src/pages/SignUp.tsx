import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Chrome, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const getSignupErrorMessage = (code?: string) => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Энэ имэйл хаяг аль хэдийн бүртгэлтэй байна';
    case 'auth/invalid-email':
      return 'Имэйл хаяг буруу байна';
    case 'auth/weak-password':
      return 'Нууц үг сул байна. Илүү хүчтэй нууц үг ашиглана уу';
    case 'auth/network-request-failed':
      return 'Сүлжээний алдаа гарлаа. Интернэтээ шалгаад дахин оролдоно уу';
    case 'auth/operation-not-allowed':
      return 'Email/Password нэвтрэлт идэвхгүй байна. Firebase Console дээр Authentication -> Sign-in method хэсгээс Email/Password-ийг идэвхжүүлнэ үү';
    default:
      return 'Бүртгүүлэхэд алдаа гарлаа. Дахин оролдоно уу.';
  }
};

export const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password) {
      toast.error('Бүх талбарыг бөглөнө үү');
      return;
    }

    if (password.length < 6) {
      toast.error('Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой');
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = result.user;

      await updateProfile(user, { displayName: trimmedName });

      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: trimmedName,
          photoURL: null,
          role: 'user',
          subscriptionStatus: 'inactive',
          createdAt: new Date().toISOString(),
        });
      } catch (firestoreError: any) {
        console.error('[SignUp] Firestore profile creation failed:', {
          code: firestoreError?.code,
          message: firestoreError?.message,
        });
        toast.error('Бүртгэл үүслээ, гэхдээ хэрэглэгчийн профайл хадгалахад алдаа гарлаа.');
      }

      toast.success('Бүртгэл амжилттай үүсгэгдлээ');
      navigate('/');
    } catch (error: any) {
      console.error('[SignUp] Firebase auth signup error:', {
        code: error?.code,
        message: error?.message,
      });
      toast.error(getSignupErrorMessage(error?.code));
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
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          subscriptionStatus: 'inactive',
          createdAt: new Date().toISOString(),
        });
      }
      
      toast.success('Амжилттай нэвтэрлээ');
      navigate('/');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Google login error:', error);
        toast.error('Google-ээр нэвтрэхэд алдаа гарлаа');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center bg-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif italic text-brand-ink mb-3">Бүртгүүлэх</h1>
          <p className="text-brand-ink/60 font-light">Шинэ бүртгэл үүсгэж бидэнтэй нэгдээрэй</p>
        </div>

        <div className="bg-secondary/30 backdrop-blur-sm p-8 rounded-[32px] border border-secondary shadow-sm">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-4">Таны нэр</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink/20" size={18} />
                <Input 
                  type="text" 
                  placeholder="Нэрээ оруулна уу"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-12 bg-white border-none rounded-2xl h-14 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

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
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-4">Нууц үг</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink/20" size={18} />
                <Input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 bg-white border-none rounded-2xl h-14 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-ink/30 hover:text-brand-ink/60 transition-colors"
                  aria-label={showPassword ? 'Нууц үг нуух' : 'Нууц үг харах'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-brand-ink text-white rounded-2xl h-14 font-bold text-sm hover:bg-brand-icon transition-all group"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  Бүртгүүлэх
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
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full bg-white border-brand-ink/10 text-brand-ink rounded-2xl h-14 font-bold text-sm hover:bg-gray-50 transition-all"
          >
            {googleLoading ? <Loader2 className="animate-spin" /> : (
              <>
                <Chrome className="mr-2" size={18} />
                Google-ээр бүртгүүлэх
              </>
            )}
          </Button>

          <p className="text-center mt-6 text-xs text-brand-ink/50 font-light">
            <Link to="/forgot-password" className="text-primary font-bold hover:underline">
              Нууц үг мартсан уу?
            </Link>
          </p>

          <p className="text-center mt-6 text-sm text-brand-ink/60 font-light">
            Аль хэдийн бүртгэлтэй юу?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Нэвтрэх
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
