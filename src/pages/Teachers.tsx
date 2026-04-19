import React from 'react';
import { motion } from 'motion/react';

const teachers = [
  {
    name: 'Ариунаа',
    role: 'Ахлах багш',
    bio: '10 гаруй жилийн туршлагатай, Hatha болон Vinyasa чиглэлээр мэргэшсэн.',
    image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&q=80&w=800'
  },
  {
    name: 'Болд',
    role: 'Бясалгалын багш',
    bio: 'Майндфүлнэс болон гүн бясалгалын чиглэлээр Оксфордын хөтөлбөрт хамрагдсан.',
    image: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=800'
  },
  {
    name: 'Сараа',
    role: 'Йог багш',
    bio: 'Yin йог болон нөхөн сэргээх эмчилгээний чиглэлээр ажилладаг.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800'
  }
];

export const Teachers: React.FC = () => {
  return (
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink">Манай багш нар</h1>
          <p className="text-lg text-brand-ink/60 font-light leading-relaxed">
            Таныг эрүүл мэндийн аялалд тань хөтлөх мэргэжлийн баг хамт олон.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {teachers.map((teacher, i) => (
            <motion.div
              key={teacher.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="relative aspect-square rounded-full overflow-hidden mb-8 max-w-[240px] mx-auto shadow-2xl shadow-brand-ink/10 hover:-translate-y-2 transition-all duration-500">
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-2xl font-light mb-2 text-brand-ink">{teacher.name}</h3>
              <p className="text-primary font-medium mb-4">{teacher.role}</p>
              <p className="text-brand-ink/60 text-sm leading-relaxed">{teacher.bio}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
