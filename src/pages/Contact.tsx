import React from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Clock, Instagram, Facebook, Twitter } from 'lucide-react';

export const Contact: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h1 className="text-4xl md:text-5xl font-serif text-brand-ink mb-6 leading-tight">Холбоо барих</h1>
            <p className="text-lg text-brand-ink/60 font-light leading-relaxed max-w-2xl mx-auto">
              Бидэнтэй холбогдохыг хүсвэл доорх мэдээллийг ашиглана уу. Бид таны асуултад хариулахад үргэлж бэлэн байна.
            </p>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-24"
          >
            <div className="flex flex-wrap justify-center gap-8">
              {[
                { 
                  title: 'Хаяг', 
                  icon: MapPin,
                  content: (
                    <>
                      Улаанбаатар хот, Сүхбаатар дүүрэг,<br />
                      1-р хороо, Олимпийн гудамж,<br />
                      Шангри-Ла Оффис, 12-р давхар
                    </>
                  )
                },
                { 
                  title: 'Утас', 
                  icon: Phone,
                  content: (
                    <>
                      +976 7700 0000<br />
                      +976 9911 0000
                    </>
                  )
                },
                { 
                  title: 'Имэйл', 
                  icon: Mail,
                  content: (
                    <>
                      info@jujustudio.mn<br />
                      contact@jujustudio.mn
                    </>
                  )
                },
                { 
                  title: 'Цагийн хуваарь', 
                  icon: Clock,
                  content: (
                    <>
                      Даваа - Баасан: 07:00 - 21:00<br />
                      Бямба - Ням: 09:00 - 18:00
                    </>
                  )
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white py-12 px-10 rounded-[2rem] shadow-2xl shadow-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-2 transition-all duration-500 group w-full md:w-[calc(50%-2rem)] lg:w-[calc(25%-2rem)] max-w-[380px] min-h-[320px] flex flex-col"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-brand-icon flex items-center justify-center mb-10 group-hover:bg-brand-icon group-hover:text-white transition-all duration-500 shrink-0">
                    <item.icon size={28} />
                  </div>
                  <h3 className="text-xl font-serif text-brand-ink mb-6">{item.title}</h3>
                  <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                    {item.content}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="pt-12 border-t border-brand-ink/5 text-center">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/30 mb-8">Биднийг дагаарай</h4>
              <div className="flex justify-center gap-6">
                {[Instagram, Facebook, Twitter].map((Icon, i) => (
                  <a 
                    key={i}
                    href="#" 
                    className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-brand-ink hover:bg-brand-icon hover:text-white transition-all duration-500 shadow-sm hover:-translate-y-1"
                  >
                    <Icon size={24} />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Map Section */}
      <section className="pb-32 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative h-[500px] w-full rounded-[40px] overflow-hidden shadow-2xl shadow-brand-ink/10"
          >
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m12!1m3!1d2673.924823434685!2d106.91741331563456!3d47.91887307920668!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5d96924688664495%3A0x9647b0376cc7403!2sShangri-La%20Ulaanbaatar!5e0!3m2!1sen!2smn!4v1650000000000!5m2!1sen!2smn" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale contrast-125 opacity-80"
            ></iframe>
            <div className="absolute inset-0 pointer-events-none border-[20px] border-white/10 rounded-[40px]"></div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
