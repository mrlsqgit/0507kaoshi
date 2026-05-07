// app/page.tsx
// Main page component with navigation tabs

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, List, FileSpreadsheet } from 'lucide-react';
import FileUploader from './components/FileUploader';
import ProgressBar from './components/ProgressBar';
import DataTable from './components/DataTable';
import ErrorList from './components/ErrorList';
import { ParsedRow, ValidationError } from '@/lib/db';
import { validateRow, findDuplicates } from '@/utils/excelParser';

type TabType = 'upload' | 'preview' | 'history';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = useState<{ rowIndex: number; duplicateOf: number }[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitResult, setSubmitResult] = useState<{ success: number; failed: number } | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 200);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      
      const result = await response.json();
      
      if (result.success) {
        setParsedRows(result.data.rows);
        setErrors(result.data.errors);
        setDuplicates(result.data.duplicates);
        setHeaders(result.data.headers);
        setFileName(file.name);
        setTimeout(() => {
          setActiveTab('preview');
          setUploadProgress(0);
        }, 500);
      } else {
        alert(result.error || '上传失败');
      }
    } catch (error) {
      clearInterval(interval);
      console.error('Upload error:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleRowUpdate = useCallback((index: number, field: string, value: string) => {
    setParsedRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
    
    // Re-validate after update
    setTimeout(() => {
      const updatedRows = [...parsedRows];
      updatedRows[index] = { ...updatedRows[index], [field]: value };
      const newErrors = updatedRows.flatMap((row, idx) => 
        idx === index ? validateRow(row, idx) : []
      );
      const existingErrors = errors.filter(e => e.rowIndex !== index);
      setErrors([...existingErrors, ...newErrors]);
      setDuplicates(findDuplicates(updatedRows));
    }, 0);
  }, [parsedRows, errors]);

  const handleRowDelete = useCallback((index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => prev.filter(e => e.rowIndex !== index).map(e => ({
      ...e,
      rowIndex: e.rowIndex > index ? e.rowIndex - 1 : e.rowIndex,
    })));
  }, []);

  const handleRowAdd = useCallback(() => {
    const newRow: ParsedRow = {
      sender_name: '',
      sender_phone: '',
      sender_address: '',
      receiver_name: '',
      receiver_phone: '',
      receiver_address: '',
      weight: '',
      quantity: '',
      temperature: '',
    };
    setParsedRows(prev => [...prev, newRow]);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Check for errors
    const allErrors = parsedRows.flatMap((row, index) => validateRow(row, index));
    if (allErrors.length > 0) {
      setErrors(allErrors);
      alert(`存在 ${allErrors.length} 个错误，请先修正`);
      return;
    }
    
    setSubmitProgress(0);
    const interval = setInterval(() => {
      setSubmitProgress(prev => Math.min(prev + Math.random() * 10, 90));
    }, 300);
    
    try {
      const orders = parsedRows.map(row => ({
        ...row,
        weight: parseFloat(row.weight),
        quantity: parseInt(row.quantity),
      }));
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orders }),
      });
      
      clearInterval(interval);
      setSubmitProgress(100);
      
      const result = await response.json();
      
      if (result.success) {
        setSubmitResult({
          success: result.successCount,
          failed: result.failedCount,
        });
        setTimeout(() => {
          setActiveTab('history');
          setSubmitProgress(0);
          setSubmitResult(null);
          setParsedRows([]);
          setErrors([]);
          setDuplicates([]);
          setFileName(null);
        }, 2000);
      } else {
        alert(result.error || '提交失败');
      }
    } catch (error) {
      clearInterval(interval);
      console.error('Submit error:', error);
      alert('提交失败，请重试');
    }
  }, [parsedRows]);

  const handleExport = useCallback(() => {
    const headers = ['发件人姓名', '发件人电话', '发件人地址', '收件人姓名', '收件人电话', '收件人地址', '重量', '件数', '温层', '备注'];
    const rows = parsedRows.map(row => [
      row.sender_name,
      row.sender_phone,
      row.sender_address,
      row.receiver_name,
      row.receiver_phone,
      row.receiver_address,
      row.weight,
      row.quantity,
      row.temperature,
      row.remark || '',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [parsedRows]);

  const tabs = [
    { id: 'upload' as TabType, label: '上传文件', icon: Upload },
    { id: 'preview' as TabType, label: '预览编辑', icon: FileSpreadsheet },
    { id: 'history' as TabType, label: '历史记录', icon: List },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">万能导入系统</h1>
              <p className="text-sm text-gray-500">多模板自动识别 · 批量下单</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">上传 Excel 文件</h2>
              <FileUploader onFileUpload={handleFileUpload} disabled={uploading} />
              
              {uploading && (
                <div className="mt-6">
                  <ProgressBar 
                    progress={uploadProgress} 
                    text="正在解析文件..."
                  />
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">支持的模板格式</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 自动识别列名（支持多种别名）</li>
                  <li>• 支持 .xlsx 和 .xls 格式</li>
                  <li>• 支持 1000+ 条数据导入</li>
                  <li>• 自动记忆模板映射规则</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && parsedRows.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">数据预览</h2>
                <p className="text-sm text-gray-500">文件: {fileName} | 共 {parsedRows.length} 条</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  导出数据
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={errors.length > 0 || submitProgress > 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitProgress > 0 ? '提交中...' : '提交下单'}
                </button>
              </div>
            </div>
            
            {submitProgress > 0 && (
              <div className="mb-4">
                <ProgressBar progress={submitProgress} text="正在提交..." />
              </div>
            )}
            
            {submitResult && (
              <div className={`mb-4 p-4 rounded-lg ${
                submitResult.failed === 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                <p className="font-medium">
                  提交完成！成功 {submitResult.success} 条，失败 {submitResult.failed} 条
                </p>
              </div>
            )}
            
            <ErrorList errors={errors} />
            
            <DataTable
              rows={parsedRows}
              errors={errors}
              duplicates={duplicates}
              onRowUpdate={handleRowUpdate}
              onRowDelete={handleRowDelete}
              onRowAdd={handleRowAdd}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <OrdersHistory />
        )}
      </main>
    </div>
  );
}

// OrdersHistory Component
function OrdersHistory() {
  const [orders, setOrders] = useState<{ id: string; sender_name: string; receiver_name: string; external_code: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const url = new URL('/api/orders', window.location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', '20');
      if (searchTerm) {
        url.searchParams.set('receiverName', searchTerm);
      }
      
      const response = await fetch(url.toString());
      const result = await response.json();
      
      if (result.success) {
        setOrders(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders(1);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">历史运单</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索收件人姓名..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            搜索
          </button>
        </form>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                订单编号
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                外部编码
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                发件人
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                收件人
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                创建时间
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">{order.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{order.external_code || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{order.sender_name}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{order.receiver_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-600">
            第 {currentPage} / {pagination.pages} 页
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
            disabled={currentPage === pagination.pages}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}