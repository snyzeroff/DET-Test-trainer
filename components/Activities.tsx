import React, { useState, useEffect, useRef } from 'react';
import { realWords, fakeWords, photoVocab, photoMethod, transitionWords } from '../data';
import { evaluatePhotoDescription, generateFillInBlank, generateParagraphTask } from '../services/geminiService';

// --- Shared Components ---
const Timer = ({ duration, onFinish, label }: { duration: number, onFinish: () => void, label?: string }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      onFinish();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onFinish]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className={`flex items-center gap-2 font-bold text-lg ${timeLeft < 10 ? 'text-det-red animate-pulse' : 'text-det-dark/60'}`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      {label && <span className="mr-1">{label}:</span>}
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
};

// --- Game 1: Real Word Selection ---
export const RealWordGame = ({ onComplete }: { onComplete: () => void }) => {
  const [words, setWords] = useState<{ text: string, isReal: boolean }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [userResults, setUserResults] = useState<{ word: string, isReal: boolean, correct: boolean }[]>([]);
  
  // Per word timer state
  const [timeLeft, setTimeLeft] = useState(500); // 500 * 10ms = 5000ms = 5s
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Generate a mix of 10 real and 10 fake words, shuffled
    const reals = realWords.sort(() => 0.5 - Math.random()).slice(0, 10).map(w => ({ text: w.word, isReal: true }));
    const fakes = fakeWords.sort(() => 0.5 - Math.random()).slice(0, 10).map(w => ({ text: w, isReal: false }));
    const mix = [...reals, ...fakes].sort(() => 0.5 - Math.random());
    setWords(mix);
  }, []);

  // Timer logic for 5 seconds per word
  useEffect(() => {
    if (gameOver || words.length === 0) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          // Time expired for this word
          handleNext(false); // treat as wrong/missed
          return 500; // reset
        }
        return prev - 1;
      });
    }, 10); // tick every 10ms for smooth bar

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, gameOver, words]);

  const handleNext = (isCorrect: boolean) => {
    // Record result
    const currentWord = words[currentIndex];
    setUserResults(prev => [...prev, { word: currentWord.text, isReal: currentWord.isReal, correct: isCorrect }]);

    if (isCorrect) setScore(s => s + 1);
    
    // Reset timer immediately for UI responsiveness
    setTimeLeft(500); 

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setGameOver(true);
    }
  };

  const handleChoice = (choice: boolean) => {
    const isCorrect = choice === words[currentIndex].isReal;
    handleNext(isCorrect);
  };

  if (words.length === 0) return <div>Loading...</div>;

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl max-w-2xl mx-auto mt-10">
        <h2 className="text-2xl font-bold mb-4">Round Complete!</h2>
        <div className="text-6xl mb-6">🎯</div>
        <p className="text-xl mb-6">Score: <span className="text-det-green font-bold">{score}/{words.length}</span></p>
        
        <div className="w-full max-h-96 overflow-y-auto border border-gray-200 rounded-xl mb-6">
            <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Word</th>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Type</th>
                        <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Result</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {userResults.map((res, idx) => (
                        <tr key={idx} className={res.correct ? "bg-white" : "bg-red-50"}>
                            <td className="p-3 font-bold text-det-dark">{res.word}</td>
                            <td className="p-3 text-sm text-gray-500">
                                {res.isReal ? <span className="text-det-blue font-bold">Real Word</span> : "Pseudo-word"}
                            </td>
                            <td className="p-3 text-right">
                                {res.correct ? (
                                    <span className="text-det-green font-bold">Correct ✓</span>
                                ) : (
                                    <span className="text-det-red font-bold">Mistake ✗</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <button onClick={onComplete} className="bg-det-blue text-white py-3 px-8 rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-[0_4px_0_0_#1485b8] active:translate-y-0.5 active:shadow-none">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Calculate percentage for progress bar (500 ticks = 100%)
  const timePercentage = (timeLeft / 500) * 100;
  const barColor = timePercentage < 30 ? 'bg-det-red' : 'bg-det-green';

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4">
      <div className="w-full bg-gray-200 h-4 rounded-full mb-8 overflow-hidden">
        <div 
            className={`h-full ${barColor} transition-all duration-75 linear`} 
            style={{ width: `${timePercentage}%` }}
        ></div>
      </div>
      
      <div className="text-center text-gray-400 font-bold mb-2">Word {currentIndex + 1} of {words.length}</div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <h3 className="text-det-dark/70 font-semibold mb-8 text-xl">Is this a real English word?</h3>
        
        <div className="text-5xl font-extrabold text-det-dark mb-16 tracking-wide">
          {words[currentIndex].text}
        </div>

        <div className="flex gap-8 w-full max-w-md">
          <button 
            onClick={() => handleChoice(true)}
            className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-2xl hover:bg-green-50 hover:border-det-green transition-all group"
          >
            <div className="w-12 h-12 rounded-full border-2 border-det-green flex items-center justify-center mb-2 group-hover:bg-det-green text-det-green group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="font-bold text-det-green">YES</span>
          </button>

          <button 
             onClick={() => handleChoice(false)}
             className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-2xl hover:bg-red-50 hover:border-det-red transition-all group"
          >
            <div className="w-12 h-12 rounded-full border-2 border-det-red flex items-center justify-center mb-2 group-hover:bg-det-red text-det-red group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <span className="font-bold text-det-red">NO</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Game 2: Write About Photo ---
export const PhotoGame = ({ onBack }: { onBack: () => void }) => {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<'writing' | 'evaluating' | 'results' | 'timeout'>('writing');
  const [result, setResult] = useState<any>(null);

  // Placeholder image (using abstract or nature to simulate general DET photos)
  const imageUrl = "https://picsum.photos/600/400"; 

  const handleSubmit = async () => {
    setStage('evaluating');
    const evaluation = await evaluatePhotoDescription(text, imageUrl);
    setResult(evaluation);
    setStage('results');
  };

  const handleTimeout = () => {
      // If time runs out, we force evaluation or show timeout screen
      if (text.length > 10) {
          handleSubmit();
      } else {
          setStage('timeout');
      }
  };

  if (stage === 'evaluating') {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-pulse">
        <div className="text-4xl mb-4">🤖</div>
        <h2 className="text-xl font-bold text-det-dark">AI Tutor is grading your writing...</h2>
        <p className="text-gray-500">Checking vocabulary, structure, and spelling.</p>
      </div>
    );
  }

  if (stage === 'timeout') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <h2 className="text-3xl font-extrabold text-det-red mb-4">Time's Up!</h2>
            <p className="text-gray-600 mb-8">You didn't write enough in time. In the real test, keep typing!</p>
            <button onClick={() => setStage('writing')} className="bg-det-blue text-white px-6 py-3 rounded-xl font-bold">Try Again</button>
            <button onClick={onBack} className="mt-4 text-gray-500 font-bold">Exit</button>
        </div>
      )
  }

  if (stage === 'results' && result) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg my-8">
        <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold">Feedback</h2>
            <div className={`px-4 py-2 rounded-lg font-bold text-white ${result.score > 70 ? 'bg-det-green' : 'bg-det-orange'}`}>
                Score: {result.score}/100
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-bold text-det-blue mb-2">Overall Feedback</h3>
                <p className="dys-text">{result.feedback}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-bold text-det-orange mb-2">Corrections</h3>
                <ul className="list-disc pl-5 dys-text text-sm">
                    {result.corrections?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
            </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
            <h3 className="font-bold text-det-blue mb-2">Suggested Better Version</h3>
            <p className="dys-text italic text-gray-700">"{result.betterVersion}"</p>
        </div>

        <button onClick={onBack} className="w-full bg-det-dark text-white py-3 rounded-xl font-bold">Back to Menu</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-2">
            <span className="bg-det-orange text-white px-2 py-1 rounded text-xs font-bold uppercase">Writing</span>
            <span className="text-gray-500 font-semibold">Describe the image</span>
         </div>
         {/* STRICT 60s TIMER */}
         <Timer duration={60} onFinish={handleTimeout} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
        <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-gray-100 flex items-center justify-center relative">
            <img src={imageUrl} alt="DET Practice" className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Structure: Intro → Foreground → Background → Speculation
            </div>
        </div>

        <div className="flex flex-col">
            <textarea
                className="flex-1 w-full border-2 border-gray-200 rounded-2xl p-4 resize-none focus:outline-none focus:border-det-blue text-lg dys-text mb-4 bg-det-dark text-white placeholder-gray-400"
                placeholder="Write at least one sentence. Describe what you see..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false} // Force user to rely on own spelling
            />
            
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {photoVocab.speculation.map((phrase, i) => (
                    <button key={i} onClick={() => setText(prev => prev + phrase + " ")} className="whitespace-nowrap px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 border border-gray-300">
                        {phrase}
                    </button>
                ))}
            </div>

            <button 
                onClick={handleSubmit} 
                disabled={text.length < 10}
                className="bg-det-green text-white py-3 px-6 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 transition-colors shadow-[0_4px_0_0_rgba(21,128,61,1)] hover:shadow-[0_2px_0_0_rgba(21,128,61,1)] hover:translate-y-[2px]"
            >
                SUBMIT RESPONSE
            </button>
        </div>
      </div>
    </div>
  );
};

// --- Game 3: Fill in the Blanks (Sentence Level) ---
// Mimics "Complete the sentence with the correct word"
export const FillBlankGame = ({ onBack }: { onBack: () => void }) => {
    const [data, setData] = useState<{sentence: string, missingWord: string} | null>(null);
    const [userInput, setUserInput] = useState("");
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
    const [loading, setLoading] = useState(false);
    
    // Prefix logic: show first 1-2 letters depending on length
    const getPrefix = (word: string) => word.substring(0, Math.max(1, Math.floor(word.length / 3)));
    
    const loadNew = async () => {
        setLoading(true);
        setFeedback('none');
        setUserInput("");
        const res = await generateFillInBlank();
        setData(res);
        setLoading(false);
    };

    const handleTimeUp = () => {
        if (feedback === 'none') {
             checkAnswer(true); // Force check on timeout
        }
    };

    useEffect(() => { loadNew(); }, []);

    const checkAnswer = (isTimeout = false) => {
        if (!data) return;
        const prefix = getPrefix(data.missingWord);
        const fullAttempt = prefix + userInput;
        
        if (fullAttempt.trim().toLowerCase() === data.missingWord.toLowerCase()) {
            setFeedback('correct');
        } else {
            setFeedback('incorrect');
        }
    };

    if (loading || !data) return <div className="text-center mt-20">Generating sentence...</div>;

    const prefix = getPrefix(data.missingWord);
    const regex = new RegExp(`\\b${data.missingWord}\\b`, 'i');
    const parts = data.sentence.split(regex);

    return (
        <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-md border border-gray-100">
             <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                 <h2 className="text-xl font-bold text-det-dark">Complete the sentence</h2>
                 <Timer duration={20} onFinish={handleTimeUp} label="0" />
             </div>

             <div className="text-xl leading-loose dys-text mb-8 text-det-dark">
                <span>{parts[0]}</span>
                
                {/* Inline Input Container */}
                <div className="inline-flex items-center mx-1 bg-gray-100 border border-gray-300 rounded px-2 py-1">
                    <span className="font-bold text-gray-500">{prefix}</span>
                    <input 
                        type="text" 
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className={`bg-transparent outline-none font-bold w-32 ${feedback === 'correct' ? 'text-det-green' : feedback === 'incorrect' ? 'text-det-red' : 'text-det-dark'}`}
                        placeholder=""
                        disabled={feedback !== 'none'}
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                    />
                </div>

                <span>{parts[1]}</span>
             </div>

             {feedback === 'incorrect' && (
                 <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100">
                     <p className="text-det-red font-bold">Incorrect or Time Up!</p>
                     <p className="text-det-dark">The correct word was: <span className="font-extrabold">{data.missingWord}</span></p>
                 </div>
             )}

             {feedback === 'correct' && (
                 <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-100">
                     <div className="text-det-green font-bold">✨ Correct!</div>
                 </div>
             )}

             <div className="flex justify-end">
                 {feedback !== 'none' ? (
                     <button onClick={loadNew} className="bg-det-green text-white py-3 px-8 rounded-xl font-bold shadow-md hover:translate-y-[-2px] transition-transform">NEXT SENTENCE</button>
                 ) : (
                     <button onClick={() => checkAnswer()} className="bg-det-blue text-white py-3 px-8 rounded-xl font-bold shadow-md active:shadow-none active:translate-y-1">SUBMIT</button>
                 )}
             </div>
        </div>
    );
};

// --- Game 4: Complete the Text (C-Test / Paragraph Level) ---
interface Token {
    fullWord: string;
    prefix: string;
    isBlank: boolean;
    userAnswer: string;
    isCorrect?: boolean;
}

export const CompleteTextGame = ({ onBack }: { onBack: () => void }) => {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [topic, setTopic] = useState("");
    const [loading, setLoading] = useState(true);
    const [gameState, setGameState] = useState<'playing' | 'review'>('playing');

    useEffect(() => {
        loadLevel();
    }, []);

    const loadLevel = async () => {
        setLoading(true);
        setGameState('playing');
        const data = await generateParagraphTask();
        setTopic(data.topic);
        
        // Process text into C-Test tokens
        const rawWords = data.text.split(/(\s+|[.,!?;])/); // Split keeping delimiters
        const newTokens: Token[] = rawWords.map((w: string) => {
            const isWord = /^[a-zA-Z]+$/.test(w);
            // Randomly blank out ~40% of words that are long enough (>3 chars)
            const shouldBlank = isWord && w.length > 3 && Math.random() > 0.6;
            
            if (shouldBlank) {
                const prefixLen = Math.ceil(w.length / 2); // Show first half
                const prefix = w.substring(0, 1); // DET style often shows just 1 or 2 letters. Let's do 1-2.
                const visualPrefix = w.substring(0, Math.max(1, Math.floor(w.length / 2)));
                
                return {
                    fullWord: w,
                    prefix: visualPrefix,
                    isBlank: true,
                    userAnswer: ""
                };
            } else {
                return { fullWord: w, prefix: "", isBlank: false, userAnswer: "" };
            }
        });
        setTokens(newTokens);
        setLoading(false);
    };

    const handleInput = (index: number, value: string) => {
        const newTokens = [...tokens];
        newTokens[index].userAnswer = value;
        setTokens(newTokens);
    };

    const checkAnswers = () => {
        const checkedTokens = tokens.map(t => {
            if (!t.isBlank) return t;
            const fullGuess = t.prefix + t.userAnswer;
            // Loose check (case insensitive)
            const isCorrect = fullGuess.toLowerCase() === t.fullWord.toLowerCase();
            return { ...t, isCorrect };
        });
        setTokens(checkedTokens);
        setGameState('review');
    };

    if (loading) return <div className="text-center mt-20">Generating paragraph task...</div>;

    return (
        <div className="max-w-4xl mx-auto mt-6 p-8 bg-white rounded-2xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-det-dark">Complete the text</h2>
                    <p className="text-sm text-gray-500">Topic: {topic}</p>
                </div>
                {gameState === 'playing' && <Timer duration={180} onFinish={checkAnswers} label="Time Left" />}
            </div>

            <div className="leading-loose text-lg text-justify mb-8">
                {tokens.map((token, idx) => {
                    if (!token.isBlank) {
                        return <span key={idx}>{token.fullWord}</span>;
                    }
                    
                    const statusClass = gameState === 'playing' 
                        ? 'border-gray-300 bg-gray-50' 
                        : token.isCorrect 
                            ? 'border-det-green bg-green-50 text-det-green' 
                            : 'border-det-red bg-red-50 text-det-red';

                    return (
                        <div key={idx} className={`inline-flex items-center mx-1 border rounded px-1 py-0.5 ${statusClass}`}>
                            <span className="font-bold text-gray-600 select-none mr-0.5">{token.prefix}</span>
                            <input 
                                type="text"
                                value={token.userAnswer}
                                onChange={(e) => handleInput(idx, e.target.value)}
                                disabled={gameState === 'review'}
                                className={`bg-transparent outline-none min-w-[30px] w-auto max-w-[100px] ${gameState === 'review' ? 'font-bold' : ''}`}
                                style={{ width: `${Math.max(2, (token.fullWord.length - token.prefix.length) * 0.8)}em`}}
                            />
                        </div>
                    );
                })}
            </div>

            {gameState === 'review' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <h3 className="font-bold mb-2">Corrections:</h3>
                    <div className="flex flex-wrap gap-2">
                        {tokens.filter(t => t.isBlank && !t.isCorrect).map((t, i) => (
                            <span key={i} className="text-sm bg-white border border-red-200 px-2 py-1 rounded">
                                <span className="text-red-500 line-through mr-2">{t.prefix + t.userAnswer}</span>
                                <span className="text-det-green font-bold">{t.fullWord}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-4">
                 {gameState === 'playing' ? (
                     <button onClick={checkAnswers} className="bg-det-blue text-white py-3 px-8 rounded-xl font-bold shadow-md">Submit</button>
                 ) : (
                     <>
                        <button onClick={onBack} className="text-gray-500 font-bold px-4">Exit</button>
                        <button onClick={loadLevel} className="bg-det-green text-white py-3 px-8 rounded-xl font-bold shadow-md">Next Paragraph</button>
                     </>
                 )}
            </div>
        </div>
    );
};