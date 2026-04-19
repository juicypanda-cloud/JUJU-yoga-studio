import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { multiFactor, TotpMultiFactorGenerator, type TotpSecret } from 'firebase/auth';
import { Shield, Loader2, KeyRound, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

type Props = {
  user: User;
};

const ISSUER = 'luju Yoga Studio';

function hasTotpFactor(user: User): boolean {
  return multiFactor(user).enrolledFactors.some((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID);
}

export const ProfileTotpMfa: React.FC<Props> = ({ user }) => {
  const [totpEnrolled, setTotpEnrolled] = useState(() => hasTotpFactor(user));
  const [busy, setBusy] = useState(false);
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const refreshMfaState = useCallback(async () => {
    await user.reload();
    setTotpEnrolled(hasTotpFactor(user));
  }, [user]);

  useEffect(() => {
    setTotpEnrolled(hasTotpFactor(user));
  }, [user, user.uid]);

  const startEnrollment = async () => {
    if (hasTotpFactor(user)) {
      toast.error('Authenticator аль хэдийн идэвхтэй байна');
      return;
    }
    setBusy(true);
    try {
      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      setTotpSecret(secret);
      setVerifyCode('');
    } catch (e: unknown) {
      console.error('[MFA] start enrollment', e);
      const code = (e as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        toast.error(
          'Firebase Console → Authentication → Sign-in method дээр «Multi-factor authentication» (TOTP) идэвхжүүлнэ үү.'
        );
      } else {
        toast.error('Authenticator тохируулахад алдаа гарлаа. Дахин оролдоно уу.');
      }
    } finally {
      setBusy(false);
    }
  };

  const cancelEnrollment = () => {
    setTotpSecret(null);
    setVerifyCode('');
  };

  const confirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSecret) return;
    const trimmed = verifyCode.replace(/\s/g, '');
    if (trimmed.length < 6) {
      toast.error('6 оронтой кодыг оруулна уу');
      return;
    }
    setBusy(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, trimmed);
      await multiFactor(user).enroll(assertion, 'Authenticator app');
      toast.success('Хоёр шаттай баталгаажуулалт (2FA) амжилттай идэвхжлээ');
      cancelEnrollment();
      await refreshMfaState();
    } catch (e: unknown) {
      console.error('[MFA] enroll', e);
      const code = (e as { code?: string })?.code;
      if (code === 'auth/invalid-verification-code') {
        toast.error('Код буруу байна. Дахин оролдоно уу.');
      } else {
        toast.error('Баталгаажуулалт амжилтгүй боллоо.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUnenroll = async () => {
    const factor = multiFactor(user).enrolledFactors.find(
      (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
    if (!factor) {
      toast.error('Идэвхтэй authenticator олдсонгүй');
      return;
    }
    setBusy(true);
    try {
      await multiFactor(user).unenroll(factor);
      toast.success('2FA унтраагдлаа');
      await refreshMfaState();
    } catch (e: unknown) {
      console.error('[MFA] unenroll', e);
      const code = (e as { code?: string })?.code;
      if (code === 'auth/requires-recent-login') {
        toast.error('Аюулгүй байдлын шалтгаанаар дахин нэвтэрсний дараа унтраана уу.');
      } else {
        toast.error('2FA унтраахад алдаа гарлаа.');
      }
    } finally {
      setBusy(false);
    }
  };

  const qrUrl =
    totpSecret != null
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
          totpSecret.generateQrCodeUrl(user.email || user.uid || 'account', ISSUER)
        )}`
      : null;

  return (
    <div className="rounded-[2rem] border border-brand-ink/10 bg-secondary/10 p-8 space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-icon shadow-sm">
          <Shield size={22} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 space-y-1">
          <h4 className="font-serif text-lg text-brand-ink">Хоёр шаттай баталгаажуулалт (2FA)</h4>
          <p className="text-sm text-brand-ink/55 font-light leading-relaxed">
            Google Authenticator эсвэл Authy зэрэг TOTP апп ашиглан нэвтрэлтээ нэмэлтээр хамгаална. Firebase Console дээр MFA
            (TOTP) идэвхтэй байх ёстой.
          </p>
        </div>
      </div>

      {totpEnrolled ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-brand-ink/70 font-light">
            Authenticator апп идэвхтэй. Нэвтрэхдээ нэмэлт 6 оронтой код шаардана.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void handleUnenroll()}
            className="shrink-0 rounded-full border-red-100 text-red-600 hover:bg-red-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                2FA унтраах
              </>
            )}
          </Button>
        </div>
      ) : totpSecret ? (
        <form onSubmit={confirmEnrollment} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-start">
            {qrUrl ? (
              <div className="flex justify-center md:justify-start">
                <img src={qrUrl} alt="Authenticator QR" className="h-[180px] w-[180px] rounded-xl border border-brand-ink/10 bg-white p-2" />
              </div>
            ) : null}
            <div className="space-y-3 text-sm text-brand-ink/70 font-light">
              <p>1. Апп дээр шинэ данс нэмээд QR уншуулах эсвэл доорх нууц түлхүүрээр гараар оруулна уу.</p>
              <div className="rounded-xl border border-brand-ink/10 bg-white px-4 py-3 font-mono text-xs text-brand-ink break-all">
                {totpSecret.secretKey}
              </div>
              <p className="text-[11px] text-brand-ink/45">
                Дуусах хугацаа: {new Date(totpSecret.enrollmentCompletionDeadline).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40 ml-1">
              Аппын 6 оронтой код
            </label>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="rounded-2xl border-none bg-white h-12 font-mono tracking-[0.3em]"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy} className="rounded-full bg-brand-ink text-white">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Баталгаажуулах
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={cancelEnrollment} className="rounded-full">
              Цуцлах
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          disabled={busy}
          onClick={() => void startEnrollment()}
          className="rounded-full bg-brand-ink text-white"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" />
              Authenticator идэвхжүүлэх
            </>
          )}
        </Button>
      )}
    </div>
  );
};
