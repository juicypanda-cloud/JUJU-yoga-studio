import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { retreatsData } from '../data/retreats';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Calendar, MapPin, ArrowLeft, CheckCircle2, Users, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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
              <p className="text-lg text-brand-ink/60 font-light leading-relaxed">
                {retreat.description}
              </p>
              <p className="text-lg text-brand-ink/60 font-light leading-relaxed mt-6">
                Энэхүү ретрит нь таныг өдөр тутмын завгүй амьдралаас түр хөндийрүүлж, байгалийн сайханд өөрийгөө сонсох, дотоод амар амгалангаа олоход туслах зорилготой. Бид мэргэжлийн багш нарын удирдамж дор йог, бясалгал болон майндфүлнэс хичээлүүдийг цогцоор нь санал болгож байна.
              </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-xl font-serif text-brand-ink">Хөтөлбөрт багтсан</h3>
                <ul className="space-y-4">
                  {[
                    'Өглөө, оройн йогийн хичээл',
                    'Майндфүлнэс бясалгал',
                    'Эрүүл, цагаан хоол',
                    'Байгалийн аялал',
                    'Сэтгэл зүйн зөвлөгөө',
                    'Тээврийн зардал'
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-brand-ink/60 font-light">
                      <CheckCircle2 size={18} className="text-brand-icon shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-6">
                <h3 className="text-xl font-serif text-brand-ink">Юу авч ирэх вэ?</h3>
                <ul className="space-y-4">
                  {[
                    'Йогийн гудас',
                    'Биед эвтэйхэн хувцас',
                    'Дулаан хувцас (оройдоо)',
                    'Хувийн ариун цэврийн хэрэглэл',
                    'Тэмдэглэлийн дэвтэр'
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-brand-ink/60 font-light">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-icon shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-10">
              <h3 className="text-3xl font-serif text-brand-ink">Аяллын хуваарь</h3>
              <div className="relative pl-8 space-y-12">
                {/* Timeline Line */}
                <div className="absolute left-0 top-2 bottom-2 w-px bg-brand-ink/10" />
                
                {[
                  { time: '07:00', activity: 'Өглөөний йог', desc: 'Өдрийг эрч хүчтэй, уян хатан эхлүүлэх йогийн дасгал.' },
                  { time: '08:30', activity: 'Өглөөний цай', desc: 'Эрүүл, шим тэжээлтэй өглөөний хоол.' },
                  { time: '10:00', activity: 'Майндфүлнэс бясалгал', desc: 'Оксфордын хөтөлбөрийн дагуух анхаарал төвлөрүүлэх бясалгал.' },
                  { time: '13:00', activity: 'Өдрийн хоол', desc: 'Байгалийн гаралтай, хөнгөн хооллолт.' },
                  { time: '15:00', activity: 'Байгалийн аялал', desc: 'Орчин тойронтойгоо танилцаж, цэвэр агаарт алхах.' },
                  { time: '18:00', activity: 'Оройн йог & Бясалгал', desc: 'Сэтгэл санааг амрааж, гүн нойронд бэлтгэх практик.' },
                  { time: '19:30', activity: 'Оройн хоол', desc: 'Өдрийг дүгнэж, хамт олноороо халуун дулаан яриа өрнүүлэх.' }
                ].map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[36px] top-1.5 w-4 h-4 rounded-full border-2 border-brand-icon bg-white" />
                    
                    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8">
                      <span className="text-brand-icon font-black tracking-[0.2em] text-[10px] uppercase shrink-0">
                        {item.time}
                      </span>
                      <div className="space-y-2">
                        <h4 className="text-xl font-serif text-brand-ink">{item.activity}</h4>
                        <p className="text-sm text-brand-ink/50 font-light leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white border border-brand-ink/5 shadow-2xl shadow-brand-ink/5 rounded-[2.5rem] p-10 sticky top-32">
              <div className="mb-8">
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-ink/30 font-black block mb-2">Төлбөр</span>
                <span className="text-4xl font-medium text-brand-ink">₮{Number(retreat.price ?? 0).toLocaleString()}</span>
              </div>

              <div className="space-y-6 mb-10">
                <div className="flex items-center gap-4 text-brand-ink/60">
                  <Users size={20} className="text-brand-icon" />
                  <span className="text-sm font-light">Хамгийн ихдээ 15 хүн</span>
                </div>
                <div className="flex items-center gap-4 text-brand-ink/60">
                  <Clock size={20} className="text-brand-icon" />
                  <span className="text-sm font-light">3 өдөр, 2 шөнө</span>
                </div>
                <div className="flex items-center gap-4 text-brand-ink/60">
                  <Sparkles size={20} className="text-brand-icon" />
                  <span className="text-sm font-light">Бүх түвшнийхэнд тохиромжтой</span>
                </div>
              </div>

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
