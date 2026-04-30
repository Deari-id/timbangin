import React, { useState } from 'react';
import { DecisionAnalysis, EvaluatedAlternative, DecisionFramework, FollowUpAdvice, ChatMessage, DecisionInput } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, AlertTriangle, ThumbsUp, ArrowLeft, Scale, Filter, HelpCircle, Target, Loader2, Footprints, Lightbulb, MessageSquare, Send, X, Share2, Download, ChevronDown } from 'lucide-react';
import { generateFollowUp, chatAboutAlternative } from '../services/geminiService';
import { TimbanginIcon } from './TimbanginIcon';

interface ResultsDashboardProps {
  data: DecisionAnalysis;
  onReset: () => void;
  currentFramework: DecisionFramework;
  onFrameworkChange: (framework: DecisionFramework) => void;
  originalProblem: string;
  currentInput: DecisionInput;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-slate-100 shadow-2xl rounded-2xl">
        <p className="font-black text-slate-900 mb-1">{label}</p>
        <p className="text-orange-600 font-black text-lg">Skor: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

const ScoreLegend = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-[10px] mt-8 pt-8 border-t border-slate-100">
     <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
        <div><span className="font-black block text-slate-900">90-100%</span> <span className="text-slate-400 uppercase tracking-widest font-bold">Sempurna</span></div>
     </div>
     <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 flex-shrink-0"></div>
        <div><span className="font-black block text-slate-900">70-89%</span> <span className="text-slate-400 uppercase tracking-widest font-bold">Tinggi</span></div>
     </div>
     <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0"></div>
        <div><span className="font-black block text-slate-900">50-69%</span> <span className="text-slate-400 uppercase tracking-widest font-bold">Sedang</span></div>
     </div>
     <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-600 flex-shrink-0"></div>
        <div><span className="font-black block text-slate-900">30-49%</span> <span className="text-slate-400 uppercase tracking-widest font-bold">Rendah</span></div>
     </div>
     <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0"></div>
        <div><span className="font-black block text-slate-900">0-29%</span> <span className="text-slate-400 uppercase tracking-widest font-bold">Buruk</span></div>
     </div>
  </div>
);


type ShareCardRenderInput = {
  framework: DecisionFramework;
  storyText: string;
  questionText: string;
  bestOption?: EvaluatedAlternative;
  recommendationSummary: string;
  rankedResults: EvaluatedAlternative[];
};

const SHARE_W = 360;
const SHARE_H = 640;
const SHARE_SCALE = 3;
const SHARE_BG = '#0D0D0D';
const SHARE_ORANGE = '#FF6B35';

