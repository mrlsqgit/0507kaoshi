// app/components/DataTable.tsx
// Data table component with inline editing

'use client';

import { useState, useMemo } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { ParsedRow, ValidationError } from '@/lib/db';
import { FIELD_DISPLAY_NAMES } from '@/utils/excelParser';

interface DataTableProps {
  rows: ParsedRow[];
  errors: ValidationError[];
  duplicates: { rowIndex: number; duplicateOf: number }[];
  onRowUpdate: (index: number, field: string, value: string) => void;
  onRowDelete: (index: number) => void;
  onRowAdd: () => void;
}

export default function DataTable({ 
  rows, 
  errors, 
  duplicates, 
  onRowUpdate, 
  onRowDelete,
  onRowAdd 
}: DataTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const errorMap = useMemo(() => {
    const map = new Map<string, string>();
    errors.forEach(err => {
      map.set(`${err.rowIndex}-${err.field}`, err.message);
    });
    return map;
  }, [errors]);

  const duplicateMap = useMemo(() => {
    const map = new Map<number, number>();
    duplicates.forEach(d => {
      map.set(d.rowIndex, d.duplicateOf);
    });
    return map;
  }, [duplicates]);

  const isDuplicateRow = (index: number) => duplicateMap.has(index);

  const handleCellClick = (rowIndex: number, field: string, currentValue: string) => {
    setEditingCell({ row: rowIndex, field });
    setEditValue(currentValue);
  };

  const handleEditBlur = () => {
    if (editingCell) {
      onRowUpdate(editingCell.row, editingCell.field, editValue);
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const columns = [
    { key: 'sender_name', label: '发件人姓名' },
    { key: 'sender_phone', label: '发件人电话' },
    { key: 'sender_address', label: '发件人地址' },
    { key: 'receiver_name', label: '收件人姓名' },
    { key: 'receiver_phone', label: '收件人电话' },
    { key: 'receiver_address', label: '收件人地址' },
    { key: 'weight', label: '重量 (kg)' },
    { key: 'quantity', label: '件数' },
    { key: 'temperature', label: '温层' },
    { key: 'remark', label: '备注' },
    { key: 'actions', label: '操作' },
  ];

  const getCellError = (rowIndex: number, field: string) => {
    return errorMap.get(`${rowIndex}-${field}`);
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
              序号
            </th>
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr 
              key={index} 
              className={`border-b transition-colors ${
                isDuplicateRow(index) 
                  ? 'bg-yellow-50' 
                  : errors.some(e => e.rowIndex === index) 
                    ? 'bg-red-50' 
                    : 'hover:bg-gray-50'
              }`}
            >
              <td className="px-4 py-2 text-sm text-gray-500">
                {index + 1}
                {isDuplicateRow(index) && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded">
                    重复({duplicateMap.get(index)! + 1})
                  </span>
                )}
              </td>
              {columns.map(col => {
                if (col.key === 'actions') {
                  return (
                    <td key={col.key} className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onRowAdd()}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                          title="新增行"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRowDelete(index)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="删除行"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  );
                }

                const value = (row as any)[col.key] || '';
                const hasError = getCellError(index, col.key);
                const isEditing = editingCell?.row === index && editingCell?.field === col.key;

                return (
                  <td 
                    key={col.key} 
                    className="px-4 py-2 relative"
                    onClick={() => !isEditing && handleCellClick(index, col.key, value)}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleEditBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full px-2 py-1 border border-primary-500 rounded focus:outline-none focus:ring-2 focus:ring-primary-200"
                        autoFocus
                      />
                    ) : (
                      <span className={`text-sm ${hasError ? 'text-red-600' : 'text-gray-800'}`}>
                        {value || '-'}
                      </span>
                    )}
                    {hasError && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 group">
                        <div className="relative">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <div className="absolute right-4 top-0 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-pre-wrap">
                            {hasError}
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}