import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2, CheckCircle2, QrCode, Smartphone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

const plans = {
  monthly: { name: 'Сар бүр', price: 100 },
  yearly: { name: 'Жил бүр', price: 200 }
};

type PaymentSession = {
  invoiceId: string;
  qrText: string | null;
  qrImage: string | null;
  deeplink: string | null;
};

async function readJsonSafe(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function hasPaidStatus(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const stack: unknown[] = [payload];

  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    for (const value of Object.values(current as Record<string, unknown>)) {
      if (typeof value === 'string') {
        const normalized = value.toUpperCase();
        if (['PAID', 'SUCCESS', 'COMPLETED', 'SETTLED'].includes(normalized)) {
          return true;
        }
      } else if (Array.isArray(value)) {
        stack.push(...value);
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return false;
}

export const Checkout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const planId = searchParams.get('plan') as keyof typeof plans;
  const plan = plans[planId] || plans.monthly;

  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentCompleteMessage, setPaymentCompleteMessage] = useState('');
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [orderId, setOrderId] = useState('');
  const [useQrFallback, setUseQrFallback] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error('Эхлээд нэвтэрнэ үү');
      navigate('/');
      return;
    }
    setOrderId(`${user.uid}-${Date.now()}`);
  }, [user, navigate]);

  const activateSubscription = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      subscriptionStatus: 'active',
      subscriptionPlan: planId,
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: new Date(
        Date.now() + (planId === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  };

  const createInvoice = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const payload = {
        amount: plan.price,
        orderId,
        description: `JUJU ${plan.name} subscription`,
        receiverCode: 'terminal',
        senderBranchCode: 'ONLINE',
        receiverData: {
          name: pickString(profile?.displayName) ?? pickString(user.displayName) ?? 'JUJU user',
          email: pickString(user.email),
        },
      };

      const response = await fetch('/api/qpay/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(pickString(data?.error) ?? 'QPay invoice үүсгэхэд алдаа гарлаа');
      }

      const links = Array.isArray(data?.urls) ? data.urls : [];
      const deeplinkFromUrls = links
        .map((item: unknown) => (item && typeof item === 'object' ? (item as Record<string, unknown>).link : null))
        .find((v: unknown) => typeof v === 'string' && v.startsWith('qpay://'));

      const session: PaymentSession = {
        invoiceId: pickString(data?.invoice_id) ?? pickString(data?.invoiceId) ?? pickString(data?.id) ?? '',
        qrText: pickString(data?.qr_text) ?? pickString(data?.qrText) ?? pickString(data?.qrcode),
        qrImage: pickString(data?.qr_image) ?? pickString(data?.qr_image_url) ?? pickString(data?.qrImage),
        deeplink: pickString(data?.deeplink) ?? (deeplinkFromUrls as string | null),
      };

      if (!session.invoiceId) {
        throw new Error('invoice_id олдсонгүй. QPay response-оо шалгана уу.');
      }

      setPaymentSession(session);
      setUseQrFallback(false);
      toast.success('QPay QR амжилттай үүслээ');
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Төлбөр үүсгэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const checkPayment = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!paymentSession?.invoiceId || success) return;
    if (!silent && checkingPayment) return;
    if (!silent) setCheckingPayment(true);
    try {
      const response = await fetch('/api/qpay/payment/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: paymentSession.invoiceId }),
      });
      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(pickString(data?.error) ?? 'Төлбөр шалгах үед алдаа гарлаа');
      }

      if (hasPaidStatus(data)) {
        await activateSubscription();
        setSuccess(true);
        setPaymentCompleteMessage('Payment complete');
        toast.success('Payment complete');
      }
    } catch (error) {
      console.error('Payment check error:', error);
    } finally {
      if (!silent) setCheckingPayment(false);
    }
  };

  useEffect(() => {
    if (!paymentSession?.invoiceId || success) return;
    const interval = setInterval(() => {
      void checkPayment({ silent: true });
    }, 8000);
    return () => clearInterval(interval);
  }, [paymentSession?.invoiceId, success]);

  if (success) {
    return (
      <div className="pt-48 pb-32 min-h-screen bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-xl mx-auto text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-12"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <h2 className="text-4xl font-serif text-brand-ink mb-6">Баяр хүргэе!</h2>
            <p className="text-lg text-brand-ink/60 font-light leading-relaxed mb-12">
              Таны {plan.name} гишүүнчлэл идэвхжлээ. Одоо та манай онлайн сангийн бүх хичээлийг үзэх боломжтой.
            </p>
            <Button 
              onClick={() => navigate('/online')}
              className="bg-brand-ink text-white hover:bg-brand-icon rounded-full px-12 py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl"
            >
              Хичээл үзэж эхлэх
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-32 min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-brand-ink/40 hover:text-brand-ink transition-colors mb-12 group"
          >
            <ArrowLeft size={20} className="mr-2 transition-transform group-hover:-translate-x-1" />
            Буцах
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* QPay Payment */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-brand-ink/5 border border-brand-ink/5"
            >
              <h2 className="text-3xl font-serif text-brand-ink mb-12 flex items-center gap-4">
                <QrCode className="text-brand-icon" />
                QPay төлбөр
              </h2>

              {!paymentSession ? (
                <div className="space-y-8">
                  <p className="text-brand-ink/60 font-light leading-relaxed">
                    Картын мэдээлэл оруулах шаардлагагүй. QPay invoice үүсгээд QR уншуулж төлбөрөө хийж болно.
                  </p>
                  <Button
                    onClick={createInvoice}
                    disabled={loading}
                    className="w-full bg-brand-ink text-white hover:bg-brand-icon rounded-full py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        QR үүсгэж байна...
                      </span>
                    ) : (
                      `QPay QR үүсгэх: ${plan.price.toLocaleString()}₮`
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {paymentCompleteMessage ? (
                    <p className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
                      {paymentCompleteMessage}
                    </p>
                  ) : null}
                  <div className="rounded-3xl border border-brand-ink/10 bg-gray-50 p-8 flex flex-col items-center">
                    {paymentSession.qrImage || paymentSession.qrText ? (
                      <img
                        src={
                          !useQrFallback && paymentSession.qrImage
                            ? paymentSession.qrImage
                            :
                          `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                            paymentSession.qrText ?? paymentSession.invoiceId
                          )}`
                        }
                        alt="QPay QR"
                        className="w-64 h-64 rounded-2xl bg-white p-2"
                        onError={() => {
                          if (!useQrFallback) setUseQrFallback(true);
                        }}
                      />
                    ) : (
                      <div className="text-center text-sm text-brand-ink/50">
                        QR мэдээлэл ирээгүй байна.
                      </div>
                    )}
                    <p className="mt-4 text-xs text-brand-ink/40">Invoice: {paymentSession.invoiceId}</p>
                  </div>

                  {paymentSession.deeplink && (
                    <a
                      href={paymentSession.deeplink}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full py-4 bg-brand-icon text-white text-[11px] font-black tracking-[0.2em] uppercase"
                    >
                      <Smartphone size={14} />
                      QPay апп-аар нээх
                    </a>
                  )}

                  <Button
                    onClick={() => void checkPayment()}
                    disabled={checkingPayment}
                    className="w-full bg-brand-ink text-white hover:bg-brand-icon rounded-full py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl"
                  >
                    {checkingPayment ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        Төлбөр шалгаж байна...
                      </span>
                    ) : (
                      'Төлбөр шалгах'
                    )}
                  </Button>

                  <p className="text-center text-xs text-brand-ink/40 font-light">
                    Төлбөр төлөгдсөний дараа эрх автоматаар идэвхжинэ.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="bg-brand-ink text-white p-12 rounded-[3rem] shadow-2xl shadow-brand-ink/20">
                <h3 className="text-2xl font-serif mb-8 border-b border-white/10 pb-8">Захиалгын тойм</h3>
                
                <div className="space-y-6 mb-12">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 font-light">Төлөвлөгөө</span>
                    <span className="font-serif">{plan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 font-light">Хугацаа</span>
                    <span className="font-serif">{planId === 'yearly' ? '1 жил' : '1 сар'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 font-light">Хандалт</span>
                    <span className="font-serif">Хязгааргүй</span>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex justify-between items-end">
                  <div>
                    <p className="text-white/40 text-xs font-black tracking-widest uppercase mb-2">Нийт төлбөр</p>
                    <p className="text-4xl font-serif">{plan.price.toLocaleString()}₮</p>
                  </div>
                </div>
              </div>

              <div className="p-10 rounded-[2rem] border border-brand-ink/5 bg-white">
                <h4 className="text-lg font-serif text-brand-ink mb-4">Яагаад гишүүн болох хэрэгтэй вэ?</h4>
                <ul className="space-y-4">
                  {[
                    '100+ гаруй мэргэжлийн видео хичээл',
                    'Долоо хоног бүр шинэ контент',
                    'Хаанаас ч, хүссэн үедээ үзэх боломж',
                    'Студийн үйлчилгээнд тусгай хөнгөлөлт'
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-brand-ink/60 font-light">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-icon mt-1.5 shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
