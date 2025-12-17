import React, { useState, useEffect } from 'react';
import { RealWordGame, PhotoGame, FillBlankGame, CompleteTextGame } from './components/Activities';
import { studyPlan, realWords, transitionWordsList, photoWords, WordDef } from './data';
import { getWordDetails } from './services/geminiService';

type View = 'dashboard' | 'realword' | 'photo' | 'spelling' | 'completetext' | 'flashcards' | 'plan';

// --- Standalone Flashcards Component ---
const FlashcardsActivity = ({ 
    knownWords, 
    onMarkKnown, 
    onResetCategory 
}: { 
    knownWords: string[], 
    onMarkKnown: (word: string) => void, 
    onResetCategory: (category: 'general' | 'transitions' | 'photo') => void 
}) => {
    const [category, setCategory] = useState<'general' | 'transitions' | 'photo' | null>(null);
    const [index, setIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [cardDetails, setCardDetails] = useState<{translation: string, example: string} | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDeckFinished, setIsDeckFinished] = useState(false);
    
    // Select the deck based on category and filter known words
    let fullDeck: WordDef[] = [];
    if (category === 'general') fullDeck = realWords;
    if (category === 'transitions') fullDeck = transitionWordsList;
    if (category === 'photo') fullDeck = photoWords;

    // Filter out words that are already known
    const deck = fullDeck.filter(w => !knownWords.includes(w.word));

    // Reset local state when category changes
    useEffect(() => {
        setIndex(0);
        setFlipped(false);
        setCardDetails(null);
        setIsDeckFinished(false);
    }, [category]);

    // Handle fetching details or detecting end of deck
    useEffect(() => {
        if (!category) return;
        
        // Check if finished
        if (deck.length === 0) {
            // Only finish if there were words originally (avoid flicker on empty category)
            if (fullDeck.length > 0) setIsDeckFinished(true);
            return;
        }

        const fetchDetails = async () => {
            setLoading(true);
            setCardDetails(null);
            
            // Safe index check. If index is out of bounds (e.g. word removed), fallback to 0
            const currentWord = deck[index] || deck[0];
            if (!currentWord) return;

            const details = await getWordDetails(currentWord.word);
            setCardDetails(details);
            setLoading(false);
        };
        fetchDetails();
    }, [index, category, deck.length, fullDeck.length]); 

    const handleReset = () => {
        if (category) {
            onResetCategory(category);
            // Reset local view state
            setIndex(0);
            setIsDeckFinished(false);
        }
    };

    const handleKnown = () => {
        setFlipped(false);
        
        const currentCard = deck[index] || deck[0];
        if (!currentCard) return;

        // Mark known in parent state
        onMarkKnown(currentCard.word);
        
        // Logic for "Next Word"
        if (index >= deck.length - 1) {
             setIndex(0);
        }
    };

    const handleUnknown = () => {
        setFlipped(false);
        setTimeout(() => setIndex((index + 1) % deck.length), 200);
    };

    // --- Detail View Logic for Dashboard/Category ---
    if (!category) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="flex justify-between w-full max-w-4xl mb-8 items-end px-4">
                    <h2 className="text-3xl font-extrabold text-det-dark">Select a Category</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
                    <button onClick={() => setCategory('general')} className="flex flex-col items-center p-8 bg-white border-2 border-gray-200 rounded-2xl hover:border-det-blue hover:shadow-lg transition-all group">
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📚</div>
                        <span className="font-bold text-xl text-det-dark">General Vocabulary</span>
                        <div className="mt-2 text-xs font-bold text-det-green">{realWords.filter(w => knownWords.includes(w.word)).length} learned</div>
                    </button>
                    <button onClick={() => setCategory('transitions')} className="flex flex-col items-center p-8 bg-white border-2 border-gray-200 rounded-2xl hover:border-det-orange hover:shadow-lg transition-all group">
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🔗</div>
                        <span className="font-bold text-xl text-det-dark">Transition Words</span>
                        <div className="mt-2 text-xs font-bold text-det-green">{transitionWordsList.filter(w => knownWords.includes(w.word)).length} learned</div>
                    </button>
                    <button onClick={() => setCategory('photo')} className="flex flex-col items-center p-8 bg-white border-2 border-gray-200 rounded-2xl hover:border-det-green hover:shadow-lg transition-all group">
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🖼️</div>
                        <span className="font-bold text-xl text-det-dark">Photo Description</span>
                        <div className="mt-2 text-xs font-bold text-det-green">{photoWords.filter(w => knownWords.includes(w.word)).length} learned</div>
                    </button>
                </div>
            </div>
        )
    }

    if (isDeckFinished) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold text-det-dark mb-4">You've mastered this section!</h2>
                <p className="text-gray-500 mb-8">All words in this category are marked as known.</p>
                <div className="flex gap-4">
                    <button onClick={() => setCategory(null)} className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-300">Back to Categories</button>
                    <button onClick={handleReset} className="bg-det-blue text-white px-8 py-3 rounded-xl font-bold shadow-md">Restart {category}</button>
                </div>
            </div>
        );
    }

    if (deck.length === 0) return <div>Loading...</div>;

    const currentCard = deck[index] || deck[0];

    return (
        <div className="flex flex-col items-center justify-center h-[80vh]">
            <div className="flex items-center gap-4 mb-8 w-full max-w-md">
                <button onClick={() => setCategory(null)} className="text-gray-400 font-bold hover:text-det-dark">← Categories</button>
                <h2 className="text-xl font-bold flex-1 text-center capitalize">{category} ({deck.length} left)</h2>
                <div className="relative group">
                     <button className="text-gray-300 hover:text-det-dark">⚙️</button>
                     <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg hidden group-hover:block p-2 z-50">
                         <button onClick={handleReset} className="w-full text-left text-sm text-red-500 font-bold px-4 py-2 hover:bg-red-50 rounded-lg">Reset Progress</button>
                     </div>
                </div>
            </div>
            
            <div 
                className="relative w-96 h-96 perspective-1000 cursor-pointer group"
                onClick={() => setFlipped(!flipped)}
            >
                <div className={`relative w-full h-full text-center transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : '' }}>
                    {/* --- FRONT --- */}
                    <div className="absolute w-full h-full bg-white border-2 border-gray-200 rounded-2xl shadow-xl flex flex-col items-center justify-center backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                        <div className="w-full border-b border-gray-100 py-4 absolute top-0">
                            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">{currentCard.type} • {currentCard.level}</span>
                        </div>
                        <h3 className="text-4xl font-extrabold text-det-dark mt-4 capitalize">{currentCard.word}</h3>
                        <p className="text-gray-300 text-xs absolute bottom-4">Tap to flip</p>
                    </div>

                    {/* --- BACK --- */}
                    <div className="absolute w-full h-full bg-det-blue border-2 border-det-blue rounded-2xl shadow-xl flex flex-col items-center justify-between py-8 px-6 text-white backface-hidden rotate-y-180" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div className="flex-1 flex flex-col items-center justify-center w-full border-b border-white/20">
                             <div className="uppercase text-xs font-bold opacity-70 mb-2">Traduction</div>
                             {loading ? <div className="animate-pulse h-6 w-24 bg-white/30 rounded"></div> : <h3 className="text-3xl font-bold">{cardDetails?.translation || "..."}</h3>}
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                             <div className="uppercase text-xs font-bold opacity-70 mb-2">Exemple</div>
                             {loading ? <div className="animate-pulse h-12 w-full bg-white/30 rounded"></div> : <p className="text-lg italic leading-relaxed text-center">"{cardDetails?.example}"</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-10 flex gap-4 w-96">
                <button onClick={handleUnknown} className="flex-1 bg-red-100 text-red-600 border-2 border-red-200 py-3 rounded-xl font-bold hover:bg-red-200 active:translate-y-0.5 transition-colors flex items-center justify-center gap-2">
                    <span>❌</span> Review
                </button>
                <button onClick={handleKnown} className="flex-1 bg-green-100 text-green-700 border-2 border-green-200 py-3 rounded-xl font-bold hover:bg-green-200 active:translate-y-0.5 transition-colors flex items-center justify-center gap-2">
                    <span>✔️</span> I Know It
                </button>
            </div>
        </div>
    )
};

// --- Authentication Components ---

const LoginScreen = ({ onLogin }: { onLogin: (name: string) => void }) => {
    const [input, setInput] = useState("");
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
                <div className="text-6xl mb-4">🎓</div>
                <h1 className="text-3xl font-extrabold text-det-dark mb-2">DET Master</h1>
                <p className="text-gray-500 mb-8">Enter your name to track your 2-week progress.</p>
                
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g., Paul"
                    className="w-full text-center text-xl p-4 border-2 border-gray-200 rounded-xl mb-6 focus:border-det-blue focus:outline-none font-bold"
                    onKeyDown={(e) => e.key === 'Enter' && input.trim() && onLogin(input.trim())}
                />
                
                <button 
                    onClick={() => input.trim() && onLogin(input.trim())}
                    disabled={!input.trim()}
                    className="w-full bg-det-green text-white py-4 rounded-xl font-bold text-lg shadow-[0_4px_0_0_#46a302] active:translate-y-0.5 active:shadow-none hover:bg-green-500 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                    Start Learning
                </button>
            </div>
        </div>
    )
};

// --- Main Application Logic (Authenticated) ---

const AuthenticatedApp = ({ user, onLogout }: { user: string, onLogout: () => void }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // -- PERSISTENCE LOGIC --
  const STORAGE_KEY_WORDS = `det_${user}_known_words`;
  const STORAGE_KEY_DAYS = `det_${user}_completed_days`;

  const [knownWords, setKnownWords] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WORDS);
    return saved ? JSON.parse(saved) : [];
  });

  const [completedDays, setCompletedDays] = useState<number[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DAYS);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WORDS, JSON.stringify(knownWords));
  }, [knownWords, STORAGE_KEY_WORDS]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(completedDays));
  }, [completedDays, STORAGE_KEY_DAYS]);

  const toggleDay = (day: number) => {
    if (completedDays.includes(day)) {
      setCompletedDays(prev => prev.filter(d => d !== day));
    } else {
      setCompletedDays(prev => [...prev, day]);
    }
  };

  const markWordKnown = (word: string) => {
      if (!knownWords.includes(word)) {
          setKnownWords(prev => [...prev, word]);
      }
  };

  const resetCategoryProgress = (category: 'general' | 'transitions' | 'photo') => {
      if (confirm(`Do you want to reset all progress for the "${category}" category?`)) {
           let deckToReset: WordDef[] = [];
           if (category === 'general') deckToReset = realWords;
           if (category === 'transitions') deckToReset = transitionWordsList;
           if (category === 'photo') deckToReset = photoWords;

           const wordsToRemove = deckToReset.map(w => w.word);
           setKnownWords(prev => prev.filter(w => !wordsToRemove.includes(w)));
      }
  };

  const Sidebar = () => (
    <div className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col h-screen fixed left-0 top-0 z-10">
      <div className="p-6">
        <h1 className="text-2xl font-extrabold text-det-green tracking-tight">DET Master</h1>
        <div className="flex justify-between items-center mt-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{user}</span>
            <button onClick={onLogout} className="text-xs text-red-400 hover:text-red-600 font-bold">Log Out</button>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <SidebarItem icon="🏠" label="Dashboard" view="dashboard" />
        <SidebarItem icon="📅" label="2-Week Plan" view="plan" />
        <div className="pt-4 pb-2 pl-2 text-xs font-bold text-gray-400 uppercase">Practice</div>
        <SidebarItem icon="✅" label="Real Words" view="realword" />
        <SidebarItem icon="📷" label="Describe Photo" view="photo" />
        <SidebarItem icon="✍️" label="Complete Sentence" view="spelling" />
        <SidebarItem icon="📝" label="Complete Text" view="completetext" />
        <SidebarItem icon="🗂️" label="Flashcards" view="flashcards" />
      </nav>
      <div className="p-4 border-t border-gray-100">
         <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
             <div className="text-xs font-bold text-yellow-700 mb-1">PRO TIP</div>
             <p className="text-xs text-yellow-800 leading-relaxed">
                 Use the <b>5W + H</b> method for photos: Who, What, Where, When, Why + How.
             </p>
         </div>
      </div>
    </div>
  );

  const SidebarItem = ({ icon, label, view }: { icon: string, label: string, view: View }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${currentView === view ? 'bg-blue-50 text-det-blue border border-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
    >
      <span className="text-xl">{icon}</span>
      {label}
    </button>
  );

  const Dashboard = () => {
      const totalWords = realWords.length + transitionWordsList.length + photoWords.length;
      const progress = Math.round((knownWords.length / totalWords) * 100);

      return (
        <div className="max-w-5xl mx-auto">
        <header className="mb-8">
            <h2 className="text-3xl font-extrabold text-det-dark mb-2">Welcome back, {user}!</h2>
            <p className="text-gray-500">You have <span className="text-det-orange font-bold">14 days</span> to master the Duolingo English Test.</p>
        </header>

        {/* Stats Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Vocabulary Progress</h3>
                <span className="text-det-green font-bold">{knownWords.length} / {totalWords} words learned</span>
            </div>
            <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
                <div className="bg-det-green h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="mt-4 flex gap-2">
                 <button onClick={() => setCurrentView('flashcards')} className="text-sm text-det-blue font-bold hover:underline">Review unknown words</button>
                 <span className="text-gray-300">|</span>
                 <button onClick={() => alert("Check the flashcards section to see the full list.")} className="text-sm text-gray-500 hover:text-gray-700">See word list details</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm hover:border-det-green transition-colors cursor-pointer group" onClick={() => setCurrentView('realword')}>
            <div className="w-12 h-12 bg-green-100 text-det-green rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">✅</div>
            <h3 className="font-bold text-lg text-det-dark mb-1">Real Words</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm hover:border-det-blue transition-colors cursor-pointer group" onClick={() => setCurrentView('photo')}>
            <div className="w-12 h-12 bg-blue-100 text-det-blue rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📷</div>
            <h3 className="font-bold text-lg text-det-dark mb-1">Photo Description</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm hover:border-det-orange transition-colors cursor-pointer group" onClick={() => setCurrentView('spelling')}>
            <div className="w-12 h-12 bg-orange-100 text-det-orange rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">✍️</div>
            <h3 className="font-bold text-lg text-det-dark mb-1">Fill in Blanks</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm hover:border-purple-400 transition-colors cursor-pointer group" onClick={() => setCurrentView('completetext')}>
            <div className="w-12 h-12 bg-purple-100 text-purple-500 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📝</div>
            <h3 className="font-bold text-lg text-det-dark mb-1">Complete Text</h3>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-det-dark">Today's Focus: Day {completedDays.length + 1}</h3>
                <button onClick={() => setCurrentView('plan')} className="text-det-blue font-bold text-sm uppercase hover:underline">View Full Plan</button>
            </div>
            {studyPlan[completedDays.length] ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">Day {completedDays.length + 1} • {studyPlan[completedDays.length].topic}</div>
                        <div className="text-lg font-bold text-det-blue">{studyPlan[completedDays.length].activity}</div>
                    </div>
                    <button className="bg-det-blue text-white px-6 py-2 rounded-lg font-bold shadow-md active:translate-y-0.5">Start Now</button>
                </div>
            ) : (
                <div className="p-4 text-center text-gray-500">Plan Completed! Good luck on your test!</div>
            )}
        </div>
        </div>
      );
  }

  const PlanView = () => (
      <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">2-Week Revision Plan</h2>
          <div className="grid gap-4">
              {studyPlan.map((day) => (
                  <div key={day.day} className={`flex items-center p-4 rounded-xl border-2 transition-all ${completedDays.includes(day.day) ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-100 hover:border-det-blue'}`}>
                      <button 
                        onClick={() => toggleDay(day.day)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${completedDays.includes(day.day) ? 'bg-det-green border-det-green text-white' : 'border-gray-300 text-transparent hover:border-det-green'}`}
                      >
                          ✓
                      </button>
                      <div className="flex-1">
                          <span className="text-xs font-bold text-gray-400 uppercase mr-2">Day {day.day}</span>
                          <span className="font-bold text-det-dark">{day.topic}</span>
                      </div>
                      <div className="text-sm text-gray-500 hidden sm:block">{day.activity}</div>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-det-dark">
        <Sidebar />
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
            <h1 className="text-xl font-extrabold text-det-green">DET Master</h1>
            <button onClick={() => setCurrentView('dashboard')} className="text-sm font-bold text-gray-500">Menu</button>
        </div>

        <main className="md:ml-64 p-4 md:p-8 h-screen overflow-y-auto">
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'plan' && <PlanView />}
            {currentView === 'realword' && <RealWordGame onComplete={() => setCurrentView('dashboard')} />}
            {currentView === 'photo' && <PhotoGame onBack={() => setCurrentView('dashboard')} />}
            {currentView === 'spelling' && <FillBlankGame onBack={() => setCurrentView('dashboard')} />}
            {currentView === 'completetext' && <CompleteTextGame onBack={() => setCurrentView('dashboard')} />}
            {currentView === 'flashcards' && <FlashcardsActivity knownWords={knownWords} onMarkKnown={markWordKnown} onResetCategory={resetCategoryProgress} />}
        </main>
    </div>
  );
};

// --- Root App Wrapper ---
function App() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('det_current_user'));

  const handleLogin = (name: string) => {
      localStorage.setItem('det_current_user', name);
      setUser(name);
  };

  const handleLogout = () => {
      localStorage.removeItem('det_current_user');
      setUser(null);
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return <AuthenticatedApp key={user} user={user} onLogout={handleLogout} />;
}

export default App;