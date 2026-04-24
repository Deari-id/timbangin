import React, { useState, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ResultsDashboard } from './components/ResultsDashboard';
import { AppState, DecisionAnalysis, DecisionInput, DecisionFramework } from './types';
import { analyzeDecision } from './services/geminiService';
import { AlertOctagon, LogIn, User } from 'lucide-react';
import { TimbanginIcon } from './components/TimbanginIcon';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT);
  const [results, setResults] = useState<DecisionAnalysis | null>(null);
  const [currentInput, setCurrentInput] = useState<DecisionInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          // Automatically sign in anonymously if not logged in
          await signInAnonymously(auth);
        } catch (err: any) {
          console.error("Anonymous sign-in failed:", err);
          if (err.code === 'auth/admin-restricted-operation') {
            console.warn("Anonymous authentication is not enabled in Firebase Console.");
          }
          setIsAuthLoading(false);
        }
      } else {
        setUser(currentUser);
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
      setError("Gagal masuk dengan Google. Silakan coba lagi.");
    }
  };

  const recordDecision = async (input: DecisionInput, analysis: DecisionAnalysis) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
      await addDoc(collection(db, 'decisions'), {
        userId: currentUser.uid,
        isAnonymous: currentUser.isAnonymous,
        problem: input.problem,
        situation: input.situation,
        values: input.values,
        framework: input.framework,
        inputAlternatives: input.alternatives,
        analysis: analysis,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to record decision:", err);
    }
  };

  const handleDecisionSubmit = async (input: DecisionInput) => {
    setCurrentInput(input);
    setAppState(AppState.LOADING);
    setError(null);

    try {
      const analysis = await analyzeDecision(input);
      setResults(analysis);
      setAppState(AppState.RESULTS);
      // Record to Firebase (works for both logged in and anonymous users)
      await recordDecision(input, analysis);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat menganalisis keputusan Anda. Silakan coba lagi.");
      setAppState(AppState.ERROR);
    }
  };

  const handleFrameworkChange = async (newFramework: DecisionFramework) => {
    if (!currentInput) return;
    
    const updatedInput = { ...currentInput, framework: newFramework };
    handleDecisionSubmit(updatedInput);
  };

  const handleReset = () => {
    setResults(null);
    // Don't clear currentInput to preserve user data
    setError(null);
    setAppState(AppState.INPUT);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-orange-100">
      {/* Global Header */}
      <header className="bg-white-80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <TimbanginIcon size={24} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Timbangin</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
              Decision Intelligence • v2.0
            </div>
            {isAuthLoading ? (
              <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse"></div>
            ) : user && !user.isAnonymous ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <User size={16} className="text-slate-400" />
                )}
                <span className="text-xs font-bold text-slate-600 hidden md:block">{user.displayName}</span>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95"
              >
                <LogIn size={14} />
                Masuk <span className="hidden md:inline">(Opsional)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {appState === AppState.INPUT && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col items-center">
             <div className="text-center mb-12 max-w-3xl">
                <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
                  Timbang Opsi Anda <br/><span className="text-orange-500">Secara Objektif.</span>
                </h2>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Gunakan kecerdasan buatan untuk menganalisis risiko, peluang, dan konsekuensi dari setiap pilihan Anda. Masukkan dilema Anda dan biarkan Timbangin memberikan perspektif yang jernih.
                </p>
             </div>
            <InputForm 
              onSubmit={handleDecisionSubmit} 
              isLoading={false} 
              initialData={currentInput}
            />
          </div>
        )}

        {appState === AppState.LOADING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
             <div className="relative w-32 h-32 mb-10">
                <div className="absolute inset-0 border-[6px] border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-[6px] border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <TimbanginIcon className="text-orange-500 animate-pulse" size={48} />
                </div>
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
               {currentInput ? `Menganalisis via ${currentInput.framework}` : 'Menganalisis Alternatif'}
             </h3>
             <p className="text-slate-400 max-w-sm text-center font-medium">
               Menghitung probabilitas, mengevaluasi trade-off, dan menyusun rekomendasi strategis...
             </p>
          </div>
        )}

        {appState === AppState.RESULTS && results && currentInput && (
          <ResultsDashboard 
            data={results} 
            onReset={handleReset} 
            currentFramework={currentInput.framework}
            onFrameworkChange={handleFrameworkChange}
            originalProblem={currentInput.problem}
            currentInput={currentInput}
          />
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] animate-in fade-in duration-500">
            <div className="bg-red-50 p-4 rounded-full mb-4">
              <AlertOctagon className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Analisis Gagal</h3>
            <p className="text-gray-600 mb-6 text-center max-w-md">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;