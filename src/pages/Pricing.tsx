import React from 'react';
import { motion } from 'motion/react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

const plans = [
  {
    id: 'online-video',
    name: 'Online Video',
    price: '100₮',
    description: 'Видео хичээлийн сантай ажиллах, дагаж хийх контент.',
    features: [
      'Онлайн видео хичээлүүд',
      'Шинэ видео контент тогтмол нэмэгдэнэ',
      'Хаанаас ч үзэх боломж'
    ],
    highlight: false
  },
  {
    id: 'online-audio',
    name: 'Online Audio',
    price: '200₮',
    description: 'Аудио бясалгал, амьсгалын дасгал болон сонсох контент.',
    features: [
      'Онлайн аудио сан',
      'Бясалгал, амьсгалын аудио',
      'Хүссэн үедээ сонсох боломж'
    ],
    highlight: true
  }
];

export const Pricing: React.FC = () => {
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
                Гишүүнчлэл
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-brand-ink/60 font-light leading-relaxed"
              >
                Өөрийн хэрэгцээнд тохирсон төлөвлөгөөг сонгож, манай онлайн сан болон тусгай хөтөлбөрүүдэд бүрэн эрхтэйгээр нэгдээрэй.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`relative p-12 rounded-[3rem] border transition-all duration-500 flex flex-col ${
                  plan.highlight 
                    ? 'border-brand-ink bg-brand-ink text-white shadow-2xl shadow-brand-ink/20 scale-105 z-10' 
                    : 'border-brand-ink/5 bg-gray-50 text-brand-ink hover:border-brand-ink/20'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-icon text-white px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase">
                    Хамгийн ашигтай
                  </div>
                )}
                
                <div className="mb-12">
                  <h3 className={`text-2xl font-serif mb-4 ${plan.highlight ? 'text-white' : 'text-brand-ink'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-serif">{plan.price}</span>
                    <span className={`text-sm font-light ${plan.highlight ? 'text-white/60' : 'text-brand-ink/40'}`}>
                      / багц
                    </span>
                  </div>
                  <p className={`text-sm font-light leading-relaxed ${plan.highlight ? 'text-white/60' : 'text-brand-ink/60'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="space-y-6 mb-12 flex-grow">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        plan.highlight ? 'bg-white/10 text-white' : 'bg-brand-ink/5 text-brand-icon'
                      }`}>
                        <Check size={12} />
                      </div>
                      <span className={`text-sm font-light ${plan.highlight ? 'text-white/80' : 'text-brand-ink/80'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Link to={`/checkout?plan=${plan.id}`}>
                  <Button className={`w-full rounded-full py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 group ${
                    plan.highlight 
                      ? 'bg-white text-brand-ink hover:bg-brand-icon hover:text-white' 
                      : 'bg-brand-ink text-white hover:bg-brand-icon'
                  }`}>
                    Сонгох
                    <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ or Trust Section */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-serif text-brand-ink mb-16">Түгээмэл асуултууд</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
              <div>
                <h4 className="text-lg font-serif text-brand-ink mb-4">Төлбөрөө хэрхэн цуцлах вэ?</h4>
                <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                  Та өөрийн бүртгэл хэсэг рүү нэвтэрч хүссэн үедээ гишүүнчлэлээ цуцлах боломжтой. Цуцалснаас хойш тухайн хугацаа дуустал эрх тань нээлттэй байх болно.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-serif text-brand-ink mb-4">Ямар төлбөрийн хэрэгсэл ашиглах вэ?</h4>
                <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                  Бид бүх төрлийн банкны карт болон QPay-ээр төлбөр хүлээн авдаг. Төлбөр баталгаажсан даруйд таны эрх идэвхжих болно.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
