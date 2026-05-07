// app/components/ProgressBar.tsx
// Progress bar component with enhanced visual effects

interface ProgressBarProps {
  progress: number;
  text?: string;
  current?: number;
  total?: number;
  showAnimation?: boolean;
}

export default function ProgressBar({ 
  progress, 
  text, 
  current, 
  total,
  showAnimation = true 
}: ProgressBarProps) {
  return (
    <div className="w-full">
      {/* Header with text and counter */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-700">
          {text || '处理中'}
        </span>
        <span className="text-sm font-semibold text-indigo-600">
          {current !== undefined && total !== undefined 
            ? `${current} / ${total}`
            : `${Math.round(progress)}%`}
        </span>
      </div>
      
      {/* Progress bar container */}
      <div className="relative w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
        {/* Background shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        
        {/* Progress fill */}
        <div
          className={`
            h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden
            ${showAnimation ? 'animate-pulse-slow' : ''}
          `}
          style={{ width: `${progress}%` }}
        >
          {/* Gradient fill */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          
          {/* Striped pattern */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
            animation: 'move-stripes 1s linear infinite'
          }} />
        </div>
        
        {/* Percentage badge */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-xs font-bold text-indigo-600"
          style={{ left: `calc(${progress}% - 16px)` }}
        >
          {Math.round(progress)}%
        </div>
      </div>
      
      {/* Optional counter display */}
      {current !== undefined && total !== undefined && (
        <div className="mt-2 flex justify-center">
          <span className="text-xs text-gray-500">
            已处理 <span className="font-semibold text-indigo-600">{current}</span> 条，共 <span className="font-semibold text-indigo-600">{total}</span> 条
          </span>
        </div>
      )}
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes move-stripes {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}