import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { blogPosts as staticBlogPosts } from '../data/blog';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export const Blog: React.FC = () => {
  const [posts, setPosts] = useState(staticBlogPosts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'blog'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const fetchedPosts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as any[];
          setPosts(fetchedPosts);
        }
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h1 className="text-4xl md:text-5xl font-serif text-brand-ink mb-6 leading-tight">Блог & Нийтлэл</h1>
            <p className="text-lg text-brand-ink/60 font-light leading-relaxed max-w-2xl mx-auto">
              Майндфүлнэс, иог болон эрүүл амьдралын хэв маягийн талаарх сонирхолтой нийтлэл, зөвлөгөөнүүдийг эндээс уншаарай.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="pb-32 px-6">
        <div className="container mx-auto max-w-6xl">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-brand-icon/20 border-t-brand-icon rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/40">Уншиж байна...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              {posts.map((post, idx) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group"
                >
                  <Link to={`/blog/${post.id}`} className="block">
                    <div className="relative aspect-[16/10] rounded-3xl overflow-hidden mb-8 shadow-2xl shadow-brand-ink/5 group-hover:shadow-brand-ink/10 transition-all duration-500">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading={idx < 2 ? 'eager' : 'lazy'}
                        fetchPriority={idx === 0 ? 'high' : 'low'}
                        decoding="async"
                      />
                      <div className="absolute top-6 left-6">
                        <span className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-black tracking-widest uppercase text-brand-ink shadow-sm">
                          {post.category}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-2xl md:text-3xl font-serif text-brand-ink group-hover:text-brand-icon transition-colors duration-300 leading-tight">
                        {post.title}
                      </h2>

                      <p className="text-brand-ink/60 font-light leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>

                      <div className="pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/30">
                          <Calendar size={12} />
                          <span>{post.date}</span>
                        </div>
                        
                        <div className="text-[10px] font-black tracking-[0.2em] uppercase text-brand-ink group-hover:text-brand-icon transition-colors flex items-center">
                          Унших
                          <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
