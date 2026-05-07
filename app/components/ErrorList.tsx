// app/components/ErrorList.tsx
// Error list component to display all validation errors

import { AlertCircle } from 'lucide-react';
import { ValidationError } from '@/lib/db';
import { FIELD_DISPLAY_NAMES } from '@/utils/excelParser';

interface ErrorListProps {
  errors: ValidationError[];
}

export default function ErrorList({ errors }: ErrorListProps) {
  if (errors.length === 0) return null;

  const errorsByRow = errors.reduce((acc, err) => {
    if (!acc[err.rowIndex]) {
      acc[err.rowIndex] = [];
    }
    acc[err.rowIndex].push(err);
    return acc;
  }, {} as Record<number, ValidationError[]>);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-red-800">
          发现 {errors.length} 个错误
        </h3>
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {Object.entries(errorsByRow).map(([rowIndex, rowErrors]) => (
          <div key={rowIndex} className="bg-white border border-red-200 rounded-lg p-3">
            <div className="font-medium text-red-800 mb-2">
              第 {parseInt(rowIndex) + 1} 行
            </div>
            <ul className="space-y-1">
              {rowErrors.map((err, idx) => (
                <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>
                    <span className="font-medium">{FIELD_DISPLAY_NAMES[err.field] || err.field}</span>: 
                    {err.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}