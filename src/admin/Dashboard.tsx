import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, BookOpen, MapPin, Video } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    users: 0,
    bookings: 0,
    retreats: 0,
    online: 0,
  });

  const fetchStats = async () => {
    const usersSnap = await getDocs(collection(db, 'users'));
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    const retreatsSnap = await getDocs(collection(db, 'retreats'));
    const onlineSnap = await getDocs(collection(db, 'onlineContent'));

    setStats({
      users: usersSnap.size,
      bookings: bookingsSnap.size,
      retreats: retreatsSnap.size,
      online: onlineSnap.size,
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Нийт хэрэглэгч',
      value: stats.users,
      icon: Users,
      accent: 'from-violet-500/20 via-brand-icon/15 to-violet-600/5',
      iconColor: 'text-brand-icon',
      ring: 'ring-brand-icon/15',
    },
    {
      title: 'Захиалгууд',
      value: stats.bookings,
      icon: BookOpen,
      accent: 'from-emerald-500/20 to-emerald-600/5',
      iconColor: 'text-emerald-700',
      ring: 'ring-emerald-500/20',
    },
    {
      title: 'Идэвхтэй ретрит',
      value: stats.retreats,
      icon: MapPin,
      accent: 'from-amber-500/20 to-amber-600/5',
      iconColor: 'text-amber-800',
      ring: 'ring-amber-500/20',
    },
    {
      title: 'Онлайн хичээл',
      value: stats.online,
      icon: Video,
      accent: 'from-sky-500/20 to-sky-600/5',
      iconColor: 'text-sky-800',
      ring: 'ring-sky-500/20',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-icon">Админ самбар</p>
          <h1 className="mt-2 font-serif text-3xl font-light tracking-tight text-brand-ink sm:text-4xl">Хянах самбар</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-brand-ink/50">
            Сайтын үндсэн тоон үзүүлэлт, үйлчилгээний төлөвийг нэг дороос харна уу.
          </p>
        </div>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="group relative overflow-hidden rounded-3xl border border-brand-ink/[0.06] bg-white/85 shadow-[0_12px_40px_-20px_rgba(26,26,26,0.12)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-icon/20 hover:shadow-[0_20px_50px_-20px_rgba(122,106,189,0.18)]"
          >
            <div
              className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-80 blur-2xl ${stat.accent}`}
            />
            <CardContent className="relative flex items-center gap-4 p-6">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.accent} ring-1 ${stat.ring}`}
              >
                <stat.icon size={26} className={stat.iconColor} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-brand-ink/35">{stat.title}</p>
                <p className="font-serif text-3xl font-medium tabular-nums tracking-tight text-brand-ink">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <Card className="overflow-hidden rounded-3xl border border-brand-ink/[0.06] bg-white/90 shadow-[0_16px_48px_-28px_rgba(26,26,26,0.14)] backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-brand-icon/60 via-brand-icon/30 to-transparent" />
          <CardHeader className="pb-2 pt-6">
            <CardTitle className="font-serif text-xl font-light text-brand-ink">Сүүлийн үеийн үйл ажиллагаа</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <p className="rounded-2xl border border-dashed border-brand-ink/10 bg-stone-50/80 px-5 py-8 text-center text-sm text-brand-ink/45">
              Одоогоор үйл ажиллагаа байхгүй байна.
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-3xl border border-brand-ink/[0.06] bg-white/90 shadow-[0_16px_48px_-28px_rgba(26,26,26,0.14)] backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-emerald-500/50 via-emerald-400/30 to-transparent" />
          <CardHeader className="pb-2 pt-6">
            <CardTitle className="font-serif text-xl font-light text-brand-ink">Системийн төлөв</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="space-y-3">
              {['Firestore холболт', 'Storage үйлчилгээ', 'Auth үйлчилгээ'].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-brand-ink/[0.04] bg-stone-50/60 px-4 py-3.5"
                >
                  <span className="text-sm text-brand-ink/80">{label}</span>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-500/20">
                    Идэвхтэй
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
