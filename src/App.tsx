import React, { useState, useEffect, useMemo, MouseEvent } from 'react';
import { 
  PenLine, Menu, Scale, BookOpen, Newspaper, TrendingUp, Feather, 
  ArrowRight, Calendar, Plus, User, Mail, Send, Lock, Unlock, 
  Eye, EyeOff, X, Check, Trash2, Pencil, LogOut, CheckCircle,
  FileText, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Post, 
  Category, 
  CATEGORY_LABELS, 
  CATEGORY_ICONS 
} from './types';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Constants
const EDITOR_PASSWORD = 'aB29022008@';
const SESSION_KEY = 'soumava_auth';

export default function App() {
  // --- State ---
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentFilter, setCurrentFilter] = useState<Category>('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPostViewOpen, setIsPostViewOpen] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  // --- Auth Logic ---
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Editor State ---
  const [postForm, setPostForm] = useState<Partial<Post>>({
    title: '',
    category: 'law',
    lang: 'en',
    excerpt: '',
    image: '',
    content: ''
  });

  // --- Effects ---
  useEffect(() => {
    // Firebase Auth State Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Allow only the specific author email
      setIsAuthenticated(user?.email === 'lighthouse.abanerjee@gmail.com');
    });

    // Firestore Real-time listener for posts
    const unsubscribePosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const fetchedPosts: Post[] = [];
      snapshot.forEach(doc => {
        fetchedPosts.push({ id: doc.id, ...doc.data() } as Post);
      });
      // Sort by newest first
      fetchedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPosts(fetchedPosts);
    });

    // Fetch visitor count via proxy with a more unique namespace
    const targetUrl = 'https://api.counterapi.dev/v1/soumava-quark-blogs/total_hits/up';
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl + '?t=' + Date.now())}`;
    
    fetch(proxyUrl)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data && typeof data.count === 'number') {
          setViewerCount(data.count);
        }
      })
      .catch(err => {
        // Silently fallback if tracking is fully blocked, to prevent console clutter
        console.warn('Viewer count could not be loaded due to browser privacy settings.');
      });

    // Navbar scroll listener
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  // --- Handlers ---
  const handleVerifyPassword = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email === 'lighthouse.abanerjee@gmail.com') {
        setIsAuthModalOpen(false);
        showToast('Editor unlocked!');
        if (editingPost) {
          setIsEditorOpen(true);
        }
      } else {
        setPasswordError(true);
        await firebaseSignOut(auth);
      }
    } catch (error) {
      console.error(error);
      setPasswordError(true);
    }
  };

  const handleLogout = async () => {
    await firebaseSignOut(auth);
    setIsEditorOpen(false);
    showToast('Securely locked editor.');
  };

  const handleOpenEditor = (post: Post | null = null) => {
    if (!isAuthenticated) {
      setEditingPost(post);
      setIsAuthModalOpen(true);
      return;
    }
    if (post) {
      setPostForm(post);
      setEditingPost(post);
    } else {
      setPostForm({ title: '', category: 'law', lang: 'en', excerpt: '', image: '', content: '' });
      setEditingPost(null);
    }
    setIsEditorOpen(true);
  };

  const handleSavePost = async () => {
    if (!postForm.title || !postForm.content) {
      alert('Please enter a title and content');
      return;
    }

    try {
      setIsSubmitting(true);
      const postData = {
        title: postForm.title,
        category: postForm.category || 'law',
        lang: postForm.lang || 'en',
        excerpt: postForm.excerpt || '',
        content: postForm.content,
        image: postForm.image || '',
        date: editingPost ? editingPost.date : new Date().toISOString().split('T')[0],
        author: 'Soumava Banerjee'
      };

      if (editingPost) {
        await updateDoc(doc(db, 'posts', editingPost.id), postData);
        showToast('Post updated globally!');
      } else {
        await addDoc(collection(db, 'posts'), postData);
        showToast('Post published to the world!');
      }

      setIsEditorOpen(false);
    } catch (error) {
      console.error(error);
      alert('Failed to save post. Please ensure you are logged in correctly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this post?')) {
      try {
        await deleteDoc(doc(db, 'posts', id));
        if (activePost?.id === id) setIsPostViewOpen(false);
        showToast('Post gracefully removed.');
      } catch (err) {
        console.error(err);
        showToast('Error removing post.');
      }
    }
  };


  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
      _subject: 'New Contact Message from Quark Blogs'
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("https://formsubmit.co/ajax/lighthouse.abanerjee@gmail.com", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        showToast('Message sent! Thank you for reaching out.');
        form.reset();
      } else {
        showToast('Failed to send message. Please try again later.');
      }
    } catch (error) {
      showToast('Error sending message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = useMemo(() => {
    return currentFilter === 'all' ? posts : posts.filter(p => p.category === currentFilter);
  }, [posts, currentFilter]);

  // --- Rendering Helpers ---
  const CategoryIcon = ({ name, className }: { name: string; className?: string }) => {
    const icons: Record<string, any> = {
      scale: Scale,
      'book-open': BookOpen,
      newspaper: Newspaper,
      'trending-up': TrendingUp,
      feather: Feather,
      pencil: Pencil,
      trash: Trash2,
      calendar: Calendar
    };
    const Icon = icons[name] || FileText;
    return <Icon className={className} />;
  };

  // Simplified Markdown parser (just for basic preview/view)
  const markdownToHtml = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-brand-300 mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-brand-300 mt-6 mb-3">$1</h2>')
      .replace(/^\*\*([^*]+)\*\*/gm, '<strong>$1</strong>')
      .replace(/^\*([^*]+)\*/gm, '<em>$1</em>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-brand-700 pl-4 italic text-neutral-400 my-4">$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .split('\n\n').map(p => p.trim() ? `<p class="mb-4">${p.replace(/\n/g, '<br>')}</p>` : '').join('');
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'bg-neutral-950/95 backdrop-blur-md border-b border-brand-900/20 shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <a href="#home" className="flex items-center gap-3 group">
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-end gap-1.5 relative">
                  <Scale className="w-6 h-6 text-brand-600" />
                  <div className="relative">
                    <h1 className="font-serif text-2xl font-bold tracking-tight leading-none">
                      <span className="text-brand-600">Quark</span> <span className="text-white">Blogs</span>
                    </h1>
                    <Feather className="absolute -top-3 -right-4 w-5 h-5 text-brand-600 rotate-12" />
                  </div>
                </div>
                <span className="font-serif italic text-xs text-neutral-400 mt-0.5 self-end">Scribbling for Justice</span>
              </div>
            </a>

            <div className="hidden lg:flex items-center gap-1">
              {['home', 'blog', 'about', 'contact'].map(link => (
                <a 
                  key={link} 
                  href={`#${link}`} 
                  className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-all capitalize"
                >
                  {link}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleOpenEditor()} 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  isAuthenticated 
                    ? 'bg-brand-700 text-white hover:bg-brand-600 shadow-lg shadow-brand-900/30'
                    : 'border border-brand-800/50 text-brand-400 hover:bg-brand-900/30'
                }`}
              >
                {isAuthenticated ? <PenLine className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                Write
              </button>
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="lg:hidden p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/5"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden bg-neutral-950 border-t border-brand-900/30 backdrop-blur-md"
            >
              <div className="px-4 py-4 space-y-1">
                {['home', 'blog', 'about', 'contact'].map(link => (
                  <a 
                    key={link}
                    href={`#${link}`} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="block px-4 py-3 rounded-lg text-neutral-300 hover:text-white hover:bg-white/5 transition-all font-medium capitalize"
                  >
                    {link}
                  </a>
                ))}
                <button 
                  onClick={() => { handleOpenEditor(); setIsMobileMenuOpen(false); }} 
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-brand-700 text-white font-medium hover:bg-brand-600 transition-all mt-2"
                >
                  {isAuthenticated ? <PenLine className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {isAuthenticated ? 'Write a Post' : 'Author Login'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden noise-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950/40 via-neutral-950 to-neutral-950 -z-10"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-600/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10"></div>
        
        {/* Floating Quill Animation Wrapper */}
        <motion.div 
          animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 left-1/4 text-brand-400/10 hidden lg:block"
        >
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
            <path d="M20 2L12 10L8 14L4 18L2 22L6 20L10 16L14 12L22 4L20 2Z"/>
            <path d="M18 4L20 6"/>
          </svg>
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-center gap-3 mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-900/50 border border-brand-800/40 text-brand-300 text-sm">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                Soumava Banerjee | WBNUJS • BA LLB '31
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-800/30 border border-brand-900/20 text-brand-400 text-sm font-medium backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse"></span>
                {viewerCount !== null ? `${viewerCount.toLocaleString()} Total Visitors` : 'Loading...'}
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 flex flex-col items-start"
            >
              <div className="flex items-end gap-3 sm:gap-4 relative mb-2">
                <Scale className="w-12 h-12 sm:w-16 sm:h-16 text-brand-600 mb-2" />
                <div className="relative">
                  <div className="absolute -top-2 left-0 right-0 h-0.5 bg-brand-600/50 rounded-[100%]" />
                  <span className="text-brand-600">Quark</span> <span className="text-white">Blogs</span>
                  <Feather className="absolute -top-6 -right-10 w-12 h-12 sm:w-16 sm:h-16 text-brand-600 rotate-12" />
                  <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-600 to-transparent rounded-[100%]" />
                </div>
              </div>
              <span className="font-serif italic text-2xl sm:text-3xl text-neutral-300 mt-4 font-normal">Scribbling for Justice</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg sm:text-xl text-neutral-300 leading-relaxed mb-8"
            >
              Exploring the intersections of <span className="text-brand-400 font-medium">Law</span>, <span className="text-brand-400 font-medium">Literature</span>, <span className="text-brand-400 font-medium">Current Affairs</span>, and <span className="text-brand-400 font-medium">Socio-Economic Issues</span> — through prose and poetry in English & Bengali.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4"
            >
              <a href="#blog" className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-700 text-white font-semibold hover:bg-brand-600 transition-all shadow-xl shadow-brand-900/40 hover:-translate-y-0.5">
                Read Blog
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#about" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-brand-800/50 text-brand-300 font-semibold hover:bg-brand-900/30 transition-all hover:-translate-y-0.5">
                About Our Blog
              </a>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-brand-900/30"
            >
              {[
                { label: 'Published Posts', value: posts.length },
                { label: 'Categories', value: '5' }
              ].map(stat => (
                <div key={stat.label}>
                  <span className="block text-2xl font-bold text-white">{stat.value}</span>
                  <span className="text-sm text-neutral-400">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="bg-neutral-950 border-y border-brand-900/20 py-4 sticky top-16 lg:top-20 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            <button 
              onClick={() => setCurrentFilter('all')}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                currentFilter === 'all' ? 'bg-brand-700 text-white' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
              }`}
            >
              All Posts
            </button>
            {(Object.keys(CATEGORY_LABELS) as Array<Exclude<Category, 'all'>>).map(cat => {
              const Icon = {
                'law': Scale,
                'literature': BookOpen,
                'current-affairs': Newspaper,
                'socio-economic': TrendingUp,
                'poems': Feather
              }[cat]!;
              
              return (
                <button 
                  key={cat}
                  onClick={() => setCurrentFilter(cat)}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
                    currentFilter === cat ? 'bg-brand-700 text-white' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-20 noise-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-brand-500 text-sm font-semibold tracking-wider uppercase mb-4">
              <PenLine className="w-4 h-4" />
              Published Works
            </span>
            <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white">
              Latest from the <span className="text-brand-500">Desk</span>
            </h2>
          </div>

          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, idx) => (
                <motion.article 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => { setActivePost(post); setIsPostViewOpen(true); }}
                  className="group rounded-2xl bg-neutral-800/30 border border-neutral-700/40 overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-brand-900/20 hover:-translate-y-1 transition-all"
                >
                  <div className="relative h-52 overflow-hidden">
                    <img 
                      src={post.image || `https://picsum.photos/seed/${post.id}/800/450`} 
                      alt={post.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-transparent to-transparent"></div>
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-lg bg-brand-700/90 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm">
                        <CategoryIcon name={CATEGORY_ICONS[post.category]} className="w-3 h-3" />
                        {CATEGORY_LABELS[post.category]}
                      </span>
                      {post.lang === 'bn' && (
                        <span className="px-3 py-1.5 rounded-lg bg-neutral-800/90 text-brand-300 text-xs font-medium backdrop-blur-sm font-bengali">বাংলা</span>
                      )}
                    </div>
                    {isAuthenticated && (
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenEditor(post); }} 
                          className="p-2 rounded-lg bg-neutral-800/90 text-neutral-300 hover:text-brand-400 transition-all backdrop-blur-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeletePost(post.id, e)} 
                          className="p-2 rounded-lg bg-neutral-800/90 text-neutral-300 hover:text-red-400 transition-all backdrop-blur-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 text-xs text-neutral-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <h3 className={`font-serif text-xl font-semibold text-white mb-2 group-hover:text-brand-400 transition-colors line-clamp-2 ${post.lang === 'bn' ? 'font-bengali' : ''}`}>
                      {post.title}
                    </h3>
                    <p className={`text-sm text-neutral-400 leading-relaxed line-clamp-3 ${post.lang === 'bn' ? 'font-bengali' : ''}`}>
                      {post.excerpt || post.content.substring(0, 120) + '...'}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-brand-900/30 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No posts here yet</h3>
              <p className="text-neutral-400 mb-6">Explore other categories or check back later.</p>
              <button 
                onClick={() => handleOpenEditor()} 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-700 text-white font-medium hover:bg-brand-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Post
              </button>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-neutral-900 noise-bg border-t border-brand-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/5] max-w-md mx-auto lg:mx-0 shadow-2xl shadow-black/50">
                <img 
                  src="https://picsum.photos/seed/pen/800/1000" 
                  alt="Quark Blogs" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-2 text-brand-400 text-sm font-medium">
                    <GraduationCap className="w-4 h-4" />
                    Soumava Banerjee | WBNUJS • BA LLB '31
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -left-4 w-24 h-24 border-2 border-brand-800/30 rounded-2xl -z-10"></div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-brand-900/20 rounded-2xl -z-10"></div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 text-brand-500 text-sm font-semibold tracking-wider uppercase mb-4">
                <User className="w-4 h-4" />
                About the Author
              </span>
              <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-6">
                Soumava <span className="text-brand-500">Banerjee</span>
              </h2>

              <div className="space-y-4 text-neutral-300 leading-relaxed">
                <p>Inky hands and a indominable mind is what secures, protects and leverages humanity, justice and compassion for law. In this blog, we will together explore the various domains of law, literature, current events and poetry. So, from Kafka to Denning, be prepared to hold your breath and dive deeper into this concoction of mesmerising thinking, into the world of Quark Blogs.</p>
                <p className="text-brand-400 font-medium italic mt-6">Tip: Don't forget to leave your message, all writings are open to collaboration, corroboration and criticism.</p>
              </div>

              <div className="flex flex-wrap gap-3 mt-8">
                {['Law', 'Literature', 'Poetry'].map(tag => (
                  <span key={tag} className="px-4 py-2 rounded-lg bg-brand-900/30 border border-brand-800/30 text-brand-400 text-sm font-medium flex items-center gap-2">
                    {tag === 'Law' && <Scale className="w-3.5 h-3.5" />}
                    {tag === 'Literature' && <BookOpen className="w-3.5 h-3.5" />}
                    {tag === 'Poetry' && <Feather className="w-3.5 h-3.5" />}
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 noise-bg border-t border-brand-900/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 text-brand-500 text-sm font-semibold tracking-wider uppercase mb-4">
            <Mail className="w-4 h-4" />
            Get in Touch
          </span>
          <h2 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-6">
            Let's <span className="text-brand-500">Connect</span>
          </h2>
          <p className="text-neutral-400 mb-10 max-w-lg mx-auto">
            Whether you want to discuss law, debate literature, or simply share your thoughts on my writing — I'd love to hear from you.
          </p>

          <form 
            onSubmit={handleContactSubmit}
            className="space-y-4 text-left max-w-lg mx-auto"
          >
            <input 
              type="text" name="name" placeholder="Your Name" required 
              className="w-full px-5 py-3.5 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-white focus:outline-none focus:border-brand-700 transition-all disabled:opacity-50" 
              disabled={isSubmitting}
            />
            <input 
              type="email" name="email" placeholder="Your Email" required 
              className="w-full px-5 py-3.5 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-white focus:outline-none focus:border-brand-700 transition-all disabled:opacity-50" 
              disabled={isSubmitting}
            />
            <textarea 
              name="message" rows={4} placeholder="Your Message" required 
              className="w-full px-5 py-3.5 rounded-xl bg-neutral-800/50 border border-neutral-700/50 text-white focus:outline-none focus:border-brand-700 transition-all resize-none disabled:opacity-50"
              disabled={isSubmitting}
            ></textarea>
            <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-brand-700 text-white font-semibold hover:bg-brand-600 transition-all shadow-lg shadow-brand-900/30 disabled:opacity-75 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-brand-900/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-end gap-1 relative">
                <Scale className="w-5 h-5 text-brand-600" />
                <div className="relative">
                  <h1 className="font-serif text-xl font-bold tracking-tight leading-none">
                    <span className="text-brand-600">Quark</span> <span className="text-white">Blogs</span>
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {['home', 'blog', 'about'].map(link => (
                <a key={link} href={`#${link}`} className="text-sm text-neutral-400 hover:text-brand-400 transition-colors capitalize">{link}</a>
              ))}
            </div>
            <div className="flex flex-col items-end md:items-end md:text-right gap-1 mt-4 md:mt-0">
              <p className="text-sm text-neutral-500">© 2025 Quark Blogs. All rights reserved.</p>
              <p className="text-sm text-neutral-500">Mobile: +91 9477478143</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[200]"
          >
            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-brand-700 text-white shadow-2xl">
              <CheckCircle className="w-5 h-5" />
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-sm bg-black/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-neutral-900 rounded-2xl border border-neutral-700/50 shadow-2xl p-8"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-900/40 flex items-center justify-center mx-auto mb-4">
                  <User className="w-7 h-7 text-brand-500" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-white">Author Access</h3>
                <p className="text-sm text-neutral-400 mt-1">Authenticate securely to manage the blog</p>
              </div>
              <div className="space-y-4">
                {passwordError && <p className="text-red-400 text-sm text-center">Unauthorized account. Please use the correct logged-in Google account.</p>}
                <button 
                  onClick={handleVerifyPassword}
                  className="w-full flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-white text-neutral-900 font-semibold hover:bg-neutral-100 shadow-lg shadow-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
              <button 
                onClick={() => setIsAuthModalOpen(false)} 
                className="absolute top-4 right-4 p-2 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-3xl bg-neutral-900 rounded-2xl border border-neutral-700/50 shadow-2xl my-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-neutral-700/50">
                <h3 className="font-serif text-xl font-semibold text-white flex items-center gap-2">
                  <PenLine className="w-5 h-5 text-brand-500" />
                  {editingPost ? 'Edit Post' : 'Write New Post'}
                </h3>
                <button onClick={() => setIsEditorOpen(false)} className="p-2 rounded-lg text-neutral-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-none">
                <input 
                  type="text" 
                  value={postForm.title} 
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="Post Title" 
                  className="w-full px-5 py-3.5 rounded-xl bg-neutral-800/50 border border-neutral-700 text-white font-serif text-lg focus:outline-none focus:border-brand-700" 
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <select 
                    value={postForm.category}
                    onChange={(e) => setPostForm({ ...postForm, category: e.target.value as any })}
                    className="px-5 py-3.5 rounded-xl bg-neutral-800/50 border border-neutral-700 text-white focus:outline-none"
                  >
                    {(Object.keys(CATEGORY_LABELS) as Array<Exclude<Category, 'all'>>).map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                  <select 
                    value={postForm.lang}
                    onChange={(e) => setPostForm({ ...postForm, lang: e.target.value as 'en' | 'bn' })}
                    className="px-5 py-3.5 rounded-xl bg-neutral-800/50 border border-neutral-700 text-white focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="bn">Bengali</option>
                  </select>
                </div>

                <textarea 
                  value={postForm.excerpt}
                  onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                  placeholder="Summary/Excerpt" 
                  className="w-full px-5 py-3 rounded-xl bg-neutral-800/50 border border-neutral-700 text-white resize-none"
                />

                <input 
                  type="url" 
                  value={postForm.image}
                  onChange={(e) => setPostForm({ ...postForm, image: e.target.value })}
                  placeholder="Cover Image URL" 
                  className="w-full px-5 py-3 rounded-xl bg-neutral-800/50 border border-neutral-700 text-white" 
                />

                <textarea 
                  value={postForm.content || ''}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  placeholder="Write your story..." 
                  className={`w-full px-5 py-3.5 h-64 rounded-xl bg-neutral-800/50 border border-neutral-700 text-white focus:outline-none focus:border-brand-700 resize-y ${postForm.lang === 'bn' ? 'font-bengali' : 'font-sans'}`}
                />
              </div>

              <div className="flex items-center justify-between p-6 border-t border-neutral-700/50">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-neutral-500 hover:text-brand-400 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Lock
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2.5 rounded-xl text-neutral-400 hover:text-white">Cancel</button>
                  <button 
                    onClick={handleSavePost}
                    className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-brand-700 text-white font-semibold hover:bg-brand-600 shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    Publish
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post View Modal */}
      <AnimatePresence>
        {isPostViewOpen && activePost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/80 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-3xl bg-neutral-900 rounded-2xl border border-neutral-700/50 shadow-2xl my-auto"
            >
              <button 
                onClick={() => setIsPostViewOpen(false)} 
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-neutral-800/80 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-64 sm:h-80 overflow-hidden rounded-t-2xl relative">
                <img 
                  src={activePost.image || `https://picsum.photos/seed/${activePost.id}/1200/600`} 
                  alt={activePost.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent"></div>
              </div>

              <div className="p-6 sm:p-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 rounded-lg bg-brand-700/90 text-white text-xs font-medium">
                    {CATEGORY_LABELS[activePost.category]}
                  </span>
                  {activePost.lang === 'bn' && (
                    <span className="px-3 py-1 rounded-lg bg-neutral-800/90 text-brand-300 text-xs font-medium font-bengali">বাংলা</span>
                  )}
                </div>

                <h1 className={`font-serif text-3xl sm:text-4xl font-bold text-white mb-6 ${activePost.lang === 'bn' ? 'font-bengali' : ''}`}>
                  {activePost.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400 mb-8 pb-8 border-b border-neutral-700/50">
                  <span className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white"><Scale className="w-4 h-4" /></div>
                    {activePost.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(activePost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                <div 
                  className={`text-neutral-300 leading-relaxed space-y-4 ${activePost.lang === 'bn' ? 'font-bengali' : 'font-sans'}`}
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(activePost.content) }}
                ></div>

                {isAuthenticated && (
                  <div className="mt-10 pt-8 border-t border-neutral-700/50 flex flex-wrap gap-3">
                    <button 
                      onClick={() => { handleOpenEditor(activePost); setIsPostViewOpen(false); }} 
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-brand-400 font-medium"
                    >
                      <Pencil className="w-4 h-4" /> Edit Post
                    </button>
                    <button 
                      onClick={(e) => { handleDeletePost(activePost.id, e); setIsPostViewOpen(false); }} 
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-red-400 font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
