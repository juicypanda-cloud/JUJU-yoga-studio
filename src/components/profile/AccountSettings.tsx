import React from 'react';
import { CreditCard, ShieldCheck, Calendar, User, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { UserDocument } from '../../types';

interface AccountSettingsProps {
  profile: UserDocument | null;
  isSubscribed: boolean;
  onLogout: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ profile, isSubscribed, onLogout }) => {
  const subscriptionPlanLabel = (() => {
    const plan = String(profile?.subscriptionPlanId || profile?.subscriptionStatus || '').trim().toLowerCase();
    if (plan === 'online-video') return 'Online Video';
    if (plan === 'online-audio') return 'Online Audio';
    if (plan === 'yearly') return 'Жилийн багц';
    return 'Сарын багц';
  })();

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
      {/* Subscription Info */}
      <div className="space-y-8">
        <h3 className="text-xl font-serif text-brand-ink flex items-center gap-3">
          <CreditCard className="text-brand-icon" size={20} />
          Гишүүнчлэлийн төлөв
        </h3>

        <div
          className={`rounded-[2rem] border p-5 transition-all duration-500 sm:p-8 ${
            isSubscribed ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-brand-ink/5'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <span
              className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                isSubscribed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {isSubscribed ? 'Идэвхтэй' : 'Идэвхгүй'}
            </span>
            {isSubscribed && <span className="text-xs text-brand-ink/40 font-light">{subscriptionPlanLabel}</span>}
          </div>

          {isSubscribed ? (
            <div className="space-y-4">
              <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                Таны гишүүнчлэл {profile?.subscriptionExpiresAt ? new Date(profile.subscriptionExpiresAt).toLocaleDateString() : 'идэвхтэй'} хүртэл хүчинтэй байна.
              </p>
              <Link to="/online">
                <Button
                  variant="link"
                  className="p-0 h-auto text-brand-icon hover:text-brand-icon/80 text-xs font-bold uppercase tracking-widest"
                >
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
            <span className="text-sm text-brand-ink font-medium capitalize">{profile?.role || 'Хэрэглэгч'}</span>
          </div>
        </div>

        <div className="pt-8">
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full rounded-full py-6 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-500 text-[10px] font-black tracking-widest uppercase"
          >
            <LogOut size={16} className="mr-2" />
            Системээс гарах
          </Button>
        </div>
      </div>
    </div>
  );
};
