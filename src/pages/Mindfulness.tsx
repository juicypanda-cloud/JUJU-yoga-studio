import React from 'react';
import { motion } from 'motion/react';
import { Heart, Wind, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

export const Mindfulness: React.FC = () => {
  return (
    <div className="w-full bg-white">
      {/* Header Section */}
      <section className="pt-32 pb-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center text-center gap-12">
            <div className="max-w-3xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-serif text-brand-ink mb-6 leading-tight"
              >
                Оксфордын Майндфүлнэс
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-brand-ink/60 font-light leading-relaxed"
              >
                Оксфордын Майндфүлнэс Сангаас санаа авсан, шинжлэх ухааны үндэслэлтэй хөтөлбөрүүдээр дамжуулан анхаарал төвлөрүүлэлтийн хүчийг мэдрээрэй.
              </motion.p>
              <div className="mt-12">
                <Link to="/schedule">
                  <Button className="bg-brand-ink text-white hover:bg-brand-icon rounded-full px-12 py-7 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl">
                    Дараагийн сургалтанд нэгдэх
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6">
        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32">
          {[
            { title: 'Шинжлэх ухааны үндэслэлтэй', icon: Sparkles, desc: 'Шинжлэх ухааны судалгаа болон сэтгэл зүйн зарчмууд дээр суурилсан хөтөлбөрүүд.' },
            { title: 'Мэргэжлийн удирдамж', icon: Heart, desc: 'Гүнзгий клиник туршлагатай, гэрчилгээжсэн майндфүлнэс багш нар удирдана.' },
            { title: 'Тогтвортой өөрчлөлт', icon: Wind, desc: 'Майндфүлнэсийг өдөр тутмын амьдралдаа хэрэгжүүлэх практик хэрэгслүүд.' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-10 rounded-[2rem] bg-white shadow-2xl shadow-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-2 transition-all duration-500 border border-brand-ink/5 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-50 text-brand-icon flex items-center justify-center mb-8 group-hover:bg-brand-icon group-hover:text-white transition-all duration-500">
                <item.icon size={32} />
              </div>
              <h3 className="text-2xl font-serif mb-6 text-brand-ink">{item.title}</h3>
              <p className="text-brand-ink/60 font-light leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Content Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-serif mb-10 text-brand-ink leading-tight">Майндфүлнэс гэж юу вэ?</h2>
            <div className="space-y-8 text-brand-ink/70 font-light leading-relaxed">
              <p className="text-lg">
                Майндфүлнэс гэдэг нь одоо цагт болж буй үйл явдалд шүүмжлэлгүйгээр, зорилготойгоор анхаарлаа хандуулах сэтгэл зүйн үйл явц юм.
              </p>
              <p>
                Манай 8 долоо хоногийн MBCT (Майндфүлнэст суурилсан танин мэдэхүйн засал) курс нь сэтгэл гутрал болон сэтгэл санааны хямралд орсон хүмүүст туслах зорилгоор тусгайлан боловсруулагдсан.
              </p>
              <ul className="space-y-6 pt-6">
                {['Стресс болон түгшүүрийг бууруулах', 'Анхаарал төвлөрөлтийг сайжруулах', 'Сэтгэл хөдлөлөө зохицуулах', 'Унтах чанарыг сайжруулах'].map((text) => (
                  <li key={text} className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-brand-icon" />
                    <span className="text-brand-ink font-medium">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl shadow-brand-ink/20"
          >
            <img
              src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1000"
              alt="Mindfulness"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 hover:scale-110"
              loading="lazy"
              decoding="async"
            />
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="bg-brand-ink text-white rounded-[4rem] p-16 md:p-24 text-center shadow-2xl shadow-brand-ink/20">
          <h2 className="text-4xl md:text-5xl font-serif mb-8 leading-tight">Майндфүлнэс аялалаа эхлүүлээрэй</h2>
          <p className="text-lg text-white/40 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Бид тогтмол танилцуулах хичээлүүд болон 8 долоо хоногийн бүрэн курсуудыг санал болгодог. Дараагийн эхлэх хугацааг мэдэхийн тулд манай мэдээллийн санд бүртгүүлээрэй.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link to="/schedule">
              <Button className="bg-white text-brand-ink hover:bg-brand-icon hover:text-white rounded-full px-12 py-7 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl">
                Удахгүй болох курсуудыг үзэх
              </Button>
            </Link>
            <Link to="/about">
              <Button className="bg-transparent border border-white/20 hover:bg-brand-icon hover:border-brand-icon text-white rounded-full px-12 py-7 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500">
                Дэлгэрэнгүй <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
