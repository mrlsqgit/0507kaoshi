// app/page.tsx
// Main page component with navigation tabs

'use client';

import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, List, FileSpreadsheet, Download, Zap, Shield, TrendingUp, CheckCircle2, X } from 'lucide-react';
import FileUploader from './components/FileUploader';
import ProgressBar from './components/ProgressBar';
import DataTable from './components/DataTable';
import ErrorList from './components/ErrorList';
import TemplateDownloader from './components/TemplateDownloader';
import FieldMapper from './components/FieldMapper';
import { useToast } from './components/Toast';
import { ParsedRow, ValidationError } from '@/lib/db';
import { validateRow, findDuplicates, parseRow } from '@/utils/excelParser';

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
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [originalRows, setOriginalRows] = useState<any[][]>([]);
  
  // Toast notification
  const { showToast, ToastContainer } = useToast();

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
        setMapping(result.data.mapping || {});
        setOriginalRows(result.data.originalRows || []);
        
        showToast('success', `✅ 文件导入成功！共 ${result.data.totalRows} 条记录`);
        
        setTimeout(() => {
          setActiveTab('preview');
          setUploadProgress(0);
        }, 500);
      } else {
        showToast('error', `❌ ${result.error || '上传失败'}`);
        throw new Error(result.error || '上传失败');
      }
    } catch (error) {
      clearInterval(interval);
      console.error('Upload error:', error);
      showToast('error', '❌ 上传失败，请重试');
      throw error;
    } finally {
      setUploading(false);
    }
  }, [showToast]);

  const handleRowUpdate = useCallback((index: number, field: string, value: string) => {
    setParsedRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      return newRows;
    });
    
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

  const handleMappingChange = useCallback((newMapping: Record<string, number>) => {
    setMapping(newMapping);
    // Re-parse rows with new mapping
    const newParsedRows = originalRows.map(row => parseRow(row, newMapping));
    setParsedRows(newParsedRows);
    // Re-validate
    const newErrors = newParsedRows.flatMap((row, index) => validateRow(row, index));
    setErrors(newErrors);
    setDuplicates(findDuplicates(newParsedRows));
  }, [originalRows]);

  const handleSubmit = useCallback(async () => {
    const allErrors = parsedRows.flatMap((row, index) => validateRow(row, index));
    if (allErrors.length > 0) {
      setErrors(allErrors);
      showToast('warning', `⚠️ 存在 ${allErrors.length} 个错误，请先修正`);
      return;
    }
    
    setSubmitProgress(0);
    const totalRows = parsedRows.length;
    let processedRows = 0;
    
    const interval = setInterval(() => {
      processedRows = Math.min(processedRows + Math.floor(Math.random() * 3) + 1, totalRows);
      const progress = Math.min((processedRows / totalRows) * 90, 90);
      setSubmitProgress(progress);
    }, 200);
    
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
      
      if (result.success || result.successCount > 0) {
        setSubmitResult({
          success: result.successCount,
          failed: result.failedCount,
        });
        
        if (result.failedCount === 0) {
          showToast('success', `🎉 提交成功！共 ${result.successCount} 条订单`);
        } else {
          showToast('warning', `⚠️ 部分提交成功！成功 ${result.successCount} 条，失败 ${result.failedCount} 条`);
        }
        
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
        showToast('error', `❌ ${result.message || result.error || '提交失败'}`);
      }
    } catch (error) {
      clearInterval(interval);
      console.error('Submit error:', error);
      showToast('error', '❌ 提交失败，请重试');
    }
  }, [parsedRows, showToast]);

  const handleExport = useCallback(() => {
    const headers = ['发件人姓名', '发件人电话', '发件人地址', '收件人姓名', '收件人电话', '收件人地址', '重量 (kg)', '件数', '温层', '备注'];
    const rows = parsedRows.map(row => ({
      '发件人姓名': row.sender_name,
      '发件人电话': row.sender_phone,
      '发件人地址': row.sender_address,
      '收件人姓名': row.receiver_name,
      '收件人电话': row.receiver_phone,
      '收件人地址': row.receiver_address,
      '重量 (kg)': row.weight,
      '件数': row.quantity,
      '温层': row.temperature,
      '备注': row.remark || '',
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '订单数据');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // 发件人姓名
      { wch: 15 }, // 发件人电话
      { wch: 25 }, // 发件人地址
      { wch: 15 }, // 收件人姓名
      { wch: 15 }, // 收件人电话
      { wch: 25 }, // 收件人地址
      { wch: 12 }, // 重量
      { wch: 8 },  // 件数
      { wch: 10 }, // 温层
      { wch: 20 }, // 备注
    ];
    
    XLSX.writeFile(workbook, `export_${Date.now()}.xlsx`);
  }, [parsedRows]);

  const tabs = [
    { id: 'upload' as TabType, label: '上传文件', icon: Upload },
    { id: 'preview' as TabType, label: '预览编辑', icon: FileSpreadsheet },
    { id: 'history' as TabType, label: '历史记录', icon: List },
  ];

  const features = [
    { icon: <Zap className="w-6 h-6" />, title: '智能识别', desc: '自动识别多种模板格式' },
    { icon: <Shield className="w-6 h-6" />, title: '数据安全', desc: '严格的数据校验机制' },
    { icon: <TrendingUp className="w-6 h-6" />, title: '高效处理', desc: '支持1000+条数据导入' },
    { icon: <CheckCircle2 className="w-6 h-6" />, title: '一键提交', desc: '批量下单快速完成' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <FileSpreadsheet className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  万能导入系统
                </h1>
                <p className="text-sm text-gray-500">多模板自动识别 · 批量下单</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="font-medium">{feature.title}</p>
                    <p className="text-xs text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'upload' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            {/* Hero Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white mb-8 shadow-2xl shadow-indigo-500/30">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-3 tracking-tight">万能导入系统</h2>
                  <p className="text-white/90 mb-6 text-lg">
                    智能识别多种Excel模板，一键批量下单，让物流工作更高效
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">智能模板识别</span>
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">1000+数据支持</span>
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">实时错误校验</span>
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">一键提交</span>
                  </div>
                </div>
                <div className="w-28 h-28 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                  <FileSpreadsheet className="w-14 h-14" />
                </div>
              </div>
            </div>
            
            {/* Upload Card */}
            <div className="gradient-card rounded-3xl shadow-card p-8 mb-8 hover:shadow-card-hover transition-shadow duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">上传 Excel 文件</h3>
                  <p className="text-sm text-gray-500">支持 .xlsx 和 .xls 格式，拖拽或点击上传</p>
                </div>
              </div>
              
              <div className="animate-slide-up">
                <FileUploader onFileUpload={handleFileUpload} disabled={uploading} />
              </div>
              
              {uploading && (
                <div className="mt-6 animate-scale-in">
                  <ProgressBar 
                    progress={uploadProgress} 
                    text="正在解析文件..."
                  />
                </div>
              )}
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-3">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">极速上传</h4>
                <p className="text-sm text-gray-500">支持最大10MB文件，秒级解析</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">智能校验</h4>
                <p className="text-sm text-gray-500">实时数据验证，错误即时提示</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">高效管理</h4>
                <p className="text-sm text-gray-500">历史记录可查，数据永久保存</p>
              </div>
            </div>
            
            {/* Template Downloader */}
            <div className="animate-slide-up">
              <TemplateDownloader />
            </div>
          </div>
        )}

        {activeTab === 'preview' && parsedRows.length > 0 && (
          <div className="gradient-card rounded-3xl shadow-card p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">数据预览</h3>
                  <p className="text-sm text-gray-500">文件: {fileName} | 共 {parsedRows.length} 条记录</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出数据
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={errors.length > 0 || submitProgress > 0}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/25"
                >
                  {submitProgress > 0 ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      提交中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      提交下单
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {submitProgress > 0 && (
              <div className="mb-6">
                <ProgressBar progress={submitProgress} text="正在提交订单..." />
              </div>
            )}
            
            {submitResult && (
              <div className={`mb-6 p-4 rounded-xl ${
                submitResult.failed === 0 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    submitResult.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <CheckCircle2 className={`w-5 h-5 ${
                      submitResult.failed === 0 ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className={`font-semibold ${
                      submitResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {submitResult.failed === 0 
                        ? `🎉 提交成功！` 
                        : `⚠️ 部分提交成功`}
                    </p>
                    <p className={`text-sm ${
                      submitResult.failed === 0 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      成功提交 {submitResult.success} 条，失败 {submitResult.failed} 条
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <FieldMapper
              headers={headers}
              currentMapping={mapping}
              onMappingChange={handleMappingChange}
            />
            
            <ErrorList errors={errors} />
            
            <DataTable
              rows={parsedRows}
              errors={errors}
              duplicates={duplicates}
              onRowUpdate={handleRowUpdate}
              onRowDelete={handleRowDelete}
              onRowAdd={handleRowAdd}
              onErrorsChange={setErrors}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <OrdersHistory />
        )}
      </main>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-sm border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              © 2026 万能导入系统 · 多模板自动识别 · 批量下单
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">支持格式：.xlsx .xls .csv</span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-400">最大支持：1000+ 条数据</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// OrdersHistory Component
function OrdersHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'receiverName' | 'externalCode' | 'date'>('receiverName');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Format datetime with UTC+8 timezone
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    // Convert to UTC+8 timezone
    const offset = 8 * 60; // UTC+8 in minutes
    const utcDate = new Date(date.getTime() + offset * 60 * 1000);
    return utcDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/orders', window.location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(pageSize));
      
      if (searchTerm) {
        if (searchType === 'receiverName') {
          url.searchParams.set('receiverName', searchTerm);
        } else if (searchType === 'externalCode') {
          url.searchParams.set('externalCode', searchTerm);
        }
      }
      
      if (dateRange.start) {
        url.searchParams.set('startDate', dateRange.start);
      }
      if (dateRange.end) {
        url.searchParams.set('endDate', dateRange.end);
      }
      
      const response = await fetch(url.toString());
      const result = await response.json();
      
      if (result.success) {
        setOrders(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.message || '获取订单失败');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      setError('网络连接失败，请检查网络或稍后重试');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, searchType, dateRange, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders(1);
  };

  const handleDateFilter = () => {
    setCurrentPage(1);
    fetchOrders(1);
  };

  // Order Detail Modal
  const OrderDetailModal = () => {
    if (!selectedOrder) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">运单详情</h3>
                <p className="text-sm text-gray-500">订单编号：{selectedOrder.id}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Sender Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                发件人信息
              </h4>
              <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">姓名</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.sender_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">电话</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.sender_phone}</p>
                </div>
                <div className="md:col-span-1">
                  <p className="text-xs text-gray-500 mb-1">地址</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.sender_address}</p>
                </div>
              </div>
            </div>

            {/* Receiver Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                收件人信息
              </h4>
              <div className="bg-emerald-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">姓名</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.receiver_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">电话</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.receiver_phone}</p>
                </div>
                <div className="md:col-span-1">
                  <p className="text-xs text-gray-500 mb-1">地址</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.receiver_address}</p>
                </div>
              </div>
            </div>

            {/* Order Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                订单信息
              </h4>
              <div className="bg-amber-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">外部编码</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.external_code || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">重量</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.weight} kg</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">件数</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">温层</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.temperature}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">备注</p>
                  <p className="text-sm font-medium text-gray-800">{selectedOrder.remark || '-'}</p>
                </div>
              </div>
            </div>

            {/* Meta Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                系统信息
              </h4>
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">状态</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedOrder.status === 'submitted' ? 'bg-green-100 text-green-800' :
                    selectedOrder.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedOrder.status === 'submitted' ? '已提交' :
                     selectedOrder.status === 'failed' ? '失败' : '待处理'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">创建时间</p>
                  <p className="text-sm font-medium text-gray-800">
                    {formatDateTime(selectedOrder.created_at)}
                  </p>
                </div>
                {selectedOrder.error_message && (
                  <div className="md:col-span-1">
                    <p className="text-xs text-gray-500 mb-1">错误信息</p>
                    <p className="text-sm font-medium text-red-600">{selectedOrder.error_message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setSelectedOrder(null)}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-8">
        <div className="flex justify-center items-center py-16">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600 font-medium">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <List className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">历史运单</h3>
              <p className="text-sm text-gray-500">查看已提交的订单记录</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索收件人姓名..."
              className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              搜索
            </button>
          </form>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-red-700 font-medium mb-2">{error}</p>
          <p className="text-sm text-red-600 mb-4">请检查数据库连接配置，确保 DATABASE_URL 环境变量已正确设置</p>
          <button
            onClick={() => fetchOrders()}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <List className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">已导入运单</h3>
                <p className="text-sm text-gray-500">共 {pagination.total} 条记录 · 数据从数据库读取</p>
              </div>
            </div>
          </div>
          
          {/* Search Filters */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Type Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">搜索类型：</span>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'receiverName' | 'externalCode' | 'date')}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-white"
                >
                  <option value="receiverName">收件人姓名</option>
                  <option value="externalCode">外部编码</option>
                </select>
              </div>
              
              {/* Search Input */}
              {(searchType === 'receiverName' || searchType === 'externalCode') && (
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchType === 'receiverName' ? '搜索收件人姓名...' : '搜索外部编码...'}
                    className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
                  >
                    搜索
                  </button>
                </form>
              )}
              
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">提交时间：</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                />
                <span className="text-gray-400">至</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                />
                <button
                  onClick={handleDateFilter}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  筛选
                </button>
              </div>
              
              {/* Reset Button */}
              {(searchTerm || dateRange.start || dateRange.end) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDateRange({ start: '', end: '' });
                    setCurrentPage(1);
                    fetchOrders(1);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  重置筛选
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  订单编号
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  外部编码
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  发件人姓名
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  发件人电话
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  收件人姓名
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  收件人电话
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  重量/件数
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  温层
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  创建时间
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8">
                      <div className="text-5xl mb-4">📦</div>
                      <p className="text-gray-600 font-medium mb-2">暂无历史运单</p>
                      <p className="text-sm text-gray-500">
                        {searchTerm 
                          ? '未找到匹配的运单，请尝试其他搜索条件' 
                          : '还没有提交过订单，请先上传Excel文件并提交下单'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-indigo-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium whitespace-nowrap">{order.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{order.external_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{order.sender_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{order.sender_phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{order.receiver_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{order.receiver_phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {order.weight} kg / {order.quantity} 件
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.temperature === '冷藏' ? 'bg-blue-100 text-blue-800' :
                        order.temperature === '冷冻' ? 'bg-cyan-100 text-cyan-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.temperature}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-center items-center gap-3 mt-6">
            {/* Page Size Selector - Always show */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">每页:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                  fetchOrders(1);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
              >
                <option value={10}>10条</option>
                <option value={20}>20条</option>
                <option value={50}>50条</option>
                <option value={100}>100条</option>
              </select>
            </div>
            
            {/* Pagination Controls - Only show when needed */}
            {pagination.pages > 1 && (
              <>
                <div className="h-6 w-px bg-gray-300"></div>
                
                <button
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    fetchOrders(Math.max(1, currentPage - 1));
                  }}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          fetchOrders(pageNum);
                        }}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {pagination.pages > 5 && (
                    <span className="text-gray-400">...</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    const nextPage = Math.min(pagination.pages, currentPage + 1);
                    setCurrentPage(nextPage);
                    fetchOrders(nextPage);
                  }}
                  disabled={currentPage === pagination.pages}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </>
            )}
            
            {/* Total Records - Always show */}
            <div className="h-6 w-px bg-gray-300"></div>
            
            <span className="text-sm text-gray-500">
              共 {pagination.total} 条记录
            </span>
          </div>
      </div>
      
      <OrderDetailModal />
    </>
  );
}