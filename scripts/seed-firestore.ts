import { initializeApp } from 'firebase/app';
import { Timestamp, doc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'gen-lang-client-0968768098',
  appId: '1:543740323114:web:cbf4dd260f6820a857ea53',
  apiKey: 'AIzaSyBKbKDnqLe9mywStjr2sXfY7zG9Pon0a9g',
  authDomain: 'gen-lang-client-0968768098.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-106d753f-3d40-40e6-9d7e-4f7b7903479c',
  storageBucket: 'gen-lang-client-0968768098.firebasestorage.app',
  messagingSenderId: '543740323114',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
    id: 'seed_offline_evening_vinyasa',
    data: {
      title: 'Оройн Vinyasa',
      type: 'offline',
      description: 'Ажлын өдрийн дараах тайвшрах, хүч сэргээх виньяса урсгал.',
      duration: '75 мин',
      teacherId: 'seed_teacher_2',
      teacher: 'Саруул',
      image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=1600&q=80',
      category: 'Vinyasa',
      price: 50000,
      benefits: ['Булчингийн тэнцвэр', 'Сэтгэл тайвшруулах', 'Биеийн хүч нэмэгдүүлэх'],
      scheduleSlots: [
        { dayOfWeek: 'Мягмар', startTime: '19:00', endTime: '20:15' },
        { dayOfWeek: 'Баасан', startTime: '19:00', endTime: '20:15' },
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
    id: 'seed_online_library_video_2',
    data: {
      title: 'Гүн сунгалтын хичээл',
      type: 'video',
      duration: '32:40',
      mediaURL: 'https://www.youtube.com/watch?v=1f8yoFFdkcY',
      thumbnailURL: 'https://img.youtube.com/vi/1f8yoFFdkcY/hqdefault.jpg',
      category: 'Yoga',
      level: 'All Levels',
      teacherName: 'Номин',
      description: 'Нуруу, гуя, мөрний хэсэгт төвлөрсөн аажуу сунгалтын хөтөлбөр.',
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
  {
    id: 'seed_online_library_audio_2',
    data: {
      title: 'Анхаарал төвлөрүүлэх амьсгал',
      type: 'audio',
      duration: '10:30',
      mediaURL: 'https://www.youtube.com/watch?v=SEfs5TJZ6Nk',
      thumbnailURL: 'https://img.youtube.com/vi/SEfs5TJZ6Nk/hqdefault.jpg',
      category: 'Meditation',
      level: 'All Levels',
      teacherName: 'Номин',
      description: 'Ажил эхлэхийн өмнөх төвлөрөл нэмэгдүүлэх амьсгалын дасгал.',
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
  {
    id: 'seed_blog_flexibility_guide',
    data: {
      title: 'Уян хатан байдлыг аюулгүй сайжруулах гарын авлага',
      excerpt: 'Сунгалтын зөв дараалал, аюулгүй техник, дахин сэргэх зөвлөмжүүд.',
      content:
        '<p>Сунгалт хийхдээ халалт заавал хийж, өвдөлт мэдрэгдэхээс өмнө зогсох нь хамгийн чухал.</p><p>Долоо хоногт 3-4 удаа 20 минутын routine баримталснаар үр дүн тогтвортой нэмэгдэнэ.</p>',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80',
      category: 'YOGA',
      date: '08 Apr 2026',
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

const seedCollection = async (collectionName: string, docs: Array<{ id: string; data: Record<string, unknown> }>) => {
  for (const entry of docs) {
    await setDoc(doc(db, collectionName, entry.id), entry.data, { merge: true });
  }
};

const run = async () => {
  console.log('Seeding Firestore...');
  await seedCollection('classes', classesSeed);
  await seedCollection('onlineContent', onlineContentSeed);
  await seedCollection('blog', blogSeed);
  await seedCollection('retreats', retreatsSeed);
  console.log('Seed complete.');
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
