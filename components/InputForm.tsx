import React, { useState, useCallback } from 'react';
import { DecisionInput, DecisionFramework } from '../types';
import { Loader2, Sparkles, Wand2, Settings2, ChevronDown, ChevronUp, Info, Scale, Plus, Trash2, ArrowRight, Brain, X } from 'lucide-react';
import { generateAlternatives } from '../services/geminiService';
import { TimbanginIcon } from './TimbanginIcon';

interface InputFormProps {
  onSubmit: (data: DecisionInput) => void;
  isLoading: boolean;
  initialData?: DecisionInput | null;
}

const AVAILABLE_VALUES = [
  { id: 'personal_growth', label: 'Personal Growth', icon: '🌱' },
  { id: 'stimulation', label: 'Stimulation (Adventure)', icon: '⚡' },
  { id: 'pleasure', label: 'Pleasure', icon: '😊' },
  { id: 'achievement', label: 'Achievement', icon: '🏆' },
  { id: 'power', label: 'Power (Social Status)', icon: '👑' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'helping_others', label: 'Helping Others', icon: '🤝' },
  { id: 'conformity', label: 'Conformity (Mengikuti kelompok)', icon: '👥' },
  { id: 'tradition', label: 'Tradition (Mengikuti norma sosial)', icon: '🏛️' },
];

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading, initialData }) => {
  const [situation, setSituation] = useState(initialData?.situation || '');
  const [problem, setProblem] = useState(initialData?.problem || '');
  const [selectedValues, setSelectedValues] = useState<string[]>(initialData?.values || []);
  
  const [alt1, setAlt1] = useState(initialData?.alternatives?.[0]?.text || '');
  const [alt1Pros, setAlt1Pros] = useState<string[]>(initialData?.alternatives?.[0]?.userPros || []);
  const [alt1Cons, setAlt1Cons] = useState<string[]>(initialData?.alternatives?.[0]?.userCons || []);

  const [alt2, setAlt2] = useState(initialData?.alternatives?.[1]?.text || '');
  const [alt2Pros, setAlt2Pros] = useState<string[]>(initialData?.alternatives?.[1]?.userPros || []);
  const [alt2Cons, setAlt2Cons] = useState<string[]>(initialData?.alternatives?.[1]?.userCons || []);

  const [alt3, setAlt3] = useState(initialData?.alternatives?.[2]?.text || '');
  const [alt3Pros, setAlt3Pros] = useState<string[]>(initialData?.alternatives?.[2]?.userPros || []);
  const [alt3Cons, setAlt3Cons] = useState<string[]>(initialData?.alternatives?.[2]?.userCons || []);

  const [framework, setFramework] = useState<DecisionFramework>(initialData?.framework || 'General');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(!!(initialData?.situation || (initialData?.values && initialData.values.length > 0)));
  const [expandedAlt, setExpandedAlt] = useState<number | null>(null);

  const toggleValue = (label: string) => {
    setSelectedValues(prev => {
      if (prev.includes(label)) {
        return prev.filter(v => v !== label);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, label];
    });
  };

  const handleGenerateAlternatives = async () => {
    if (!problem) return;
    setIsGenerating(true);
    // Include situation only if provided
    const fullContext = `Problem: ${problem}${situation ? `\nContext/Situation: ${situation}` : ''}`;
    try {
      const suggestions = await generateAlternatives(fullContext);
      if (suggestions.length >= 3) {
        setAlt1(suggestions[0]);
        setAlt2(suggestions[1]);
        setAlt3(suggestions[2]);
      } else if (suggestions.length > 0) {
         // Handle partial results if API returns fewer than 3
         setAlt1(suggestions[0] || '');
         setAlt2(suggestions[1] || '');
         setAlt3(suggestions[2] || '');
      }
    } catch (error) {
      console.error("Failed to generate alternatives", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Require problem and at least one alternative (Alt 1)
    if (!problem || !alt1.trim()) return;

    const rawAlternatives = [
      { id: 1, text: alt1, userPros: alt1Pros, userCons: alt1Cons },
      { id: 2, text: alt2, userPros: alt2Pros, userCons: alt2Cons },
      { id: 3, text: alt3, userPros: alt3Pros, userCons: alt3Cons },
    ];

    // Filter out empty alternatives
    const validAlternatives = rawAlternatives.filter(alt => alt.text.trim() !== "");

    if (validAlternatives.length === 0) return;

    const input: DecisionInput = {
      situation,
      problem,
      values: selectedValues,
      alternatives: validAlternatives,
      framework
    };
    onSubmit(input);
  }, [situation, problem, selectedValues, alt1, alt2, alt3, framework, onSubmit]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
      <div className="bg-orange-500 p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400-20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
        
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-3 flex items-center gap-4 tracking-tighter">
            <TimbanginIcon size={40} />
            Timbangin
          </h2>
          <p className="text-orange-50 text-lg font-medium opacity-90 max-w-xl leading-relaxed">
            Analisis keputusan berbasis AI yang membantu Anda melihat melampaui emosi sesaat untuk hasil yang lebih strategis.
          </p>
          <div className="mt-4 flex items-center gap-2 text-orange-100/80 text-xs font-bold uppercase tracking-widest">
            <span className="px-2 py-0.5 bg-white/20 rounded-md border border-white/10">Beta</span>
            <span>AI can make mistakes, own your decision wisely.</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-10">
        
        {/* Main Input: Problem */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-orange-500">
            <Scale className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Langkah 1</span>
          </div>
          <label htmlFor="problem" className="block text-2xl font-black text-slate-900 tracking-tight">
            Apa dilema yang sedang Anda hadapi?
          </label>
          <textarea
            id="problem"
            className="w-full p-6 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none transition-all bg-slate-50 text-slate-800 text-lg shadow-inner placeholder:text-slate-300"
            rows={3}
            placeholder="Contoh: Apakah saya harus mengambil S2 sekarang atau lanjut bekerja?"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            required
          />
        </div>

        {/* Alternatives Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-orange-500">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">Langkah 2</span>
              </div>
              <label className="block text-2xl font-black text-slate-900 tracking-tight">
                Apa saja pilihan Anda?
              </label>
            </div>
            <button
              type="button"
              onClick={handleGenerateAlternatives}
              disabled={!problem || isGenerating || isLoading}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200 active:scale-95"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              <span className="text-sm">Bantu Cari Ide</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {[
              { val: alt1, set: setAlt1, pros: alt1Pros, setPros: setAlt1Pros, cons: alt1Cons, setCons: setAlt1Cons, id: 1, placeholder: "Opsi Utama (Wajib)", required: true },
              { val: alt2, set: setAlt2, pros: alt2Pros, setPros: setAlt2Pros, cons: alt2Cons, setCons: setAlt2Cons, id: 2, placeholder: "Opsi Kedua (Opsional)", required: false },
              { val: alt3, set: setAlt3, pros: alt3Pros, setPros: setAlt3Pros, cons: alt3Cons, setCons: setAlt3Cons, id: 3, placeholder: "Opsi Ketiga (Opsional)", required: false }
            ].map((field) => (
              <div key={field.id} className="space-y-3">
                <div className="group border-2 border-slate-50 rounded-2xl focus-within:border-orange-500 transition-all bg-white hover:bg-slate-50">
                  <div className="flex items-start gap-3 p-4">
                    <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${field.required ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-slate-100 text-slate-400'}`}>
                      {field.id}
                    </div>
                    <textarea
                      rows={2}
                      className="flex-1 resize-none bg-transparent outline-none text-slate-800 font-medium placeholder:text-slate-300 leading-relaxed"
                      placeholder={field.placeholder}
                      value={field.val}
                      onChange={(e) => field.set(e.target.value)}
                      required={field.required}
                    />
                  </div>
                  <div className="px-4 pb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setExpandedAlt(expandedAlt === field.id ? null : field.id)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        expandedAlt === field.id 
                          ? 'bg-orange-100 text-orange-600' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-100'
                      }`}
                    >
                      <Settings2 className="w-4 h-4" />
                      Detail
                    </button>
                  </div>
                </div>

                {expandedAlt === field.id && (
                  <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 animate-in slide-in-from-top-2 fade-in duration-300 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Pros Section */}
                      <div className="space-y-3">
                        <label className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                          <ChevronUp className="w-4 h-4" /> Kelebihan
                        </label>
                        <div className="space-y-3">
                          {field.pros.map((pro, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={pro}
                                onChange={(e) => {
                                  const newPros = [...field.pros];
                                  newPros[idx] = e.target.value;
                                  field.setPros(newPros);
                                }}
                                className="flex-grow p-3 text-sm border-2 border-white rounded-xl focus:border-emerald-500 outline-none bg-white shadow-sm"
                                placeholder="Alasan positif..."
                              />
                              <button
                                type="button"
                                onClick={() => field.setPros(field.pros.filter((_, i) => i !== idx))}
                                className="text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => field.setPros([...field.pros, ''])}
                            className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-emerald-200 hover:text-emerald-600 transition-all"
                          >
                            + Tambah Kelebihan
                          </button>
                        </div>
                      </div>

                      {/* Cons Section */}
                      <div className="space-y-3">
                        <label className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                          <ChevronDown className="w-4 h-4" /> Kekurangan
                        </label>
                        <div className="space-y-3">
                          {field.cons.map((con, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={con}
                                onChange={(e) => {
                                  const newCons = [...field.cons];
                                  newCons[idx] = e.target.value;
                                  field.setCons(newCons);
                                }}
                                className="flex-grow p-3 text-sm border-2 border-white rounded-xl focus:border-rose-500 outline-none bg-white shadow-sm"
                                placeholder="Resiko/hambatan..."
                              />
                              <button
                                type="button"
                                onClick={() => field.setCons(field.cons.filter((_, i) => i !== idx))}
                                className="text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => field.setCons([...field.cons, ''])}
                            className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-rose-200 hover:text-rose-600 transition-all"
                          >
                            + Tambah Kekurangan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Input Toggle */}
        <div className="pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${showAdvanced ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-orange-200'}`}
          >
            <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5" />
              <span className="font-black tracking-tight">Konteks & Nilai Tambahan</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-8 animate-in slide-in-from-top-4 fade-in duration-500 bg-slate-50 p-8 rounded-2xl border-2 border-slate-100">
              {/* Advanced: Situation */}
              <div className="space-y-3">
                <label htmlFor="situation" className="block text-sm font-black text-slate-700 uppercase tracking-widest">
                  Konteks Situasi
                </label>
                <textarea
                  id="situation"
                  className="w-full p-5 border-2 border-white rounded-2xl focus:border-orange-500 outline-none transition-all bg-white text-slate-800 text-sm shadow-sm"
                  rows={3}
                  placeholder="Ceritakan latar belakang masalah ini secara lebih detail..."
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                />
              </div>

              {/* Advanced: Values */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    Nilai Prioritas
                    <div className="group relative">
                      <Info className="w-4 h-4 text-slate-300 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-slate-900 text-white text-xs font-medium rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 leading-relaxed scale-95 group-hover:scale-100">
                        Pilih nilai yang paling Anda junjung tinggi agar AI dapat memberikan saran yang selaras dengan prinsip hidup Anda.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                      </div>
                    </div>
                  </label>
                  <span className="text-xs font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                    {selectedValues.length} / 3
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_VALUES.map((val) => {
                    const isSelected = selectedValues.includes(val.label);
                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => toggleValue(val.label)}
                        className={`p-4 rounded-2xl text-xs font-bold text-left transition-all border-2 flex items-center gap-3 ${
                          isSelected
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-100 scale-[1.02]'
                            : 'bg-white text-slate-500 border-slate-50 hover:border-orange-200 hover:bg-orange-50-30'
                        } ${!isSelected && selectedValues.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}`}
                        disabled={!isSelected && selectedValues.length >= 3}
                      >
                        <span className="text-xl">{val.icon}</span>
                        <span className="leading-tight">{val.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Framework Selection - Always Visible */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-orange-500">
            <Settings2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Langkah 3</span>
          </div>
          <label htmlFor="framework" className="block text-2xl font-black text-slate-900 tracking-tight">
            Pilih Sudut Pandang Analisis
          </label>
          <div className="relative">
            <select
              id="framework"
              value={framework}
              onChange={(e) => setFramework(e.target.value as DecisionFramework)}
              className="w-full p-5 pr-12 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none transition-all bg-slate-50 appearance-none cursor-pointer text-slate-800 font-bold shadow-inner"
            >
              <option value="General">Rasional & Logis (Umum)</option>
              <option value="Christianity">Prinsip Kristiani (Alkitabiah)</option>
              <option value="Muslim">Prinsip Islami (Syariah & Akhlak)</option>
              <option value="Hedonistic">Kepuasan & Kesenangan (Hedonistik)</option>
              <option value="Efficient">Efisien & Produktif (Manajemen Waktu)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-5 pointer-events-none text-slate-400">
              <ChevronDown className="w-6 h-6" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !problem || !alt1.trim()}
          className="w-full py-6 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white font-black rounded-2xl shadow-2xl shadow-orange-200 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 text-xl tracking-tight"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin w-7 h-7" />
              Mengkalkulasi...
            </>
          ) : (
            <>
              Mulai Analisis
            </>
          )}
        </button>
      </form>
    </div>
  );
};