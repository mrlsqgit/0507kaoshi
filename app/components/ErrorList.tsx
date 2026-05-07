// app/components/ErrorList.tsx
// Error list component to display all validation errors with detailed information

import { AlertCircle, AlertTriangle } from 'lucide-react';
import { ValidationError } from '@/lib/db';
import { FIELD_DISPLAY_NAMES } from '@/utils/excelParser';

interface ErrorListProps {
  errors: ValidationError[];
}

export default function ErrorList({ errors }: ErrorListProps) {
  if (errors.length === 0) return null;

  // Group errors by row
  const errorsByRow = errors.reduce((acc, err) => {
    if (!acc[err.rowIndex]) {
      acc[err.rowIndex] = [];
    }
    acc[err.rowIndex].push(err);
    return acc;
  }, {} as Record<number, ValidationError[]>);

  // Sort rows
  const sortedRows = Object.keys(errorsByRow)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-red-800 text-lg">
            发现 {errors.length} 个验证错误
          </h3>
          <p className="text-sm text-red-600">
            请修正以下错误后再提交
          </p>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
        {sortedRows.map(rowIndex => {
          const rowErrors = errorsByRow[rowIndex];
          return (
            <div
              key={rowIndex}
              className="bg-white border border-red-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-100">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-red-800">
                  第 {rowIndex + 1} 行
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {rowErrors.length} 个错误
                </span>
              </div>
              
              <ul className="space-y-2">
                {rowErrors.map((err, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                    <div>
                      <span className="font-medium text-red-700">
                        {FIELD_DISPLAY_NAMES[err.field] || err.field}
                      </span>
                      <span className="text-gray-500 mx-1">|</span>
                      <span className="text-red-600">{err.message}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-red-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          <span>提示：点击表格中的单元格可以直接编辑修改</span>
        </div>
      </div>
    </div>
  );
}