const clampText = (text: string, maxLength: number) => {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}…`;
};

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const drawTextBlock = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) => {
  const words = clampText(text, 360).split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    let last = visible[visible.length - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 0) {
      last = last.slice(0, -1).trim();
    }
    visible[visible.length - 1] = `${last}…`;
  }

  visible.forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * lineHeight);
  });
  return y + visible.length * lineHeight;
};

const drawDivider = (ctx: CanvasRenderingContext2D, y: number) => {
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(20, y, 320, 1);
};

const drawProgress = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, score: number) => {
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fill();

  const fillWidth = Math.max(h, Math.min(w, (w * score) / 100));
  roundedRect(ctx, x, y, fillWidth, h, h / 2);
  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, SHARE_ORANGE);
  gradient.addColorStop(1, '#FFB088');
  ctx.fillStyle = gradient;
  ctx.fill();
};

const drawLogo = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  roundedRect(ctx, x, y, 27, 27, 8);
  ctx.fillStyle = SHARE_ORANGE;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 13.5, y + 7);
  ctx.lineTo(x + 13.5, y + 18);
  ctx.moveTo(x + 8, y + 10);
  ctx.lineTo(x + 19, y + 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 9, y + 18, 3, 0, Math.PI * 2);
  ctx.arc(x + 18, y + 18, 3, 0, Math.PI * 2);
  ctx.stroke();
};

const renderShareCardCanvas = async ({
  framework,
  storyText,
  questionText,
  bestOption,
  recommendationSummary,
  rankedResults,
}: ShareCardRenderInput) => {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W * SHARE_SCALE;
  canvas.height = SHARE_H * SHARE_SCALE;
  canvas.style.width = `${SHARE_W}px`;
  canvas.style.height = `${SHARE_H}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.scale(SHARE_SCALE, SHARE_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = SHARE_BG;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  const glowA = ctx.createRadialGradient(300, 38, 8, 300, 38, 130);
  glowA.addColorStop(0, 'rgba(255,107,53,0.18)');
  glowA.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(170, -90, 220, 220);

  const glowB = ctx.createRadialGradient(10, 520, 8, 10, 520, 120);
  glowB.addColorStop(0, 'rgba(255,107,53,0.12)');
  glowB.addColorStop(1, 'rgba(255,107,53,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(-100, 390, 220, 220);

  // Top bar
  drawLogo(ctx, 20, 19);
  ctx.font = '600 15px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillText('Timbangin', 55, 37);

  roundedRect(ctx, 262, 23, 78, 20, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.font = '700 8px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.textAlign = 'center';
  ctx.fillText(String(framework).toUpperCase(), 301, 36);
  ctx.textAlign = 'left';

  drawDivider(ctx, 61);

  // Story section
  ctx.font = '700 8.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = SHARE_ORANGE;
  ctx.fillText('AKU LAGI MENIMBANG', 20, 84);

  ctx.font = 'italic 400 34px "Playfair Display", Georgia, serif';
  ctx.fillStyle = 'rgba(255,107,53,0.58)';
  ctx.fillText('“', 20, 112);

  ctx.font = 'italic 500 17px "Playfair Display", Georgia, serif';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  drawTextBlock(ctx, storyText, 20, 132, 320, 22, questionText ? 5 : 6);

  if (questionText) {
    ctx.font = '600 10px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,190,150,0.86)';
    drawTextBlock(ctx, `Pertanyaan: ${questionText}`, 20, 245, 320, 13, 2);
  }

  drawDivider(ctx, 276);

  // Recommendation
  ctx.font = '700 8.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.fillText('REKOMENDASI TERBAIK', 20, 302);

  roundedRect(ctx, 20, 314, 320, 102, 18);
  ctx.fillStyle = 'rgba(255,107,53,0.08)';
  ctx.fill();

  ctx.font = '700 14px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  drawTextBlock(ctx, bestOption?.title || 'Pilihan terbaik', 34, 339, 292, 16, 1);

  ctx.font = '400 9.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  drawTextBlock(ctx, recommendationSummary, 34, 358, 292, 13, 3);

  const bestScore = bestOption?.score ?? 0;
  drawProgress(ctx, 34, 394, 218, 6, bestScore);
  ctx.font = '800 10px Inter, system-ui, sans-serif';
  ctx.fillStyle = SHARE_ORANGE;
  ctx.textAlign = 'right';
  ctx.fillText(`${bestScore}% match`, 326, 400);
  ctx.textAlign = 'left';

  drawDivider(ctx, 438);

  // Options
  ctx.font = '700 8.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.fillText('SEMUA PILIHAN', 20, 464);

  rankedResults.slice(0, 3).forEach((res, idx) => {
    const y = 476 + idx * 45;
    const active = idx === 0;

    roundedRect(ctx, 20, y, 320, 36, 14);
    ctx.fillStyle = active ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.04)';
    ctx.fill();

    roundedRect(ctx, 32, y + 7, 22, 22, 7);
    ctx.fillStyle = active ? SHARE_ORANGE : 'rgba(255,255,255,0.07)';
    ctx.fill();
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillStyle = active ? '#FFFFFF' : 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.fillText(String(idx + 1), 43, y + 22);
    ctx.textAlign = 'left';

    ctx.font = '700 9.5px Inter, system-ui, sans-serif';
    ctx.fillStyle = active ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.66)';
    drawTextBlock(ctx, res.title, 64, y + 17, 178, 11, 1);

    ctx.font = '400 8.5px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    drawTextBlock(ctx, res.originalText, 64, y + 30, 178, 10, 1);

    drawProgress(ctx, 252, y + 17, 42, 4, res.score);
    ctx.font = '800 9.5px Inter, system-ui, sans-serif';
    ctx.fillStyle = active ? SHARE_ORANGE : 'rgba(255,255,255,0.30)';
    ctx.textAlign = 'right';
    ctx.fillText(`${res.score}%`, 326, y + 22);
    ctx.textAlign = 'left';
  });

  // CTA footer, absolute bottom
  const footerGradient = ctx.createLinearGradient(0, 572, 0, 640);
  footerGradient.addColorStop(0, 'rgba(13,13,13,0)');
  footerGradient.addColorStop(0.30, SHARE_BG);
  footerGradient.addColorStop(1, SHARE_BG);
  ctx.fillStyle = footerGradient;
  ctx.fillRect(0, 572, 360, 68);

  ctx.textAlign = 'center';
  ctx.font = '400 9.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText('Timbangin dulu di', 129, 616);
  ctx.font = '700 9.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = SHARE_ORANGE;
  ctx.fillText('timbangin.id', 190, 616);
  ctx.font = '400 9.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText('baru melangkah', 259, 616);
  ctx.textAlign = 'left';

  return canvas;
};

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ 
  data, 
  onReset, 
  currentFramework, 
  onFrameworkChange,
  originalProblem,
  currentInput
}) => {
  const chartData = data.results.map(r => ({
    name: `Opsi ${r.id}`,
    score: r.score,
    title: r.title,
    isBest: r.id === data.bestChoiceId
  }));

  const bestOption = data.results.find(r => r.id === data.bestChoiceId);
  const rankedResults = [...data.results].sort((a, b) => b.score - a.score);
  const shareStoryText = currentInput.situation?.trim() || originalProblem;
  const shareQuestionText = currentInput.situation?.trim() ? originalProblem : '';
  const recommendationSummary = data.executiveSummary.length > 190
    ? `${data.executiveSummary.slice(0, 190).trim()}...`
    : data.executiveSummary;
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const canvas = await renderShareCardCanvas({
        framework: currentFramework,
        storyText: shareStoryText,
        questionText: shareQuestionText,
        bestOption,
        recommendationSummary,
        rankedResults,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      if (!blob) throw new Error('Failed to create image blob');

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Timbangin-Summary-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error sharing:', err);
      alert("Maaf, terjadi kesalahan saat menyiapkan gambar. Silakan coba lagi.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b-2 border-slate-100 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-black rounded-md border border-orange-200 uppercase tracking-widest">Beta</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI can make mistakes, own your decision wisely.</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Hasil Analisis</h2>
          <p className="text-slate-400 font-medium text-lg">Evaluasi mendalam berdasarkan parameter strategis</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="flex items-center gap-3 px-6 py-3 text-sm font-black text-orange-600 bg-orange-50 border-2 border-orange-100 rounded-2xl hover:bg-orange-100 transition-all active:scale-95 shadow-sm disabled:opacity-50"
          >
            {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
            {isSharing ? 'Menyiapkan...' : 'Bagikan'}
          </button>
          
          <div className="relative flex-grow lg:flex-grow-0">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
               <Filter className="h-5 w-5 text-orange-500" />
             </div>
            <select
              value={currentFramework}
              onChange={(e) => onFrameworkChange(e.target.value as DecisionFramework)}
              className="block w-full pl-12 pr-12 py-3 text-sm font-black text-slate-700 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-orange-200 focus:border-orange-500 outline-none appearance-none cursor-pointer transition-all shadow-sm"
            >
              <option value="General">Perspektif Rasional</option>
              <option value="Christianity">Perspektif Kristiani</option>
              <option value="Muslim">Perspektif Islami</option>
              <option value="Hedonistic">Perspektif Hedonistik</option>
              <option value="Efficient">Perspektif Efisien</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>

          <button 
            onClick={onReset}
            className="flex items-center gap-3 px-6 py-3 text-sm font-black text-slate-500 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Ulangi
          </button>
        </div>
      </div>

      {/* Detailed Breakdown (Moved to Top) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-orange-500">
          <Target className="w-6 h-6" />
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            Perbandingan Opsi
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {data.results.map((item) => (
            <AlternativeCard 
              key={item.id} 
              item={item} 
              isBest={item.id === data.bestChoiceId} 
              problem={originalProblem}
              framework={currentFramework}
            />
          ))}
        </div>
      </div>

      {/* Executive Summary & Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-10 border-t-2 border-slate-100">
        
        {/* Executive Summary Card */}
        <div className="lg:col-span-1 bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white-10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white-10 rounded-xl">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Analisis Mendalam</span>
            </div>
            
            <div className="mb-2 text-[10px] text-orange-400 uppercase tracking-[0.3em] font-black">Rekomendasi Utama</div>
            <h3 className="text-3xl font-black mb-6 leading-tight tracking-tight">
              {bestOption?.title}
            </h3>
            <p className="text-slate-300 font-medium text-sm leading-relaxed">
              {data.executiveSummary}
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-white-10 relative z-10">
            <div className="flex items-end justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest group relative cursor-help">
                Alignment Score
                <HelpCircle className="w-4 h-4 opacity-50" />
                <div className="absolute bottom-full left-0 mb-3 w-64 p-4 bg-white text-slate-900 text-[10px] font-medium rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 leading-relaxed scale-95 group-hover:scale-100">
                  Seberapa kuat opsi ini selaras dengan parameter {currentFramework} yang Anda pilih.
                  <div className="absolute top-full left-4 border-8 border-transparent border-t-white"></div>
                </div>
              </div>
              <span className="text-5xl font-black leading-none">{bestOption?.score}<span className="text-2xl ml-0.5 opacity-50">%</span></span>
            </div>
            <div className="w-full bg-white-10 h-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(249,115,22,0.5)]" 
                style={{ width: `${bestOption?.score}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-8 shadow-2xl shadow-slate-100 border-2 border-slate-50 flex flex-col">
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Visualisasi Skor</h3>
              <div className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {currentFramework}
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#fff7ed', radius: 12}} />
                  <Bar dataKey="score" radius={[0, 12, 12, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isBest ? '#f97316' : '#f1f5f9'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <ScoreLegend />
        </div>
      </div>

    </div>
  );
};

const AlternativeCard: React.FC<{ 
  item: EvaluatedAlternative; 
  isBest: boolean;
  problem: string;
  framework: DecisionFramework;
}> = ({ item, isBest, problem, framework }) => {
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [advice, setAdvice] = useState<FollowUpAdvice | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const result = await generateFollowUp(problem, item.originalText, framework);
      setAdvice(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userMsg: ChatMessage = { role: 'user', text: inputMessage };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await chatAboutAlternative(
        problem,
        item.originalText,
        framework,
        currentInput,
        messages
      );
      const modelMsg: ChatMessage = { role: 'model', text: response };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = { role: 'model', text: "Maaf, terjadi kesalahan saat menghubungi AI." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const openChat = () => {
    if (!showChat && messages.length === 0) {
      // Initialize with a summary and a question
      const initialMessage: ChatMessage = { 
        role: 'model', 
        text: `Halo! Saya telah menganalisis opsi "${item.title}". Berdasarkan perspektif ${framework}, opsi ini memiliki skor ${item.score}%. Ringkasan singkat: ${item.reasoning.substring(0, 150)}... Ada yang mau didiskusikan terkait opsi ini?` 
      };
      setMessages([initialMessage]);
    }
    setShowChat(true);
  };

  return (
    <div className={`rounded-3xl p-8 border-2 transition-all duration-500 hover:shadow-2xl flex flex-col group ${
      isBest 
        ? 'bg-white border-orange-500 shadow-2xl shadow-orange-100 relative overflow-hidden ring-4 ring-orange-50' 
        : 'bg-white border-slate-50 hover:border-slate-200'
    }`}>
      {isBest && (
        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black px-4 py-2 rounded-bl-2xl uppercase tracking-[0.2em] z-20">
          Best Choice
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isBest ? 'text-orange-500' : 'text-slate-300'}`}>
            Opsi {item.id}
          </span>
          <div className="flex items-center gap-3">
            <button 
              onClick={openChat}
              className={`p-2.5 rounded-xl transition-all ${showChat ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              title="Chat dengan AI"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className={`text-2xl font-black ${isBest ? 'text-orange-500' : 'text-slate-400'}`}>
              {item.score}<span className="text-sm ml-0.5 opacity-50">%</span>
            </div>
          </div>
        </div>
        <h4 className="text-xl font-black text-slate-900 leading-tight mb-3 min-h-[3.5rem] tracking-tight">{item.title}</h4>
        <p className="text-xs text-slate-400 font-medium italic mb-6 line-clamp-2 border-l-4 border-slate-100 pl-4 py-1">
          "{item.originalText}"
        </p>
      </div>

      <div className="flex-grow relative min-h-[450px]">
        {showChat && (
          <div className="absolute inset-0 z-30 flex flex-col bg-white rounded-2xl border-2 border-orange-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 border-b-2 border-slate-50 bg-orange-50-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                  <TimbanginIcon size={18} />
                </div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  AI Consultant
                </span>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-white rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-4 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-orange-500 text-white rounded-tr-none' 
                      : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t-2 border-slate-50 flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Tanyakan sesuatu..."
                className="flex-grow text-xs p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-orange-500 outline-none transition-all font-medium placeholder:text-slate-300"
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isSending}
                className="p-4 bg-orange-500 text-white rounded-2xl disabled:opacity-50 hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        <div className="mb-8 space-y-6">
              {item.outcomes && item.outcomes.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Target className="w-4 h-4" /> Prediksi Hasil
                  </h5>
                  <ul className="space-y-2.5">
                    {item.outcomes.map((outcome, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-3 font-medium">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                          <span className="leading-relaxed">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Analisis Strategis
                </h5>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {item.reasoning}
                </p>
              </div>
            </div>

            <div className="space-y-5 pt-6 border-t-2 border-slate-50 mb-8">
              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" /> Keunggulan
                </h5>
                <ul className="space-y-2">
                  {item.pros.slice(0, 2).map((pro, i) => (
                    <li key={i} className="text-xs text-slate-500 flex items-start gap-3 font-medium">
                      <span className="mt-1.5 block w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Resiko
                </h5>
                <ul className="space-y-2">
                  {item.cons.slice(0, 2).map((con, i) => (
                    <li key={i} className="text-xs text-slate-500 flex items-start gap-3 font-medium">
                      <span className="mt-1.5 block w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {!advice ? (
              <button
                onClick={handleGetAdvice}
                disabled={loadingAdvice}
                className="w-full mt-auto py-4 px-6 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 border-slate-100 transition-all flex items-center justify-center gap-3 group/btn"
              >
                {loadingAdvice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Footprints className="w-4 h-4 group-hover/btn:animate-bounce" />}
                Langkah Selanjutnya
              </button>
            ) : (
              <div className="mt-auto bg-slate-900 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-500 text-white shadow-xl">
                <h5 className="text-[10px] font-black text-orange-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Footprints className="w-4 h-4" /> Roadmap Implementasi
                </h5>
                <ol className="space-y-3 mb-6">
                  {advice.steps.map((step, i) => (
                    <li key={i} className="text-xs text-slate-300 flex gap-3 font-medium">
                      <span className="font-black text-orange-500">{i+1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="bg-white-10 rounded-xl p-4 border border-white-10">
                  <div className="flex items-center gap-2 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-2">
                    <Lightbulb className="w-4 h-4" /> Golden Advice
                  </div>
                  <p className="text-xs text-slate-100 italic font-medium leading-relaxed">"{advice.advice}"</p>
                </div>
              </div>
            )}
        </div>
      </div>
  );
};

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 019 15z" clipRule="evenodd" />
  </svg>
);