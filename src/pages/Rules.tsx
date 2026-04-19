import React from 'react';
import { motion } from 'motion/react';
import { Shield, Clock, Heart, Coffee, UserCheck, Wind } from 'lucide-react';

const rules = [
  {
    title: 'Цаг баримтлах',
    desc: 'Хичээл эхлэхээс 10-15 минутын өмнө ирж, бэлтгэлээ хангахыг зөвлөж байна. Хичээл эхэлснээс хойш орох боломжгүй.',
    icon: Clock
  },
  {
    title: 'Чимээгүй орчин',
    desc: 'Студид орохдоо гар утсаа унтраах эсвэл дуугүй горимд шилжүүлж, бусдын амгалан тайван байдлыг хүндэтгээрэй.',
    icon: Wind
  },
  {
    title: 'Хувийн ариун цэвэр',
    desc: 'Йогийн дэвсгэр болон хэрэглэлийг ашигласны дараа цэвэрлэж хэвшээрэй. Бид цэвэрлэгээний бодисоор хангадаг.',
    icon: Shield
  },
  {
    title: 'Биеийн байдал',
    desc: 'Хэрэв та ямар нэгэн гэмтэл бэртэлтэй эсвэл биеийн байдал тааруу байгаа бол хичээл эхлэхээс өмнө багшид заавал мэдэгдээрэй.',
    icon: Heart
  },
  {
    title: 'Хувцаслалт',
    desc: 'Хөдөлгөөнд саад болохгүй, биед эвтэйхэн, сунамтгай хувцас өмсөхийг зөвлөж байна.',
    icon: UserCheck
  },
  {
    title: 'Хооллолт',
    desc: 'Хичээл эхлэхээс 2-3 цагийн өмнө хүнд хоол идэхгүй байх нь дасгал хийхэд илүү тухтай байх болно.',
    icon: Coffee
  }
];

export const Rules: React.FC = () => {
  return (
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink"
          >
            Студийн дүрэм
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-brand-ink/60 font-light leading-relaxed"
          >
            Бид бүгдэд таатай, амар амгалан орчинг бүрдүүлэхийн тулд дараах дүрмүүдийг баримталдаг.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rules.map((rule, i) => (
            <motion.div
              key={rule.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-10 rounded-[2.5rem] bg-secondary/5 border border-accent/5 hover:border-primary/20 transition-all duration-500 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white text-brand-icon flex items-center justify-center mb-8 shadow-xl shadow-brand-icon/5 group-hover:bg-brand-icon group-hover:text-white transition-all duration-500">
                <rule.icon size={28} />
              </div>
              <h3 className="text-2xl font-light mb-4 text-brand-ink">{rule.title}</h3>
              <p className="text-brand-ink/60 font-light leading-relaxed text-sm">
                {rule.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
