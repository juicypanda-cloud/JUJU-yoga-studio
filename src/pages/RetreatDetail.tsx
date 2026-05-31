import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { retreatsData } from '../data/retreats';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Calendar, MapPin, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatRetreatPriceWithSymbol } from '../lib/formatRetreatPrice';

const toLineItems = (raw: unknown): string[] => {
  const value = typeof raw === 'string' ? raw : '';
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const toScheduleItems = (raw: unknown): Array<{ time: string; activity: string; desc: string }> => {
  const value = typeof raw === 'string' ? raw : '';
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [time = '', activity = '', ...rest] = line.split('|').map((part) => part.trim());
      return {
        time,
        activity,
        desc: rest.join(' | ').trim(),
      };
    })
    .filter((row) => row.time || row.activity || row.desc);
};

export const RetreatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [retreat, setRetreat] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRetreat = async () => {
      if (!id) return;

      // Check local data first
      const localRetreat = retreatsData.find(r => r.id === id);
      if (localRetreat) {
        setRetreat(localRetreat);
        setLoading(false);
        return;
      }

      // Then check Firebase
      try {
        const docRef = doc(db, 'retreats', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRetreat({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching retreat:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRetreat();
    window.scrollTo(0, 0);
  }, [id]);

  const handleRegister = () => {
    toast.info(`${retreat?.title} ретритийн бүртгэл удахгүй нээгдэнэ.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-32 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary/40 border-t-brand-icon rounded-full animate-spin" />
      </div>
    );
  }

  if (!retreat) {
    return (
      <div className="min-h-screen bg-white pt-32 text-center">
        <h2 className="text-2xl font-serif text-brand-ink">Ретрит олдсонгүй.</h2>
        <Button onClick={() => navigate('/retreats')} variant="link" className="mt-4">
          Буцах
        </Button>
      </div>
    );
  }

  const heroCover =
    String(retreat.imageURL || retreat.image || retreat.thumbnail || '').trim() ||
    'https://picsum.photos/seed/retreat-detail/1600/900';
  const includedProgramItems = toLineItems(retreat.includedProgram);
  const whatToBringItems = toLineItems(retreat.whatToBring);
  const scheduleItems = toScheduleItems(retreat.travelSchedule);
  const hasProgramSection = includedProgramItems.length > 0 || whatToBringItems.length > 0;

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <img
          src={heroCover}
          alt={retreat.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-brand-ink/20" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-12">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button 
                onClick={() => navigate('/retreats')}
                variant="ghost" 
                className="mb-8 text-brand-ink hover:bg-white/20 backdrop-blur-md rounded-full px-6"
              >
                <ArrowLeft size={18} className="mr-2" />
                Буцах
              </Button>
              <h1 className="text-4xl md:text-6xl font-serif text-brand-ink mb-6 leading-tight max-w-4xl">
                {retreat.title}
              </h1>
              <div className="flex flex-wrap gap-6 text-brand-ink/80">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-brand-icon" />
                  <span className="text-sm font-medium uppercase tracking-wider">{retreat.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-brand-icon" />
                  <span className="text-sm font-medium uppercase tracking-wider">{retreat.date}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-16">
            <section>
              <h2 className="text-2xl font-serif text-brand-ink mb-8">Аяллын тухай</h2>
              {retreat.description ? (
                <p className="text-lg text-brand-ink/60 font-light leading-relaxed">
                  {retreat.description}
                </p>
              ) : null}
            </section>

            {hasProgramSection ? (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {includedProgramItems.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-xl font-serif text-brand-ink">Хөтөлбөрт багтсан</h3>
                <ul className="space-y-4">
                  {includedProgramItems.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-brand-ink/60 font-light">
                      <CheckCircle2 size={18} className="text-brand-icon shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              ) : null}
              {whatToBringItems.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-xl font-serif text-brand-ink">Юу авч ирэх вэ?</h3>
                <ul className="space-y-4">
                  {whatToBringItems.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-brand-ink/60 font-light">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-icon shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              ) : null}
            </section>
            ) : null}

            {scheduleItems.length > 0 ? (
            <section className="space-y-10">
              <h3 className="text-3xl font-serif text-brand-ink">Аяллын хуваарь</h3>
              <div className="relative pl-8 space-y-12">
                {/* Timeline Line */}
                <div className="absolute left-0 top-2 bottom-2 w-px bg-brand-ink/10" />
                
                {scheduleItems.map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[36px] top-1.5 w-4 h-4 rounded-full border-2 border-brand-icon bg-white" />
                    
                    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8">
                      {item.time ? (
                        <span className="text-brand-icon font-black tracking-[0.2em] text-[10px] uppercase shrink-0">
                          {item.time}
                        </span>
                      ) : null}
                      <div className="space-y-2">
                        {item.activity ? (
                          <h4 className="text-xl font-serif text-brand-ink">{item.activity}</h4>
                        ) : null}
                        {item.desc ? (
                          <p className="text-sm text-brand-ink/50 font-light leading-relaxed">
                            {item.desc}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white border border-brand-ink/5 shadow-2xl shadow-brand-ink/5 rounded-[2.5rem] p-10 sticky top-32">
              <div className="mb-8">
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-ink/30 font-black block mb-2">Төлбөр</span>
                <span className="text-4xl font-medium text-brand-ink">{formatRetreatPriceWithSymbol(retreat.price)}</span>
              </div>

              {retreat.duration ? (
                <div className="space-y-6 mb-10">
                  <div className="flex items-center gap-4 text-brand-ink/60">
                    <Clock size={20} className="text-brand-icon" />
                    <span className="text-sm font-light">{retreat.duration}</span>
                  </div>
                </div>
              ) : null}

              <Button
                onClick={handleRegister}
                className="w-full rounded-full bg-brand-ink text-white hover:bg-brand-icon transition-all duration-500 py-8 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl"
              >
                Бүртгүүлэх
              </Button>
              
              <p className="text-center text-[10px] text-brand-ink/30 mt-6 leading-relaxed">
                Таны бүртгэл баталгаажсаны дараа бид тантай холбогдож дэлгэрэнгүй мэдээлэл өгөх болно.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
