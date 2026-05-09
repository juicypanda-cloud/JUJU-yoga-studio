import React, { useState, useEffect } from 'react';
import { Timestamp, collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, BookOpen, MapPin, Video } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    users: 0,
    bookings: 0,
    retreats: 0,
    online: 0,
  });
  const [seeding, setSeeding] = useState(false);

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

  const seedCollection = async (collectionName: string, docs: Array<{ id: string; data: Record<string, unknown> }>) => {
    for (const entry of docs) {
      await setDoc(doc(db, collectionName, entry.id), entry.data, { merge: true });
    }
  };

  const handleSeedContent = async () => {
    if (seeding) return;
    setSeeding(true);
    const now = Timestamp.now();

    const classesSeed = [
      {
        id: 'seed_offline_hatha_flow',
        data: {
          title: 'Hatha Flow үндэс',
          type: 'offline',
          description: 'Анхан болон дунд түвшинд зориулсан амьсгал ба суурь хөдөлгөөний хичээл.',
          duration: '60 мин',
          teacherId: 'seed_teacher_1',
          teacher: 'Номин',
          image: 'https://images.unsplash.com/photo-1510894347713-fc3ed6fdf539?auto=format&fit=crop&w=1600&q=80',
          category: 'Hatha',
          price: 45000,
          benefits: ['Амьсгал тэнцвэржүүлэх', 'Биеийн уян хатан чанар сайжруулах', 'Стресс бууруулах'],
          scheduleSlots: [
            { dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' },
            { dayOfWeek: 'Лхагва', startTime: '18:30', endTime: '19:30' },
          ],
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'seed_online_morning_energy',
        data: {
          title: 'Өглөөний эрч хүч',
          type: 'online',
          description: 'Өдөр эхлэхээс өмнө 20 минутын хөнгөн хөдөлгөөн ба амьсгал.',
          duration: '20 мин',
          teacherId: 'seed_teacher_1',
          teacher: 'Номин',
          image: 'https://img.youtube.com/vi/4pKly2JojMw/hqdefault.jpg',
          category: 'Yoga',
          videoUrl: 'https://www.youtube.com/watch?v=4pKly2JojMw',
          price: 30000,
          benefits: ['Эрч хүч сэргээх', 'Анхаарал төвлөрүүлэх'],
          scheduleSlots: [{ dayOfWeek: 'Ням', startTime: '07:30', endTime: '07:50' }],
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'seed_audio_breath_reset',
        data: {
          title: 'Амьсгалын reset',
          type: 'audio',
          description: 'Түр зуурын стрессийг бууруулах 15 минутын амьсгалын аудио.',
          duration: '15 мин',
          teacherId: 'seed_teacher_3',
          teacher: 'Тэмүүлэн',
          image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1600&q=80',
          category: 'Meditation',
          audioUrl: 'https://www.youtube.com/watch?v=aEqlQvczMJQ',
          price: 25000,
          benefits: ['Стресс бууруулах', 'Нойрны чанар дэмжих'],
          scheduleSlots: [{ dayOfWeek: 'Пүрэв', startTime: '21:00', endTime: '21:15' }],
          createdAt: now,
          updatedAt: now,
        },
      },
    ];

    const onlineContentSeed = [
      {
        id: 'seed_online_library_video_1',
        data: {
          title: 'Core Flow 25',
          type: 'video',
          duration: '25:00',
          mediaURL: 'https://www.youtube.com/watch?v=v7AYKMP6rOE',
          thumbnailURL: 'https://img.youtube.com/vi/v7AYKMP6rOE/hqdefault.jpg',
          category: 'Yoga',
          level: 'Beginner',
          teacherName: 'Саруул',
          description: 'Core болон тэнцвэрт чиглэсэн богино хугацааны видео хичээл.',
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'seed_online_library_audio_1',
        data: {
          title: 'Оройн бясалгал 12 мин',
          type: 'audio',
          duration: '12:00',
          mediaURL: 'https://www.youtube.com/watch?v=inpok4MKVLM',
          thumbnailURL: 'https://img.youtube.com/vi/inpok4MKVLM/hqdefault.jpg',
          category: 'Meditation',
          level: 'Beginner',
          teacherName: 'Тэмүүлэн',
          description: 'Орой унтахын өмнөх богино guided meditation.',
          createdAt: now,
          updatedAt: now,
        },
      },
    ];

    const blogSeed = [
      {
        id: 'seed_blog_morning_routine',
        data: {
          title: 'Өглөөг зөв эхлүүлэх 5 алхам',
          excerpt: '10-15 минутын энгийн дадлаар өдрийн бүтээмж, сэтгэл зүйг сайжруулах арга.',
          content:
            '<p>Өглөөний богино хугацааны иог болон амьсгалын дасгал нь бие, сэтгэлд тэнцвэр өгдөг.</p><p>Эхний 5 минутад зөөлөн сунгалт, дараагийн 5 минутад амьсгалын дасгал, сүүлд нь 2-3 минут анхаарал төвлөрүүлэх дасгал хийж хэвшээрэй.</p>',
          image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1600&q=80',
          category: 'WELLNESS',
          date: '15 Apr 2026',
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'seed_blog_mindfulness_work',
        data: {
          title: 'Ажил дээр mindfulness хэрэгжүүлэх нь',
          excerpt: 'Анхаарал сарнилт бууруулах, стресс удирдах өдөр тутмын хэрэгжүүлэх техникүүд.',
          content:
            '<p>Mindfulness бол төвлөрөл болон сэтгэл хөдлөлийн зохицуулалтад өндөр нөлөөтэй.</p><p>50 минут ажиллаад 5 минутын завсарлага авч, 4-7-8 амьсгалын техникийг ашиглаарай.</p>',
          image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80',
          category: 'MINDFULNESS',
          date: '12 Apr 2026',
          createdAt: now,
          updatedAt: now,
        },
      },
    ];

    const retreatsSeed = [
      {
        id: 'seed_retreat_terelj_summer',
        data: {
          title: 'Тэрэлж зуны амралт ретрит',
          description: 'Байгальд 3 өдөр, иог + бясалгал + mindful walk хөтөлбөр.',
          location: 'Тэрэлж, Улаанбаатар',
          date: '2026.07.12 - 2026.07.14',
          duration: '2 шөнө, 3 өдөр',
          price: 690000,
          image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
          status: 'upcoming',
          createdAt: now,
          updatedAt: now,
        },
      },
      {
        id: 'seed_retreat_khuvsgul_autumn',
        data: {
          title: 'Хөвсгөл намрын deep reset',
          description: 'Дуу чимээнээс хол, дотоод төвлөрөл сэргээх 5 өдрийн retreat.',
          location: 'Хөвсгөл нуур',
          date: '2026.09.20 - 2026.09.25',
          duration: '5 шөнө, 6 өдөр',
          price: 1290000,
          image: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=1600&q=80',
          status: 'upcoming',
          createdAt: now,
          updatedAt: now,
        },
      },
    ];

    try {
      await seedCollection('classes', classesSeed);
      await seedCollection('onlineContent', onlineContentSeed);
      await seedCollection('blog', blogSeed);
      await seedCollection('retreats', retreatsSeed);
      await fetchStats();
      toast.success('Жишиг бодит контент амжилттай нэмэгдлээ');
    } catch (error) {
      console.error('Seed content error:', error);
      toast.error('Контент нэмэхэд алдаа гарлаа. Та admin эрхтэй эсэхээ шалгана уу.');
    } finally {
      setSeeding(false);
    }
  };

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
        <Button
          onClick={handleSeedContent}
          disabled={seeding}
          className="h-12 shrink-0 rounded-full bg-brand-ink px-8 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand-ink/20 transition hover:bg-brand-icon hover:shadow-brand-icon/25"
        >
          {seeding ? 'Нэмж байна...' : 'Бодит контент нэмэх'}
        </Button>
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
