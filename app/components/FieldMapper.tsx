// app/components/FieldMapper.tsx
// Manual field mapping component

'use client';

import { useState } from 'react';
import { ArrowRight, Save, RotateCcw } from 'lucide-react';
import { STANDARD_FIELDS, FIELD_DISPLAY_NAMES } from '@/utils/excelParser';

interface FieldMapperProps {
  headers: string[];
  currentMapping: Record<string, number>;
  onMappingChange: (mapping: Record<string, number>) => void;
}

export default function FieldMapper({ headers, currentMapping, onMappingChange }: FieldMapperProps) {
  const [mapping, setMapping] = useState(currentMapping);
  
  const handleFieldChange = (field: string, headerIndex: number) => {
    const newMapping = { ...mapping };
    if (headerIndex === -1) {
      delete newMapping[field];
    } else {
      newMapping[field] = headerIndex;
    }
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const handleReset = () => {
    setMapping({});
    onMappingChange({});
  };

  const handleAutoDetect = () => {
    const newMapping: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const normalizedHeader = String(header || '').trim().toLowerCase();
      
      const fieldAliases = Object.entries({
        external_code: ['外部编码', '订单号', '单号', '订单编号', '运单号', 'tracking_no', 'tracking', 'order_id', 'order_no', 'external'],
        sender_name: ['发件人姓名', '寄件人姓名', '发件人', '寄件人', 'sender', 'sender_name', 'from_name', 'shipper', '收货人', 'receiver', '收件人'],
        sender_phone: ['发件人电话', '寄件人电话', '发件人手机', '寄件人手机', 'sender_phone', 'sender_tel', 'from_phone', 'shipper_phone', '收货人电话', 'receiver_phone', '收件人电话'],
        sender_address: ['发件人地址', '寄件人地址', '发件地址', '寄件地址', 'sender_address', 'from_address', 'shipper_address', '收货地址', 'receiver_address', '收件人地址'],
        receiver_name: ['收件人姓名', '收货人姓名', '收件人', '收货人', 'receiver', 'receiver_name', 'to_name', 'consignee', '发件人姓名', 'sender_name', '寄件人'],
        receiver_phone: ['收件人电话', '收货人电话', '收件人手机', '收货人手机', 'receiver_phone', 'receiver_tel', 'to_phone', 'consignee_phone', '发件人电话', 'sender_phone', '寄件人电话'],
        receiver_address: ['收件人地址', '收货人地址', '收件地址', '收货地址', 'receiver_address', 'to_address', 'consignee_address', '发件人地址', 'sender_address', '寄件人地址'],
        weight: ['重量', 'weight', 'kg', '重量(kg)', '货物重量', '毛重', '件数', 'quantity', '数量'],
        quantity: ['件数', '数量', '包裹数', 'quantity', 'pieces', 'count', 'num', '重量', 'weight'],
        temperature: ['温层', '温度', '温度要求', 'temp', 'temperature', '冷藏', '冷冻', '常温'],
        remark: ['备注', '备注信息', '说明', 'remark', 'notes', 'comment'],
      });
      
      for (const [field, aliases] of fieldAliases) {
        if (aliases.some(alias => alias.toLowerCase() === normalizedHeader)) {
          newMapping[field] = i;
          break;
        }
      }
    }
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  const handleSaveTemplate = () => {
    const template = {
      name: '自定义模板',
      fingerprint: headers.join('|'),
      mapping,
      createdAt: new Date().toISOString(),
    };
    const templates = JSON.parse(localStorage.getItem('excel_templates') || '[]');
    templates.push(template);
    localStorage.setItem('excel_templates', JSON.stringify(templates));
    alert('模板已保存！下次上传相同结构文件时将自动应用此映射');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">字段映射</h3>
        <div className="flex gap-2">
          <button
            onClick={handleAutoDetect}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            自动识别
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={handleSaveTemplate}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            保存模板
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {STANDARD_FIELDS.map(field => {
          const currentIndex = mapping[field];
          const currentHeader = currentIndex !== undefined ? headers[currentIndex] : '未选择';
          
          return (
            <div key={field} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-32 text-sm font-medium text-gray-700">
                {FIELD_DISPLAY_NAMES[field]}
              </div>
              <ArrowRight className="flex-shrink-0 w-4 h-4 text-gray-400" />
              <select
                value={currentIndex !== undefined ? currentIndex : -1}
                onChange={(e) => handleFieldChange(field, parseInt(e.target.value))}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
              >
                <option value={-1}>请选择...</option>
                {headers.map((header, index) => (
                  <option key={index} value={index}>
                    {header || `列 ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 提示：如果自动识别失败，您可以手动选择Excel列与系统字段的对应关系。
          点击"保存模板"可将当前映射规则保存，下次上传相同结构文件时将自动应用。
        </p>
      </div>
    </div>
  );
}