import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'sonner';

const resetContinueUrl = () => `${window.location.origin}/login`;

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      toast.error('Имэйл хаягаа оруулна уу');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalized, {
        url: resetContinueUrl(),
        handleCodeInApp: false,
      });
      setSent(true);
      // Same message regardless of whether the address is registered (reduces email enumeration).
      toast.success('Хэрэв энэ хаяг бүртгэлтэй бол нууц үг сэргээх заавар имэйлээр илгээгдэнэ.');
    } catch (error: unknown) {
      console.error('Reset error:', error);
      const code = (error as { code?: string })?.code;
      if (code === 'auth/invalid-email') {
        toast.error('Имэйл хаяг буруу байна.');
      } else if (code === 'auth/too-many-requests') {
        toast.error('Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.');
      } else {
        toast.error('Илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center bg-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link 
          to="/login" 
          className="inline-flex items-center text-xs font-black uppercase tracking-widest text-brand-ink/40 hover:text-primary transition-colors mb-8"
        >
          <ChevronLeft size={16} className="mr-1" />
          Буцах
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif italic text-brand-ink mb-3">Нууц үг сэргээх</h1>
          <p className="text-brand-ink/60 font-light">
            {sent
              ? 'Имэйлээ шалгаад зааврыг дагана уу. Хавтас ороогүй бол «Спам» хавтсыг шалгана уу.'
              : 'Бүртгэлтэй имэйл хаягаа оруулна уу'}
          </p>
        </div>

        <div className="bg-secondary/30 backdrop-blur-sm p-8 rounded-[32px] border border-secondary shadow-sm">
          <form onSubmit={(e) => void handleReset(e)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-4">Имэйл хаяг</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink/20" size={18} />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sent}
                  className="pl-12 bg-white border-none rounded-2xl h-14 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || sent}
              className="w-full bg-brand-ink text-white rounded-2xl h-14 font-bold text-sm hover:bg-brand-icon transition-all group"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : sent ? (
                'Илгээгдсэн'
              ) : (
                <>
                  Илгээх
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
