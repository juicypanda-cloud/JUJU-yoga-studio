import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

const plans = {
  monthly: { name: 'Сар бүр', price: 45000 },
  yearly: { name: 'Жил бүр', price: 390000 }
};

export const Checkout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const planId = searchParams.get('plan') as keyof typeof plans;
  const plan = plans[planId] || plans.monthly;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  useEffect(() => {
    if (!user) {
      toast.error('Төлбөр хийхийн тулд нэвтэрнэ үү');
      navigate('/retreats'); // Or a dedicated login page
    }
  }, [user, navigate]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          subscriptionStatus: 'active',
          subscriptionPlan: planId,
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: new Date(Date.now() + (planId === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
        });
        setSuccess(true);
        toast.success('Төлбөр амжилттай баталгаажлаа!');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Төлбөр хийхэд алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  };

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
            {/* Payment Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-brand-ink/5 border border-brand-ink/5"
            >
              <h2 className="text-3xl font-serif text-brand-ink mb-12 flex items-center gap-4">
                <CreditCard className="text-brand-icon" />
                Төлбөр хийх
              </h2>

              <form onSubmit={handlePayment} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black tracking-widest uppercase text-brand-ink/40 ml-2">Карт дээрх нэр</label>
                  <Input 
                    required
                    placeholder="JOHN DOE"
                    className="rounded-2xl border-brand-ink/10 py-7 px-6 focus:ring-brand-icon/20"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black tracking-widest uppercase text-brand-ink/40 ml-2">Картын дугаар</label>
                  <Input 
                    required
                    placeholder="0000 0000 0000 0000"
                    className="rounded-2xl border-brand-ink/10 py-7 px-6 focus:ring-brand-icon/20"
                    value={formData.cardNumber}
                    onChange={e => setFormData({...formData, cardNumber: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black tracking-widest uppercase text-brand-ink/40 ml-2">Хүчинтэй хугацаа</label>
                    <Input 
                      required
                      placeholder="MM/YY"
                      className="rounded-2xl border-brand-ink/10 py-7 px-6 focus:ring-brand-icon/20"
                      value={formData.expiry}
                      onChange={e => setFormData({...formData, expiry: e.target.value.replace(/\D/g, '').replace(/(.{2})/, '$1/').slice(0, 5)})}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black tracking-widest uppercase text-brand-ink/40 ml-2">CVC</label>
                    <Input 
                      required
                      type="password"
                      placeholder="***"
                      className="rounded-2xl border-brand-ink/10 py-7 px-6 focus:ring-brand-icon/20"
                      value={formData.cvc}
                      onChange={e => setFormData({...formData, cvc: e.target.value.slice(0, 3)})}
                    />
                  </div>
                </div>

                <div className="pt-8">
                  <Button 
                    disabled={loading}
                    className="w-full bg-brand-ink text-white hover:bg-brand-icon rounded-full py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        Төлбөр боловсруулж байна...
                      </span>
                    ) : (
                      `Төлөх: ${plan.price.toLocaleString()}₮`
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-3 text-brand-ink/30 text-xs font-light">
                  <ShieldCheck size={16} />
                  Таны төлбөрийн мэдээлэл нууцлагдсан, аюулгүй.
                </div>
              </form>
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
