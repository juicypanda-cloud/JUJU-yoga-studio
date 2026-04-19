import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { blogPosts as staticBlogPosts } from '../data/blog';
import { Button } from '../components/ui/button';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      try {
        const postDoc = await getDoc(doc(db, 'blog', id));
        if (postDoc.exists()) {
          setPost({ id: postDoc.id, ...postDoc.data() });
        } else {
          const staticPost = staticBlogPosts.find(p => p.id === id);
          setPost(staticPost || null);
        }
      } catch (error) {
        console.error('Error fetching blog post:', error);
        const staticPost = staticBlogPosts.find(p => p.id === id);
        setPost(staticPost || null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-brand-icon/20 border-t-brand-icon rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-brand-ink mb-4">Нийтлэл олдсонгүй</h2>
          <Link to="/blog">
            <Button variant="outline" className="rounded-full">
              Блог руу буцах
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Link 
              to="/blog" 
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/40 hover:text-brand-ink transition-colors mb-12 group"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              Бүх нийтлэл
            </Link>

            <div className="flex items-center gap-4 mb-8">
              <span className="px-4 py-2 rounded-full bg-gray-50 text-[10px] font-black tracking-widest uppercase text-brand-ink">
                {post.category}
              </span>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/30">
                <Calendar size={12} />
                <span>{post.date}</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-serif text-brand-ink mb-8 leading-tight">
              {post.title}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Featured Image */}
      <section className="px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl shadow-brand-ink/10"
          >
            <img
              src={post.image}
              alt={post.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="prose prose-lg prose-brand max-w-none"
          >
            <div 
              className="text-brand-ink/80 font-light leading-relaxed space-y-8 blog-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </motion.div>
        </div>
      </section>

      {/* Related Posts */}
      <section className="py-32 bg-white px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif text-brand-ink mb-4">Танд таалагдаж магадгүй</h2>
              <p className="text-brand-ink/40 font-light">Бусад сонирхолтой нийтлэлүүд</p>
            </div>
            <Link to="/blog">
              <Button variant="link" className="text-[10px] font-black uppercase tracking-widest text-brand-ink group">
                Бүгдийг үзэх
                <ArrowLeft size={14} className="ml-2 rotate-180 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {staticBlogPosts.filter(p => p.id !== post.id).slice(0, 3).map((relatedPost) => (
              <Link key={relatedPost.id} to={`/blog/${relatedPost.id}`} className="group">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl mb-6 shadow-lg transition-all duration-500 group-hover:shadow-xl">
                  <img
                    src={relatedPost.image}
                    alt={relatedPost.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <h3 className="text-xl font-serif text-brand-ink group-hover:text-brand-icon transition-colors line-clamp-2">
                  {relatedPost.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
