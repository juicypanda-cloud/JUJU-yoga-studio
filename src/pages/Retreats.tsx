import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ContentCard } from '../components/ContentCard';
import { motion } from 'motion/react';
import { retreatsData } from '../data/retreats';
import { Button } from '../components/ui/button';
import { ArrowRight, Sparkles, Wind, Heart, MapPin, Quote, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
/** Matches admin Галерей: stored value `Retreat` (label «Ретрит») or Cyrillic. */
const isRetreatGalleryCategory = (category?: string) => {
  const raw = String(category || '').trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (lower === 'retreat') return true;
  if (raw.includes('Ретрит') || raw.includes('ретрит')) return true;
  return false;
};

type RetreatMemoryItem = {
  id: string;
  image: string;
  title: string;
};

export const Retreats: React.FC = () => {
  const navigate = useNavigate();
  const [retreats, setRetreats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retreatMemories, setRetreatMemories] = useState<RetreatMemoryItem[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);

  useEffect(() => {
    // Start with local data
    setRetreats(retreatsData);
    setLoading(false);

    const q = query(collection(db, 'retreats'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (firebaseData.length > 0) {
        setRetreats(firebaseData);
      }
    }, (error) => {
      console.error("Retreats error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            image: String(data?.image || '').trim(),
            title: String(data?.title || 'Зураг').trim() || 'Зураг',
            category: data?.category,
          };
        });
        setRetreatMemories(rows.filter((r) => r.image && isRetreatGalleryCategory(String(r.category))));
        setMemoriesLoading(false);
      },
      () => {
        setRetreatMemories([]);
        setMemoriesLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleRegister = (retreat: any) => {
    navigate(`/retreats/${retreat.id}`);
  };

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
                Эрүүл мэндийн Ретрит
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-brand-ink/60 font-light leading-relaxed"
              >
                Байгаль дэлхий болон майндфүлнэст өөрийгөө зориул. Манай ретритүүд таныг чимээ шуугианаас ангижруулж, жинхэнэ өөртэйгөө эргэн холбогдоход туслах зорилготой.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif text-brand-ink leading-tight">
                Ретрит гэж юу вэ?
              </h2>
              <div className="space-y-6 text-brand-ink/60 font-light leading-relaxed">
                <p>
                  Ретрит бол зөвхөн аялал биш, энэ бол таны сэтгэл зүй болон бие махбодийн хувьд өөрийгөө "цэнэглэх" хугацаа юм. 
                </p>
                <p>
                  Бид байгалийн үзэсгэлэнт газруудад, мэргэжлийн багш нарын удирдамж дор бясалгал, йог болон майндфүлнэс практикийг хослуулан зохион байгуулдаг.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8">
                {[
                  { title: 'Байгальтай холбогдох', icon: Wind },
                  { title: 'Дотоод амар амгалан', icon: Heart },
                  { title: 'Мэргэжлийн удирдамж', icon: Sparkles },
                  { title: 'Ижил зорилготой хамт олон', icon: Users },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center text-brand-icon">
                      <item.icon size={20} />
                    </div>
                    <span className="text-brand-ink font-medium text-sm">{item.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl shadow-brand-ink/20"
            >
              <img
                src="https://picsum.photos/seed/retreat_hero/1200/1200"
                alt="Retreat Experience"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Quote size={60} className="text-brand-icon/20 mx-auto mb-12" />
            <h2 className="text-3xl md:text-5xl font-serif text-brand-ink italic leading-tight mb-12">
              "Чимээгүй байдал бол зүгээр нэг хоосон орон зай биш. Энэ бол таны дотоод дуу хоолойг сонсох боломж юм."
            </h2>
            <p className="text-[11px] font-black tracking-[0.3em] uppercase text-brand-ink/40">
              Juju Wellbeing
            </p>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-icon/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </section>

      {/* Retreats List */}
      <section className="py-32 bg-white" id="retreats-list">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl font-serif text-brand-ink mb-6 leading-tight">
              Удахгүй болох аялалууд
            </h2>
            <p className="text-brand-ink/60 font-light leading-relaxed">
              Бид улирал бүр өөр өөр байршилд, өөр өөр сэдэвтэй ретритүүдийг зохион байгуулдаг. Өөрт тохирох аялалаа сонгоорой.
            </p>
          </div>

          {loading ? (
            <div className="space-y-12">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[420px] bg-gray-50 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : retreats.length > 0 ? (
            <div className="space-y-12">
              {retreats.map((retreat, i) => (
                <motion.div
                  key={retreat.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ContentCard 
                    item={retreat} 
                    type="retreat" 
                    variant="horizontal"
                    onAction={() => handleRegister(retreat)} 
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-gray-50 rounded-[3rem] border border-brand-ink/5">
              <p className="text-brand-ink/30 text-xl font-serif">Шинэ ретритүүд удахгүй нэмэгдэнэ. Түр хүлээнэ үү!</p>
            </div>
          )}
        </div>
      </section>

      {/* Previous Retreats Gallery */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl font-serif text-brand-ink mb-6 leading-tight">
              Өмнөх аяллын дурсамжууд
            </h2>
            <p className="text-brand-ink/60 font-light leading-relaxed">
              Бидний өмнө нь зохион байгуулж байсан ретритүүдээс онцлох агшнуудыг энд хуваалцаж байна.
            </p>
          </div>

          {memoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/3] rounded-[2rem] bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : retreatMemories.length === 0 ? (
            <div className="rounded-[2rem] border border-brand-ink/5 bg-gray-50/80 px-8 py-16 text-center">
              <p className="text-brand-ink/50 font-light leading-relaxed max-w-lg mx-auto">
                «Ретрит» ангилалтай зургууд энд харагдана. Админ самбарын «Галерей»-аас ретритийн зураг нэмж, ангиллыг «Ретрит» сонгоно уу.
              </p>
              <Link to="/gallery" className="inline-block mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-brand-icon hover:text-brand-icon/80">
                Галерей руу →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {retreatMemories.map((img, idx) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(idx, 8) * 0.06 }}
                  className="relative aspect-[4/3] rounded-[2rem] overflow-hidden group cursor-default shadow-lg shadow-brand-ink/5"
                >
                  <img
                    src={img.image}
                    alt={img.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/90 via-brand-ink/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="pointer-events-none absolute inset-0 flex items-end p-6 md:p-8">
                    <span className="max-w-full text-left font-serif text-xl md:text-2xl text-white drop-shadow-md translate-y-3 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                      {img.title}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-20 text-center">
            <Link to="/gallery">
              <Button variant="link" className="p-0 h-auto text-[11px] font-black tracking-[0.2em] uppercase text-brand-icon hover:text-brand-icon/80 transition-colors group/btn">
                Бүх зургийг үзэх
                <ArrowRight size={14} className="ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-brand-ink text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-serif mb-12 leading-tight">
              Өөртөө зориулж <br />
              <span className="italic text-white/55">цаг гаргаарай</span>
            </h2>
            <p className="text-xl text-white/40 font-light leading-relaxed mb-16 max-w-2xl mx-auto">
              Бидний ретритүүд хязгаарлагдмал хүнтэй зохион байгуулагддаг тул та эрт бүртгүүлж суудлаа баталгаажуулаарай.
            </p>
            <Link to="/contact">
              <Button className="bg-white text-brand-ink hover:bg-brand-icon hover:text-white rounded-full px-12 py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-2xl">
                Дэлгэрэнгүй мэдээлэл авах
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
