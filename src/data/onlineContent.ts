export interface OnlineContent {
  id: string;
  title: string;
  type: 'video' | 'audio';
  category: 'Yoga' | 'Meditation';
  level: 'Анхан' | 'Дунд' | 'Ахисан';
  duration: string;
  thumbnailURL: string;
  mediaURL: string;
  description: string;
  teacherName: string;
}

export const onlineContentData: OnlineContent[] = [
  {
    id: 'morning-flow-1',
    title: 'Өглөөний эрч хүчтэй урсгал',
    type: 'video',
    category: 'Yoga',
    level: 'Анхан',
    duration: '20 мин',
    thumbnailURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    mediaURL: 'https://www.youtube.com/watch?v=v7AYKMP6rOE',
    description: 'Өглөөг эрч хүчтэй эхлүүлэхэд туслах 20 минутын йогийн урсгал. Биеийг сэрээж, анхаарлыг төвлөрүүлнэ.',
    teacherName: 'Ариунаа'
  },
  {
    id: 'deep-relaxation-meditation',
    title: 'Гүн тайвшралын бясалгал',
    type: 'video',
    category: 'Meditation',
    level: 'Анхан',
    duration: '15 мин',
    thumbnailURL: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    mediaURL: 'https://www.youtube.com/watch?v=inpok4MKVLM',
    description: 'Стресс болон түгшүүрийг бууруулах гүн тайвшралын бясалгал. Унтахын өмнө хийхэд нэн тохиромжтой.',
    teacherName: 'Бат-Эрдэнэ'
  },
  {
    id: 'core-strength-yoga',
    title: 'Биеийн төв хэсгийг чангалах йог',
    type: 'video',
    category: 'Yoga',
    level: 'Дунд',
    duration: '30 мин',
    thumbnailURL: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=800',
    mediaURL: 'https://www.youtube.com/watch?v=sTANio_2E0Q',
    description: 'Биеийн тэнцвэр болон хүчийг нэмэгдүүлэхэд чиглэсэн 30 минутын эрчимтэй хичээл.',
    teacherName: 'Саруул'
  },
  {
    id: 'mindful-breathing',
    title: 'Майндфүл амьсгалын дасгал',
    type: 'video',
    category: 'Meditation',
    level: 'Анхан',
    duration: '10 мин',
    thumbnailURL: 'https://images.unsplash.com/photo-1528319725582-ddc096101511?auto=format&fit=crop&q=80&w=800',
    mediaURL: 'https://www.youtube.com/watch?v=SEfs5TJZ6Nk',
    description: 'Ажлын дундуур эсвэл стресстэй үедээ хийх богино хэмжээний амьсгалын дасгал.',
    teacherName: 'Ариунаа'
  },
  {
    id: 'vinyasa-flow-intermediate',
    title: 'Виньяса урсгал - Дунд шат',
    type: 'video',
    category: 'Yoga',
    level: 'Дунд',
    duration: '45 мин',
    thumbnailURL: 'https://images.unsplash.com/photo-1514533212735-5df27d970db0?auto=format&fit=crop&q=80&w=800',
    mediaURL: 'https://www.youtube.com/watch?v=9kOCY0KNByw',
    description: 'Амьсгал болон хөдөлгөөнийг нэгтгэсэн динамик Виньяса урсгал.',
    teacherName: 'Саруул'
  },
  {
    id: 'evening-yin-yoga',
    title: 'Оройн Инь йог',
    type: 'video',
    category: 'Yoga',
    level: 'Анхан',
    duration: '25 мин',
    thumbnailURL: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    mediaURL: 'https://www.youtube.com/watch?v=v7AYKMP6rOE',
    description: 'Биеийг амрааж, уян хатан байдлыг нэмэгдүүлэх удаан хэмнэлтэй Инь йог.',
    teacherName: 'Бат-Эрдэнэ'
  }
];
