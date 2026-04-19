import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Calendar, CreditCard, ShieldCheck, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { auth } from '../firebase';
import { ProfileTotpMfa } from '../components/auth/ProfileTotpMfa';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, profile, isSubscribed } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/');
    return null;
  }

  const handleLogout = () => {
    signOut(auth);
    navigate('/');
  };

  return (
    <div className="pt-32 pb-32 min-h-screen bg-gray-50/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] shadow-2xl shadow-brand-ink/5 border border-brand-ink/5 overflow-hidden"
          >
            {/* Profile Header */}
            <div className="bg-brand-ink p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-icon/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="relative h-24 w-24 shrink-0 rounded-full border-4 border-white/10 overflow-hidden bg-secondary/25">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Профайл зураг'}
                      className="h-full w-full object-cover"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User size={40} className="text-white/40" />
                    </div>
                  )}
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-3xl font-serif mb-2">{user.displayName || 'Хэрэглэгч'}</h1>
                  <p className="text-white/60 font-light flex items-center justify-center md:justify-start gap-2">
                    <Mail size={14} />
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Subscription Info */}
                <div className="space-y-8">
                  <h3 className="text-xl font-serif text-brand-ink flex items-center gap-3">
                    <CreditCard className="text-brand-icon" size={20} />
                    Гишүүнчлэлийн төлөв
                  </h3>
                  
                  <div className={`p-8 rounded-[2rem] border transition-all duration-500 ${
                    isSubscribed 
                      ? 'bg-green-50/50 border-green-100' 
                      : 'bg-gray-50 border-brand-ink/5'
                  }`}>
                    <div className="flex items-center justify-between mb-6">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                        isSubscribed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isSubscribed ? 'Идэвхтэй' : 'Идэвхгүй'}
                      </span>
                      {isSubscribed && (
                        <span className="text-xs text-brand-ink/40 font-light">
                          {profile?.subscriptionPlan === 'yearly' ? 'Жилийн багц' : 'Сарын багц'}
                        </span>
                      )}
                    </div>
                    
                    {isSubscribed ? (
                      <div className="space-y-4">
                        <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                          Таны гишүүнчлэл {new Date(profile?.subscriptionEndDate).toLocaleDateString()} хүртэл хүчинтэй байна.
                        </p>
                        <Link to="/online">
                          <Button variant="link" className="p-0 h-auto text-brand-icon hover:text-brand-icon/80 text-xs font-bold uppercase tracking-widest">
                            Хичээл үзэх
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                          Та одоогоор гишүүнчлэлгүй байна. Онлайн сангийн хичээлүүдийг үзэхийн тулд гишүүн болоорой.
                        </p>
                        <Link to="/pricing">
                          <Button className="w-full bg-brand-ink text-white hover:bg-brand-icon rounded-full py-6 text-[10px] font-black tracking-widest uppercase transition-all duration-500">
                            Гишүүн болох
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-8">
                  <h3 className="text-xl font-serif text-brand-ink flex items-center gap-3">
                    <ShieldCheck className="text-brand-icon" size={20} />
                    Бүртгэлийн мэдээлэл
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between py-4 border-b border-brand-ink/5">
                      <div className="flex items-center gap-3 text-brand-ink/40">
                        <Calendar size={16} />
                        <span className="text-sm font-light">Бүртгүүлсэн огноо</span>
                      </div>
                      <span className="text-sm text-brand-ink font-medium">
                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Тодорхойгүй'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-brand-ink/5">
                      <div className="flex items-center gap-3 text-brand-ink/40">
                        <User size={16} />
                        <span className="text-sm font-light">Хэрэглэгчийн төрөл</span>
                      </div>
                      <span className="text-sm text-brand-ink font-medium capitalize">
                        {profile?.role || 'Хэрэглэгч'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button 
                      onClick={handleLogout}
                      variant="outline" 
                      className="w-full rounded-full py-6 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-500 text-[10px] font-black tracking-widest uppercase"
                    >
                      <LogOut size={16} className="mr-2" />
                      Системээс гарах
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-12 border-t border-brand-ink/10 pt-12">
                <ProfileTotpMfa user={user} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
