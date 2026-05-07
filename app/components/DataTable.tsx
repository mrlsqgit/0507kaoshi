// app/components/DataTable.tsx
// Data table component with inline editing, Tab/Enter navigation, and real-time validation

'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Pencil, Trash2, Plus, AlertCircle } from 'lucide-react';
import { ParsedRow, ValidationError } from '@/lib/db';
import { FIELD_DISPLAY_NAMES, validateRow } from '@/utils/excelParser';

interface DataTableProps {
  rows: ParsedRow[];
  errors: ValidationError[];
  duplicates: { rowIndex: number; duplicateOf: number }[];
  onRowUpdate: (index: number, field: string, value: string) => void;
  onRowDelete: (index: number) => void;
  onRowAdd: () => void;
  onErrorsChange: (errors: ValidationError[]) => void;
}

export default function DataTable({ 
  rows, 
  errors, 
  duplicates, 
  onRowUpdate, 
  onRowDelete,
  onRowAdd,
  onErrorsChange
}: DataTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const errorMap = useMemo(() => {
    const map = new Map<string, ValidationError>();
    errors.forEach(err => {
      map.set(`${err.rowIndex}-${err.field}`, err);
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

  const columns = [
    { key: 'sender_name', label: '发件人姓名', width: 'w-32' },
    { key: 'sender_phone', label: '发件人电话', width: 'w-36' },
    { key: 'sender_address', label: '发件人地址', width: 'w-48' },
    { key: 'receiver_name', label: '收件人姓名', width: 'w-32' },
    { key: 'receiver_phone', label: '收件人电话', width: 'w-36' },
    { key: 'receiver_address', label: '收件人地址', width: 'w-48' },
    { key: 'weight', label: '重量 (kg)', width: 'w-24' },
    { key: 'quantity', label: '件数', width: 'w-20' },
    { key: 'temperature', label: '温层', width: 'w-24' },
    { key: 'remark', label: '备注', width: 'w-40' },
    { key: 'actions', label: '操作', width: 'w-28' },
  ];

  const getCellError = (rowIndex: number, field: string): ValidationError | undefined => {
    return errorMap.get(`${rowIndex}-${field}`);
  };

  const handleCellClick = useCallback((rowIndex: number, field: string, currentValue: string) => {
    if (field === 'actions') return;
    setEditingCell({ row: rowIndex, field });
    setEditValue(currentValue);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, []);

  const handleEditBlur = useCallback(() => {
    if (editingCell) {
      onRowUpdate(editingCell.row, editingCell.field, editValue);
      
      // Real-time validation
      const updatedRows = [...rows];
      updatedRows[editingCell.row] = { ...updatedRows[editingCell.row], [editingCell.field]: editValue };
      const rowErrors = validateRow(updatedRows[editingCell.row], editingCell.row);
      
      // Update errors - remove old errors for this cell, add new ones
      const newErrors = errors.filter(e => !(e.rowIndex === editingCell.row && e.field === editingCell.field));
      onErrorsChange([...newErrors, ...rowErrors]);
    }
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, onRowUpdate, rows, errors, onErrorsChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!editingCell) return;

    const currentColIndex = columns.findIndex(col => col.key === editingCell.field);
    const currentRowIndex = editingCell.row;

    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next row same column
      if (currentRowIndex < rows.length - 1) {
        const nextValue = (rows[currentRowIndex + 1] as any)[editingCell.field] || '';
        onRowUpdate(currentRowIndex, editingCell.field, editValue);
        
        // Real-time validation
        const updatedRows = [...rows];
        updatedRows[currentRowIndex] = { ...updatedRows[currentRowIndex], [editingCell.field]: editValue };
        const rowErrors = validateRow(updatedRows[currentRowIndex], currentRowIndex);
        const newErrors = errors.filter(e => !(e.rowIndex === currentRowIndex && e.field === editingCell.field));
        onErrorsChange([...newErrors, ...rowErrors]);
        
        setEditingCell({ row: currentRowIndex + 1, field: editingCell.field });
        setEditValue(nextValue);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        handleEditBlur();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: Move to previous column
        if (currentColIndex > 0) {
          const prevCol = columns[currentColIndex - 1];
          const prevValue = (rows[currentRowIndex] as any)[prevCol.key] || '';
          onRowUpdate(currentRowIndex, editingCell.field, editValue);
          
          // Real-time validation
          const updatedRows = [...rows];
          updatedRows[currentRowIndex] = { ...updatedRows[currentRowIndex], [editingCell.field]: editValue };
          const rowErrors = validateRow(updatedRows[currentRowIndex], currentRowIndex);
          const newErrors = errors.filter(e => !(e.rowIndex === currentRowIndex && e.field === editingCell.field));
          onErrorsChange([...newErrors, ...rowErrors]);
          
          setEditingCell({ row: currentRowIndex, field: prevCol.key });
          setEditValue(prevValue);
          setTimeout(() => inputRef.current?.focus(), 0);
        } else {
          handleEditBlur();
        }
      } else {
        // Tab: Move to next column
        if (currentColIndex < columns.length - 2) { // Skip actions column
          const nextCol = columns[currentColIndex + 1];
          const nextValue = (rows[currentRowIndex] as any)[nextCol.key] || '';
          onRowUpdate(currentRowIndex, editingCell.field, editValue);
          
          // Real-time validation
          const updatedRows = [...rows];
          updatedRows[currentRowIndex] = { ...updatedRows[currentRowIndex], [editingCell.field]: editValue };
          const rowErrors = validateRow(updatedRows[currentRowIndex], currentRowIndex);
          const newErrors = errors.filter(e => !(e.rowIndex === currentRowIndex && e.field === editingCell.field));
          onErrorsChange([...newErrors, ...rowErrors]);
          
          setEditingCell({ row: currentRowIndex, field: nextCol.key });
          setEditValue(nextValue);
          setTimeout(() => inputRef.current?.focus(), 0);
        } else if (currentRowIndex < rows.length - 1) {
          // Move to first column of next row
          const firstCol = columns[0];
          const nextValue = (rows[currentRowIndex + 1] as any)[firstCol.key] || '';
          onRowUpdate(currentRowIndex, editingCell.field, editValue);
          
          // Real-time validation
          const updatedRows = [...rows];
          updatedRows[currentRowIndex] = { ...updatedRows[currentRowIndex], [editingCell.field]: editValue };
          const rowErrors = validateRow(updatedRows[currentRowIndex], currentRowIndex);
          const newErrors = errors.filter(e => !(e.rowIndex === currentRowIndex && e.field === editingCell.field));
          onErrorsChange([...newErrors, ...rowErrors]);
          
          setEditingCell({ row: currentRowIndex + 1, field: firstCol.key });
          setEditValue(nextValue);
          setTimeout(() => inputRef.current?.focus(), 0);
        } else {
          handleEditBlur();
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, rows, errors, onRowUpdate, onErrorsChange, handleEditBlur]);

  const getColumnWidths = () => {
    return columns.map(col => col.width).join(' ');
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
      <div className="min-w-[1400px]">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 bg-gray-50 sticky left-0 z-20 min-w-[80px]">
                序号
              </th>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr 
                key={index} 
                className={`border-b border-gray-100 transition-colors duration-200 ${
                  isDuplicateRow(index) 
                    ? 'bg-yellow-50 hover:bg-yellow-100' 
                    : errors.some(e => e.rowIndex === index) 
                      ? 'bg-red-50 hover:bg-red-100' 
                      : 'hover:bg-gray-50'
                }`}
              >
                <td className={`px-4 py-3 text-sm text-gray-500 border-b border-gray-100 bg-inherit sticky left-0 z-10 ${
                  isDuplicateRow(index) ? 'bg-yellow-50' : errors.some(e => e.rowIndex === index) ? 'bg-red-50' : ''
                }`}>
                  <div className="flex items-center gap-2">
                    <span>{index + 1}</span>
                    {isDuplicateRow(index) && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        重复({duplicateMap.get(index)! + 1})
                      </span>
                    )}
                  </div>
                </td>
                {columns.map(col => {
                  if (col.key === 'actions') {
                    return (
                      <td key={col.key} className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onRowAdd()}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all hover:shadow-md"
                            title="新增行"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onRowDelete(index)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all hover:shadow-md"
                            title="删除行"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    );
                  }

                  const value = (row as any)[col.key] || '';
                  const cellError = getCellError(index, col.key);
                  const isEditing = editingCell?.row === index && editingCell?.field === col.key;

                  return (
                    <td 
                      key={col.key} 
                      className={`px-4 py-2.5 relative ${
                        cellError ? 'bg-red-50' : ''
                      }`}
                      onClick={() => !isEditing && handleCellClick(index, col.key, value)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleEditBlur}
                          onKeyDown={handleKeyDown}
                          className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none transition-all ${
                            cellError 
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
                              : 'border-primary-400 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                          }`}
                          autoFocus
                        />
                      ) : (
                        <div className="relative">
                          <span className={`text-sm ${
                            cellError ? 'text-red-700 font-medium' : 'text-gray-800'
                          }`}>
                            {value || '-'}
                          </span>
                          {cellError && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                              <span className="text-xs text-red-600">{cellError.message}</span>
                            </div>
                          )}
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
      
      {/* Keyboard shortcuts hint */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          💡 双击单元格开始编辑 | Tab/Shift+Tab 切换列 | Enter 切换行 | Esc 取消编辑
        </span>
        <span className="text-xs text-gray-500">
          共 {rows.length} 条记录
        </span>
      </div>
    </div>
  );
}