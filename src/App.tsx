import React, { useState, useEffect, useRef } from 'react';
import { useAuth, AuthProvider } from './components/AuthProvider';
import { LogIn, LogOut, Upload, Filter, X, Image as ImageIcon, Video, Calendar, Search, Check, Plus, Sun, Moon } from 'lucide-react';
import { JournalEntry, Streak, MarketCondition } from './types';
import { getJournalEntries, deleteJournalEntry, uploadMedia, createJournalEntry } from './lib/api';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';


function Dashboard() {
  const { user, logOut } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Filters
  const [filterStreak, setFilterStreak] = useState<Streak | 'all'>('all');
  const [filterMarket, setFilterMarket] = useState<MarketCondition | 'all'>('all');
  const [filterExpectation, setFilterExpectation] = useState<'all' | 'yes' | 'no'>('all');
  const [searchTag, setSearchTag] = useState('');
  const [filterMediaType, setFilterMediaType] = useState<'all' | 'image' | 'video'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSeedData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      const sampleEntries: Omit<JournalEntry, 'id'>[] = [
        {
          userId: user.uid,
          mediaUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
          mediaType: 'image',
          title: 'NQ Long at London Session Open',
          notes: 'Price swept Asian session lows and formed a bullish divergence on the 15m. Entered on the 5m FV gap. Emotions were calm.',
          streak: 'winning',
          marketCondition: 'buy-side',
          expectationFulfilled: true,
          tags: ['nasdaq', 'london_session', 'fvg', 'divergence'],
          createdAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)),
          updatedAt: Timestamp.now(),
        },
        {
          userId: user.uid,
          mediaUrl: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&q=80&w=800',
          mediaType: 'image',
          title: 'EUR/USD Short Stopped Out',
          notes: 'Tried to short the top of the range but market condition was actually buy-side trending. Ignored higher timeframe bias. Need to be more patient.',
          streak: 'losing',
          marketCondition: 'ranging',
          expectationFulfilled: false,
          tags: ['eurusd', 'mistake', 'range', 'stop_loss'],
          createdAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)),
          updatedAt: Timestamp.now(),
        },
        {
          userId: user.uid,
          mediaUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800',
          mediaType: 'image',
          title: 'Gold Buy Side Delivery',
          notes: 'Textbook setup. Waited for the sweep of previous day high, price displaced lower, then bought the dip on the return to the breaker block.',
          streak: 'none',
          marketCondition: 'buy-side',
          expectationFulfilled: true,
          tags: ['gold', 'breaker', 'sweep'],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
      ];

      for (const entry of sampleEntries) {
        await createJournalEntry(entry);
      }
      
      await fetchEntries();
    } catch (e) {
      console.error("Failed to seed data", e);
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getJournalEntries(user.uid);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  useEffect(() => {
    setIsFiltering(true);
    let result = entries;
    if (filterStreak !== 'all') {
      result = result.filter(e => e.streak === filterStreak);
    }
    if (filterMarket !== 'all') {
      result = result.filter(e => e.marketCondition === filterMarket);
    }
    if (filterExpectation !== 'all') {
      const exp = filterExpectation === 'yes';
      result = result.filter(e => e.expectationFulfilled === exp);
    }
    if (filterMediaType !== 'all') {
      result = result.filter(e => e.mediaType === filterMediaType);
    }
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(e => e.createdAt.toDate() >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(e => e.createdAt.toDate() <= toDate);
    }
    if (searchTag.trim() !== '') {
      const tagLower = searchTag.toLowerCase();
      result = result.filter(e => 
        e.tags.some(t => t.toLowerCase().includes(tagLower)) ||
        e.title.toLowerCase().includes(tagLower) ||
        e.notes.toLowerCase().includes(tagLower)
      );
    }
    
    // Slight delay to show filtering skeleton
    const timer = setTimeout(() => {
      setFilteredEntries(result);
      setIsFiltering(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [entries, filterStreak, filterMarket, filterExpectation, filterMediaType, filterDateFrom, filterDateTo, searchTag]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 flex flex-col font-sans">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-white dark:bg-neutral-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <span className="bg-indigo-500 p-1.5 rounded-lg"><Calendar className="w-5 h-5 text-neutral-900 dark:text-white" /></span>
            ProTrader Vault
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <img src={user?.photoURL || ''} alt="" className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800" />
            <span className="hidden sm:inline-block">{user?.displayName}</span>
          </div>
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-900 dark:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline-block">Upload</span>
          </button>
          <button 
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="md:hidden flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white w-9 h-9 rounded-md transition-colors"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleTheme} 
            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-900 dark:text-white p-2"
          >
             {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={logOut} className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white p-2 ml-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative pb-16 md:pb-0">
        {/* Sidebar Filters */}
        <aside className={cn(
          "w-72 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-white dark:bg-neutral-900/95 backdrop-blur-md p-6 flex flex-col gap-6 overflow-y-auto transition-transform absolute md:relative z-20 h-full",
          isMobileFilterOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <div className="flex items-center justify-between md:hidden mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </h2>
            <button onClick={() => setIsMobileFilterOpen(false)} className="text-neutral-600 dark:text-neutral-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden md:flex mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </h2>
          </div>
            
          <div className="space-y-5">
              <div>
                <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1.5">Search Keywords</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500 dark:text-neutral-500 " />
                  <input 
                    type="text" 
                    value={searchTag}
                    onChange={(e) => setSearchTag(e.target.value)}
                    placeholder="Search tags, title..." 
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-500 "
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1.5">Market Condition</label>
                <select 
                  value={filterMarket}
                  onChange={(e) => setFilterMarket(e.target.value as any)}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-indigo-500 text-neutral-900 dark:text-white"
                >
                  <option value="all">Every condition</option>
                  <option value="buy-side">Buy Side</option>
                  <option value="sell-side">Sell Side</option>
                  <option value="ranging">Ranging</option>
                  <option value="choppy">Choppy</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1.5">Streak Phase</label>
                <select 
                  value={filterStreak}
                  onChange={(e) => setFilterStreak(e.target.value as any)}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-indigo-500 text-neutral-900 dark:text-white"
                >
                  <option value="all">Any streak</option>
                  <option value="winning">Winning Streak</option>
                  <option value="losing">Losing Streak</option>
                  <option value="none">Neutral</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1.5">Expectation Fulfilled?</label>
                <select 
                  value={filterExpectation}
                  onChange={(e) => setFilterExpectation(e.target.value as any)}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-indigo-500 text-neutral-900 dark:text-white"
                >
                  <option value="all">Any</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1.5">Media Type</label>
                <select 
                  value={filterMediaType}
                  onChange={(e) => setFilterMediaType(e.target.value as any)}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:border-indigo-500 text-neutral-900 dark:text-white"
                >
                  <option value="all">All Media</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-600 dark:text-neutral-400 block mb-1.5">Date Range</label>
                <div className="space-y-2">
                  <input 
                    type="date" 
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-neutral-900 dark:text-white dark:[color-scheme:dark]"
                    placeholder="From"
                  />
                  <input 
                    type="date" 
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-neutral-900 dark:text-white dark:[color-scheme:dark]"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
        </aside>

        {/* Gallery */}
        <section className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : isFiltering ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white dark:bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[260px] animate-pulse">
                   <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-800/50" />
                   <div className="p-4 flex-1 flex flex-col gap-3">
                     <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4"></div>
                     <div className="flex gap-2">
                       <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-16"></div>
                       <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-20"></div>
                     </div>
                     <div className="mt-auto flex gap-1 flex-col">
                       <div className="flex gap-1">
                         <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-8"></div>
                         <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-10"></div>
                         <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-12"></div>
                       </div>
                       <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded w-1/3 mt-2"></div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-12">
              <ImageIcon className="w-12 h-12 mb-4 text-neutral-700" />
              <h3 className="text-xl font-bold tracking-tight text-neutral-700 dark:text-neutral-300">No entries found</h3>
              <p className="mt-2 text-sm text-center max-w-md text-neutral-600 dark:text-neutral-400">Upload your first trading screenshot or video, or try loading some sample data to see how it looks.</p>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setIsUploadOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-neutral-900 dark:text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/25"
                >
                  Upload File
                </button>
                <button 
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSeeding ? <span className="animate-spin border-2 border-white/20 border-t-white w-4 h-4 rounded-full" /> : null}
                  {isSeeding ? 'Loading...' : 'Load Sample Data'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEntries.map(entry => (
                <div 
                  key={entry.id} 
                  onClick={() => setSelectedEntry(entry)}
                  className="group bg-white dark:bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center overflow-hidden">
                    {entry.mediaType === 'video' ? (
                      <>
                        <video src={entry.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                             <Video className="w-5 h-5 text-neutral-900 dark:text-white" />
                           </div>
                        </div>
                      </>
                    ) : (
                      <img src={entry.mediaUrl} alt={entry.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {entry.expectationFulfilled ? (
                        <span className="bg-emerald-500/20 text-emerald-400 backdrop-blur-md px-2 py-0.5 rounded text-xs font-medium border border-emerald-500/20">Target Hit</span>
                      ) : (
                        <span className="bg-rose-500/20 text-rose-400 backdrop-blur-md px-2 py-0.5 rounded text-xs font-medium border border-rose-500/20">Missed</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-medium text-neutral-900 dark:text-white truncate mb-1">{entry.title}</h3>
                    <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-500 mb-3 space-x-2">
                       <span className="capitalize px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">{entry.marketCondition.replace('-', ' ')}</span>
                       {entry.streak !== 'none' && (
                         <span className={cn("capitalize px-1.5 py-0.5 rounded", 
                            entry.streak === 'winning' ? "bg-emerald-900/30 text-emerald-400" : "bg-rose-900/30 text-rose-400"
                         )}>
                            {entry.streak} streak
                         </span>
                       )}
                    </div>
                    <div className="mt-auto block">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {entry.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.5 rounded">#{t}</span>
                        ))}
                        {entry.tags.length > 3 && <span className="text-[10px] text-neutral-500 dark:text-neutral-500 ">+{entry.tags.length - 3}</span>}
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-500 ">
                        {format(entry.createdAt.toDate(), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around z-30 px-2 pb-safe">
        <button 
          onClick={() => { setIsMobileFilterOpen(false); window.scrollTo(0, 0); }}
          className="flex flex-col items-center py-3 px-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors"
        >
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Journal</span>
        </button>
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="flex flex-col items-center py-3 px-4 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors relative"
        >
          <div className="absolute -top-4 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-neutral-950 shadow-lg text-neutral-900 dark:text-white">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium mt-6">Upload</span>
        </button>
        <button 
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          className={cn("flex flex-col items-center py-3 px-4 transition-colors", isMobileFilterOpen ? "text-indigo-400" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white")}
        >
          <Filter className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Filters</span>
        </button>
      </nav>

      {/* Modals */}
      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)} 
          onUploadComplete={() => {
            setIsUploadOpen(false);
            fetchEntries();
          }}
        />
      )}

      {selectedEntry && (
        <EntryModal 
          entry={selectedEntry} 
          onClose={() => setSelectedEntry(null)} 
          onDelete={async () => {
             if (confirm('Delete this entry?')) {
               if (selectedEntry.id) {
                 await deleteJournalEntry(selectedEntry.id);
                 setSelectedEntry(null);
                 fetchEntries();
               }
             }
          }}
        />
      )}
    </div>
  );
}

function UploadModal({ onClose, onUploadComplete }: { onClose: () => void, onUploadComplete: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [streak, setStreak] = useState<Streak>('none');
  const [marketCondition, setMarketCondition] = useState<MarketCondition>('buy-side');
  const [expectationFulfilled, setExpectationFulfilled] = useState(true);
  
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim().toLowerCase())) {
      setTags([...tags, currentTag.trim().toLowerCase()]);
      setCurrentTag('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    
    setLoading(true);
    setError('');
    
    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const url = await uploadMedia(file, user.uid);
      
      await createJournalEntry({
        userId: user.uid,
        mediaUrl: url,
        mediaType,
        title,
        notes,
        streak,
        marketCondition,
        expectationFulfilled,
        tags,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      onUploadComplete();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const marketOptions: { id: MarketCondition, label: string }[] = [
    { id: 'buy-side', label: 'Buy Side' },
    { id: 'sell-side', label: 'Sell Side' },
    { id: 'ranging', label: 'Ranging' },
    { id: 'choppy', label: 'Choppy' },
  ];

  const streakOptions: { id: Streak, label: string }[] = [
    { id: 'none', label: 'Neutral' },
    { id: 'winning', label: 'Winning' },
    { id: 'losing', label: 'Losing' },
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-white dark:bg-neutral-900/80 backdrop-blur-md z-10">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                 <Upload className="w-4 h-4" />
               </div>
               Upload Trade Journal
            </h2>
            <button onClick={onClose} className="text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:bg-neutral-800 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="overflow-y-auto p-8 custom-scrollbar">
            {error && <div className="bg-rose-500/10 text-rose-400 p-4 rounded-xl text-sm mb-6 border border-rose-500/20">{error}</div>}
            
            <form id="upload-form" onSubmit={handleUpload} className="space-y-10">
              {/* Media Upload Area */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">Media</label>
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-10 text-center hover:bg-neutral-100 dark:bg-neutral-800/30 hover:border-indigo-500/50 transition-all cursor-pointer relative group">
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {!file ? (
                     <div className="flex flex-col items-center pointer-events-none">
                       <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 group-hover:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 transition-colors">
                         <Upload className="w-8 h-8 text-neutral-600 dark:text-neutral-400 group-hover:text-indigo-400 transition-colors" />
                       </div>
                       <p className="text-base font-medium text-neutral-900 dark:text-white mb-1">Click to browse or drag and drop</p>
                       <p className="text-sm text-neutral-500 dark:text-neutral-500 ">Supports Images & Video (max 50MB)</p>
                     </div>
                  ) : (
                     <div className="flex flex-col items-center pointer-events-none">
                       <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                         {file.type.startsWith('video/') ? <Video className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                       </div>
                       <p className="text-base font-semibold text-indigo-300 mb-1">{file.name}</p>
                       <p className="text-sm text-neutral-500 dark:text-neutral-500 ">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                     </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="md:col-span-2">
                   <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">Trade Title</label>
                   <input 
                     type="text" 
                     required
                     value={title}
                     onChange={e => setTitle(e.target.value)}
                     className="w-full bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all placeholder-neutral-400 dark:placeholder-neutral-600 font-medium"
                     placeholder="e.g. NQ Long at London Session Open"
                   />
                 </div>

                 {/* Interactive Pills for Categories */}
                 <div className="md:col-span-2 space-y-8">
                   <div>
                     <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">Market Condition</label>
                     <div className="flex flex-wrap gap-3">
                       {marketOptions.map(opt => (
                         <button
                           key={opt.id}
                           type="button"
                           onClick={() => setMarketCondition(opt.id)}
                           className={cn(
                             "relative px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                             marketCondition === opt.id 
                               ? "border-indigo-500 text-neutral-900 dark:text-white" 
                               : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800"
                           )}
                         >
                           {marketCondition === opt.id && (
                             <motion.div
                               layoutId="marketBg"
                               className="absolute inset-0 bg-indigo-600 rounded-full -z-10"
                               transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                             />
                           )}
                           {opt.label}
                         </button>
                       ))}
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                       <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">Streak Phase</label>
                       <div className="flex flex-wrap gap-2">
                         {streakOptions.map(opt => (
                           <button
                             key={opt.id}
                             type="button"
                             onClick={() => setStreak(opt.id)}
                             className={cn(
                               "relative px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                               streak === opt.id 
                                 ? "text-neutral-900 dark:text-white border-transparent" 
                                 : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:bg-neutral-800"
                             )}
                           >
                             {streak === opt.id && (
                               <motion.div
                                 layoutId="streakBg"
                                 className={cn("absolute inset-0 rounded-xl -z-10", 
                                    opt.id === 'winning' ? "bg-emerald-600" : 
                                    opt.id === 'losing' ? "bg-rose-600" : "bg-neutral-600"
                                 )}
                                 transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                               />
                             )}
                             {opt.label}
                           </button>
                         ))}
                       </div>
                     </div>

                     <div>
                       <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">Expectations</label>
                       <div className="flex bg-neutral-50 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
                         <button
                           type="button"
                           onClick={() => setExpectationFulfilled(true)}
                           className={cn("flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                              expectationFulfilled ? "bg-emerald-500/20 text-emerald-400 shadow-sm" : "text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:text-neutral-300"
                           )}
                         >
                           Fulfilled
                         </button>
                         <button
                           type="button"
                           onClick={() => setExpectationFulfilled(false)}
                           className={cn("flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                              !expectationFulfilled ? "bg-rose-500/20 text-rose-400 shadow-sm" : "text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:text-neutral-300"
                           )}
                         >
                           Missed
                         </button>
                       </div>
                     </div>
                   </div>

                   {/* Add Tag Section */}
                   <div>
                     <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 uppercase tracking-wider">Tags</label>
                     <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 flex flex-wrap gap-2 min-h-[56px] items-center focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                       <AnimatePresence>
                         {tags.map(tag => (
                           <motion.span
                             key={tag}
                             initial={{ scale: 0.8, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             exit={{ scale: 0.8, opacity: 0 }}
                             className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
                           >
                             #{tag}
                             <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="text-neutral-500 dark:text-neutral-500 hover:text-rose-400 transition-colors">
                               <X className="w-3.5 h-3.5" />
                             </button>
                           </motion.span>
                         ))}
                       </AnimatePresence>
                       <input 
                         type="text" 
                         value={currentTag}
                         onChange={e => setCurrentTag(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' || e.key === ',') {
                             e.preventDefault();
                             handleAddTag();
                           }
                         }}
                         className="flex-1 bg-transparent min-w-[120px] px-2 py-1 text-sm text-neutral-900 dark:text-white focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-600"
                         placeholder={tags.length === 0 ? "Type tag & hit Enter..." : "Add tag..."}
                       />
                     </div>
                   </div>
                 </div>

                 <div className="md:col-span-2">
                   <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">Journal Notes</label>
                   <textarea 
                     rows={4}
                     value={notes}
                     onChange={e => setNotes(e.target.value)}
                     className="w-full bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none resize-none transition-all placeholder-neutral-400 dark:placeholder-neutral-600"
                     placeholder="What did you see? Emotive state? Lessons learned?"
                   />
                 </div>
              </div>
            </form>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-white dark:bg-neutral-900 flex justify-between items-center sm:flex-row flex-col gap-4">
             <div className="text-xs text-neutral-500 dark:text-neutral-500 font-medium">
               Complete all fields to save your entry
             </div>
             <div className="flex gap-3 w-full sm:w-auto">
              <button type="button" onClick={onClose} disabled={loading} className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:bg-neutral-700 rounded-xl transition-all disabled:opacity-50 flex-1 sm:flex-none">Cancel</button>
              <button 
                type="submit" 
                form="upload-form"
                disabled={loading || !file} 
                className="bg-indigo-600 hover:bg-indigo-500 text-neutral-900 dark:text-white px-8 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-lg shadow-indigo-500/25"
              >
                {loading ? <span className="animate-spin border-2 border-white/20 border-t-white w-4 h-4 rounded-full" /> : <Check className="w-5 h-5" />}
                {loading ? 'Processing...' : 'Save to Vault'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function EntryModal({ entry, onClose, onDelete }: { entry: JournalEntry, onClose: () => void, onDelete: () => void }) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <AnimatePresence>
      {isZoomed && entry.mediaType !== 'video' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <button 
            className="fixed top-6 right-6 z-[70] bg-white/10 text-neutral-900 dark:text-white p-3 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md"
            onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="w-full h-full flex items-center justify-center p-0" onClick={(e) => e.stopPropagation()}>
            <TransformWrapper
               initialScale={1}
               minScale={0.5}
               maxScale={8}
               centerOnInit={true}
               wheel={{ step: 0.1 }}
            >
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src={entry.mediaUrl} 
                  alt={entry.title} 
                  className="w-auto h-auto max-w-full max-h-[100vh] object-contain cursor-grab active:cursor-grabbing" 
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
        >
          <button onClick={onClose} className="absolute top-6 right-6 z-10 bg-black/50 text-neutral-900 dark:text-white p-2.5 rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm shadow-xl">
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-black/50 flex items-center justify-center p-2 relative group">
            {entry.mediaType === 'video' ? (
               <video src={entry.mediaUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-xl" />
            ) : (
               <>
                 <img 
                   src={entry.mediaUrl} 
                   alt={entry.title} 
                   className="max-w-full max-h-full object-contain rounded-xl cursor-zoom-in" 
                   onClick={() => setIsZoomed(true)}
                 />
                 <button 
                   onClick={() => setIsZoomed(true)}
                   className="absolute top-6 left-6 z-10 bg-black/50 text-neutral-900 dark:text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-xl flex items-center gap-2 text-sm font-medium pr-4"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
                   Zoom
                 </button>
               </>
            )}
          </div>

          <div className="w-full md:w-96 bg-white dark:bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col overflow-y-auto">
             <div className="p-8">
               <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white leading-tight">{entry.title}</h2>
               </div>
               <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-8">Uploaded on {format(entry.createdAt.toDate(), 'MMMM do, yyyy')}</p>

               <div className="space-y-8">
                 <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 mb-4">Trade Context</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-inner">
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-widest mb-1.5">Market</p>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white capitalize">{entry.marketCondition.replace('-', ' ')}</p>
                      </div>
                      <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-inner">
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-widest mb-1.5">Streak</p>
                        <p className={cn("text-sm font-semibold capitalize", entry.streak === 'none' ? 'text-neutral-900 dark:text-white' : entry.streak === 'winning' ? 'text-emerald-400' : 'text-rose-400')}>
                          {entry.streak}
                        </p>
                      </div>
                    </div>
                    
                    <div className={cn("rounded-xl p-4 border", entry.expectationFulfilled ? "bg-emerald-950/20 border-emerald-900/30" : "bg-rose-950/20 border-rose-900/30")}>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-widest mb-1.5">Outcome vs Expectation</p>
                      <p className={cn("text-sm font-semibold", entry.expectationFulfilled ? "text-emerald-400" : "text-rose-400")}>
                        {entry.expectationFulfilled ? "Trade played out as expected" : "Trade deviated or failed"}
                      </p>
                    </div>
                 </div>

                 {entry.tags.length > 0 && (
                   <div>
                     <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 mb-4">Tags</h4>
                     <div className="flex flex-wrap gap-2">
                       {entry.tags.map(t => (
                         <span key={t} className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700/50">#{t}</span>
                       ))}
                     </div>
                   </div>
                 )}

                 {entry.notes && (
                   <div>
                     <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 mb-4">Journal Notes</h4>
                     <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap shadow-inner h-[200px] overflow-y-auto custom-scrollbar">
                       {entry.notes}
                     </div>
                   </div>
                 )}
               </div>
             </div>

             <div className="mt-auto p-6 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-white dark:bg-neutral-900">
               <button 
                 onClick={onDelete}
                 className="w-full py-3 rounded-xl border border-rose-900/50 text-rose-400 font-semibold text-sm hover:bg-rose-950/50 hover:text-rose-300 transition-colors shadow-sm"
               >
                 Delete Entry
               </button>
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WelcomeScreen() {
  const { signIn } = useAuth();
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute inset-0 max-w-7xl mx-auto overflow-hidden hidden md:block opacity-20 pointer-events-none">
         {/* Subtle grid background */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>
      
      <div className="max-w-md w-full text-center relative z-10 px-8 py-12 rounded-3xl bg-white dark:bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-indigo-500/50">
          <Calendar className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">ProTrader Vault</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8 text-sm leading-relaxed">
          The ultimate visual journal for serious traders. Archive screenshots, screen recordings, filter by market conditions, and learn from past behavior.
        </p>
        <button 
          onClick={signIn}
          className="w-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold rounded-xl py-3 px-6 transition-all transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return user ? <Dashboard /> : <WelcomeScreen />;
}
