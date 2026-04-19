import React from 'react';
import { motion } from 'motion/react';
import { Heart, Users, Sparkles, Wind, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
export const About: React.FC = () => {
  return (
    <div className="w-full bg-white">
      {/* Hero Section */}
      <section className="relative pt-48 pb-32 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink"
            >
              Бие болон сэтгэлийн <br />
              <span className="italic text-brand-icon">амар амгалан</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-brand-ink/60 font-light leading-relaxed"
            >
              Mya Wellbeing бол зөвхөн студи биш, энэ бол таны өөрийгөө нээх, дотоод амар амгаланг олох аялалын эхлэл юм.
            </motion.p>
          </div>
        </div>
        
        {/* Decorative Element */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white -z-10 hidden lg:block" />
      </section>

      {/* Image Section - Editorial Layout */}
      <section id="story" className="pb-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative md:col-span-7 aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl shadow-brand-ink/5"
            >
              <img
                src="https://picsum.photos/seed/studio-about-1/1200/900"
                alt="Our Studio Space"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="md:col-span-5 space-y-8 md:pl-12"
            >
              <h2 className="text-4xl font-serif text-brand-ink leading-tight">
                Манай түүх
              </h2>
              <div className="space-y-6 text-brand-ink/60 font-light leading-relaxed">
                <p>
                  Бид 2020 онд хүмүүст өдөр тутмын стрессээс ангижрах, сэтгэл зүйн эрүүл мэндээ хамгаалахад нь туслах зорилгоор үүд хаалгаа нээсэн.
                </p>
                <p>
                  Өнөөдөр бид Оксфордын Майндфүлнэс хөтөлбөрийг албан ёсны эрхтэйгээр зааж, олон зуун суралцагчдад амьдралын чанараа сайжруулахад нь тусалж байна.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section id="values" className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-serif text-brand-ink mb-6">Бидний үнэт зүйлс</h2>
            <p className="text-brand-ink/60 font-light">Бидний үйл ажиллагаа бүрийн ард байдаг үндсэн зарчмууд.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { title: 'Чин сэтгэл', desc: 'Бид суралцагч бүрт чин сэтгэлээсээ хандаж, тэдний хөгжлийг дэмждэг.', icon: Heart },
              { title: 'Нийгэмлэг', desc: 'Ижил зорилготой, найрсаг хамт олныг бүрдүүлэх нь бидний зорилго.', icon: Users },
              { title: 'Чанар', desc: 'Олон улсын стандартад нийцсэн, шинжлэх ухааны үндэслэлтэй хөтөлбөрүүд.', icon: Sparkles },
              { title: 'Тэнцвэр', desc: 'Бие болон сэтгэл зүйн төгс тэнцвэрийг олоход бид тусална.', icon: Wind },
            ].map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-10 rounded-[2rem] shadow-2xl shadow-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-2 transition-all duration-500 group w-full md:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-[320px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-50 text-brand-icon flex items-center justify-center mb-8 group-hover:bg-brand-icon group-hover:text-white transition-all duration-500">
                  <value.icon size={28} />
                </div>
                <h3 className="text-xl font-serif text-brand-ink mb-4">{value.title}</h3>
                <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className="py-32">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-5xl font-serif text-brand-ink leading-tight">
                Бидний эрхэм зорилго
              </h2>
              <p className="text-xl text-brand-ink/60 font-light leading-relaxed">
                Хүн бүрт өөрийн дотоод нөөц бололцоогоо нээж, илүү ухамсартай, аз жаргалтай амьдрахад нь туслах мэргэжлийн орчин, удирдамжийг бүрдүүлэх.
              </p>
              <div className="pt-8">
                <Link to="/classes">
                  <Button variant="link" className="p-0 h-auto text-[11px] font-black tracking-[0.2em] uppercase text-brand-icon hover:text-brand-icon/80 transition-colors group">
                    Хичээлүүдтэй танилцах
                    <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative aspect-square rounded-[3rem] overflow-hidden"
            >
              <img
                src="https://picsum.photos/seed/studio-about-2/1000/1000"
                alt="Meditation"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-0 bg-brand-ink/10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-brand-ink text-white overflow-hidden relative">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-serif mb-12 leading-tight"
            >
              Та өөртөө цаг гаргахад <br />
              <span className="italic text-white/55">бэлэн үү?</span>
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row justify-center gap-6"
            >
              <Link to="/schedule">
                <Button className="bg-white text-brand-ink hover:bg-brand-icon hover:text-white rounded-full px-12 py-7 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl">
                  Хуваарь үзэх
                </Button>
              </Link>
              <Link to="/contact">
                <Button className="bg-white text-brand-ink hover:bg-brand-icon hover:text-white rounded-full px-12 py-7 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl">
                  Холбоо барих
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-icon/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-icon/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </section>
    </div>
  );
};
