export interface ClassType {
  id: string;
  title: string;
  type: 'offline' | 'online' | 'audio';
  videoUrl?: string;
  audioUrl?: string;
  category: 'Yoga' | 'Meditation';
  schedule: string;
  time: string;
  duration: string;
  description: string;
  benefits: string[];
  image: string;
}

export const classData: ClassType[] = [
  {
    id: 'hatha-yoga',
    title: 'Хата Йог',
    type: 'offline',
    category: 'Yoga',
    schedule: 'Дав, Лха, Баа',
    time: '07:00, 18:30',
    duration: '75 мин',
    description: 'Хата йог нь бие махбодь болон сэтгэл санааг тэнцвэржүүлэх уламжлалт арга барил юм. Энэхүү хичээл нь амьсгалын дасгал (пранаяма), биеийн байрлал (асана) болон бясалгалыг хослуулдаг.',
    benefits: [
      'Уян хатан байдлыг сайжруулна',
      'Стресс бууруулна',
      'Биеийн хүчийг нэмэгдүүлнэ',
      'Төвлөрөл сайжруулна'
    ],
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'vinyasa-yoga',
    title: 'Виньяса Йог',
    type: 'offline',
    category: 'Yoga',
    schedule: 'Мяг, Пүр, Бям',
    time: '19:00',
    duration: '60 мин',
    description: 'Виньяса йог нь амьсгал болон хөдөлгөөнийг нэгэн хэмнэлд оруулж, урсгал хөдөлгөөнөөр хичээллэдэг динамик төрөл юм. Биеийн халаалт болон эрч хүчийг нэмэгдүүлэхэд тустай.',
    benefits: [
      'Зүрх судасны үйл ажиллагааг дэмжинэ',
      'Калори шатаана',
      'Биеийн тэнцвэрийг сайжруулна',
      'Эрч хүч нэмэгдүүлнэ'
    ],
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'yin-yoga',
    title: 'Инь Йог',
    type: 'offline',
    category: 'Yoga',
    schedule: 'Лха, Баа',
    time: '20:15',
    duration: '90 мин',
    description: 'Инь йог нь гүнзгий сунгалт болон тайвшралд анхаарлаа хандуулсан удаан хэмнэлтэй төрөл юм. Биеийн холбогч эдүүдэд нөлөөлж, дотоод амар амгаланг олоход тусалдаг.',
    benefits: [
      'Гүнзгий сунгалт',
      'Үе мөчний эрүүл мэндийг дэмжинэ',
      'Сэтгэл санааг тайвшруулна',
      'Эрчим хүчний урсгалыг тэнцвэржүүлнэ'
    ],
    image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'mindfulness-meditation',
    title: 'Майндфүлнэс Бясалгал',
    type: 'offline',
    category: 'Meditation',
    schedule: 'Бямба, Ням',
    time: '10:00',
    duration: '45 мин',
    description: 'Майндфүлнэс бясалгал нь одоо цагтаа төвлөрч, сэтгэл санаагаа шүүмжлэлгүйгээр ажиглах дадлага юм. Сэтгэл зүйн эрүүл мэндийг дэмжих шинжлэх ухааны үндэслэлтэй арга.',
    benefits: [
      'Сэтгэл түгшүүр бууруулна',
      'Унтах чанарыг сайжруулна',
      'Өөрийгөө танин мэдэх',
      'Сэтгэл хөдлөлөө зохицуулах'
    ],
    image: 'https://images.unsplash.com/photo-1528319725582-ddc096101511?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'sound-healing',
    title: 'Авиан засал',
    type: 'offline',
    category: 'Meditation',
    schedule: 'Баасан',
    time: '19:30',
    duration: '60 мин',
    description: 'Авиан засал нь дуу авианы долгионоор дамжуулан бие махбодь болон сэтгэл санааг гүн тайвшруулах бясалгал юм. Төвд цан, хонхны дууг ашигладаг.',
    benefits: [
      'Гүн тайвшрал',
      'Эсийн түвшинд нөхөн сэргээх',
      'Тархины үйл ажиллагааг амраах',
      'Стресс тайлах'
    ],
    image: 'https://images.unsplash.com/photo-1514533212735-5df27d970db0?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'breathwork',
    title: 'Амьсгалын дасгал',
    type: 'offline',
    category: 'Meditation',
    schedule: 'Мягмар',
    time: '08:00',
    duration: '30 мин',
    description: 'Амьсгалын дасгал нь тусгай техникүүдийг ашиглан биеийн эрчим хүчийг нэмэгдүүлж, сэтгэл санааг цэвэрлэх үйл явц юм. Өглөөг эрч хүчтэй эхлүүлэхэд тохиромжтой.',
    benefits: [
      'Цусны эргэлтийг сайжруулна',
      'Дархлаа дэмжинэ',
      'Сэтгэл санааг сэргээнэ',
      'Уушгины багтаамжийг нэмэгдүүлнэ'
    ],
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1200'
  }
];
