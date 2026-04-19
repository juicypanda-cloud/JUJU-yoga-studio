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
            '<p>Өглөөний богино хугацааны йог болон амьсгалын дасгал нь бие, сэтгэлд тэнцвэр өгдөг.</p><p>Эхний 5 минутад зөөлөн сунгалт, дараагийн 5 минутад амьсгалын дасгал, сүүлд нь 2-3 минут анхаарал төвлөрүүлэх дасгал хийж хэвшээрэй.</p>',
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
          description: 'Байгальд 3 өдөр, йог + бясалгал + mindful walk хөтөлбөр.',
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
    { title: 'Нийт хэрэглэгч', value: stats.users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Захиалгууд', value: stats.bookings, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Идэвхтэй ретрит', value: stats.retreats, icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Онлайн хичээл', value: stats.online, icon: Video, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-light">Хянах самбар</h1>
        <Button
          onClick={handleSeedContent}
          disabled={seeding}
          className="bg-brand-ink text-white rounded-full px-6"
        >
          {seeding ? 'Нэмж байна...' : 'Бодит контент нэмэх'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/30 mb-1">{stat.title}</p>
                <p className="text-2xl font-serif text-brand-ink">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-light">Сүүлийн үеийн үйл ажиллагаа</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-brand-ink/40 text-sm font-light">Одоогоор үйл ажиллагаа байхгүй байна.</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-light">Системийн төлөв</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Firestore холболт</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Идэвхтэй</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage үйлчилгээ</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Идэвхтэй</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Auth үйлчилгээ</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Идэвхтэй</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
