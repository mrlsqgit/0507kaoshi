// app/components/ProgressBar.tsx
// Progress bar component with percentage display

interface ProgressBarProps {
  progress: number;
  text?: string;
  current?: number;
  total?: number;
}

export default function ProgressBar({ progress, text, current, total }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">{text || '处理中'}</span>
        <span className="text-sm font-medium text-gray-800">
          {current !== undefined && total !== undefined 
            ? `${current}/${total} (${progress}%)`
            : `${progress}%`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}