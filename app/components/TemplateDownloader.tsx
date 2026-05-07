// app/components/TemplateDownloader.tsx
// Template download component with multiple templates

import { Download, FileSpreadsheet, Grid3X3, Globe, Layers, Database } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  columns: string[];
}

const templates: Template[] = [
  {
    id: 'standard',
    name: '标准模板',
    description: '最常用的模板格式，包含所有必填字段',
    icon: <FileSpreadsheet className="w-6 h-6" />,
    columns: ['发件人姓名', '发件人电话', '发件人地址', '收件人姓名', '收件人电话', '收件人地址', '重量', '件数', '温层', '备注'],
  },
  {
    id: 'ecommerce',
    name: '电商平台模板',
    description: '适用于电商订单批量导入，包含订单号字段',
    icon: <Grid3X3 className="w-6 h-6" />,
    columns: ['订单号', '买家姓名', '买家电话', '买家地址', '卖家姓名', '卖家电话', '卖家地址', '商品重量', '商品数量', '温度要求'],
  },
  {
    id: 'english',
    name: '英文模板',
    description: '英文列名格式，适用于国际物流',
    icon: <Globe className="w-6 h-6" />,
    columns: ['Order No', 'Sender Name', 'Sender Phone', 'Sender Address', 'Receiver Name', 'Receiver Phone', 'Receiver Address', 'Weight', 'Quantity', 'Temperature'],
  },
  {
    id: 'grouped',
    name: '分组模板',
    description: '按发件人和收件人分组显示',
    icon: <Layers className="w-6 h-6" />,
    columns: ['发件人姓名', '发件人电话', '发件人地址', '---', '收件人姓名', '收件人电话', '收件人地址', '重量', '件数', '温层'],
  },
  {
    id: 'multisheet',
    name: '多工作表模板',
    description: '包含多个工作表，支持复杂订单结构',
    icon: <Database className="w-6 h-6" />,
    columns: ['外部编码', '发件人信息', '收件人信息', '货物信息', '重量', '件数', '温层', '备注', '创建时间', '状态'],
  },
];

export default function TemplateDownloader() {
  const handleDownload = (template: Template) => {
    const csvContent = [
      template.columns.join(','),
      ['示例数据1', '示例数据2', '示例数据3', '示例数据4', '示例数据5', '示例数据6', '10.5', '5', '常温', '测试备注'].join(','),
      ['示例数据A', '示例数据B', '示例数据C', '示例数据D', '示例数据E', '示例数据F', '20.0', '10', '冷藏', ''].join(','),
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.id}-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">下载导入模板</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template, index) => (
          <div
            key={template.id}
            className="group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-primary-300 transition-all duration-300 cursor-pointer"
            onClick={() => handleDownload(template)}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center text-primary-600 group-hover:from-primary-500 group-hover:to-primary-600 group-hover:text-white transition-all duration-300">
                {template.icon}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="w-5 h-5 text-primary-500" />
              </div>
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
              {template.name}
            </h4>
            
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {template.description}
            </p>
            
            <div className="flex flex-wrap gap-1">
              {template.columns.slice(0, 5).map((col, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                >
                  {col}
                </span>
              ))}
              {template.columns.length > 5 && (
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">
                  +{template.columns.length - 5}
                </span>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-primary-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                点击下载 <Download className="w-4 h-4" />
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
        <p className="text-sm text-gray-600 text-center">
          <span className="font-medium text-blue-700">💡 提示：</span>
          系统支持自动识别多种列名格式，您也可以根据实际需求自定义列名，系统会智能匹配字段
        </p>
      </div>
    </div>
  );
}