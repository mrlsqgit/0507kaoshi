// utils/excelParser.ts
// Excel parsing and template matching utilities

import * as XLSX from 'xlsx';
import { ParsedRow, ValidationError } from '@/lib/db';

// Standard field names
export const STANDARD_FIELDS = [
  'external_code',
  'sender_name',
  'sender_phone',
  'sender_address',
  'receiver_name',
  'receiver_phone',
  'receiver_address',
  'weight',
  'quantity',
  'temperature',
  'remark',
] as const;

export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  external_code: '外部编码',
  sender_name: '发件人姓名',
  sender_phone: '发件人电话',
  sender_address: '发件人地址',
  receiver_name: '收件人姓名',
  receiver_phone: '收件人电话',
  receiver_address: '收件人地址',
  weight: '重量 (kg)',
  quantity: '件数',
  temperature: '温层',
  remark: '备注',
};

// Common aliases for field matching
export const FIELD_ALIASES: Record<string, string[]> = {
  external_code: ['外部编码', '订单号', '单号', '订单编号', '运单号', 'tracking_no', 'tracking', 'order_id', 'order_no', 'external'],
  sender_name: ['发件人姓名', '寄件人姓名', '发件人', '寄件人', 'sender', 'sender_name', 'from_name', 'shipper'],
  sender_phone: ['发件人电话', '寄件人电话', '发件人手机', '寄件人手机', 'sender_phone', 'sender_tel', 'from_phone', 'shipper_phone'],
  sender_address: ['发件人地址', '寄件人地址', '发件地址', '寄件地址', 'sender_address', 'from_address', 'shipper_address'],
  receiver_name: ['收件人姓名', '收货人姓名', '收件人', '收货人', 'receiver', 'receiver_name', 'to_name', 'consignee'],
  receiver_phone: ['收件人电话', '收货人电话', '收件人手机', '收货人手机', 'receiver_phone', 'receiver_tel', 'to_phone', 'consignee_phone'],
  receiver_address: ['收件人地址', '收货人地址', '收件地址', '收货地址', 'receiver_address', 'to_address', 'consignee_address'],
  weight: ['重量', 'weight', 'kg', '重量(kg)', '货物重量', '毛重'],
  quantity: ['件数', '数量', '包裹数', 'quantity', 'pieces', 'count', 'num'],
  temperature: ['温层', '温度', '温度要求', 'temp', 'temperature', '冷藏', '冷冻', '常温'],
  remark: ['备注', '备注信息', '说明', 'remark', 'notes', 'comment'],
};

export function parseExcel(file: Buffer): { headers: string[]; rows: any[][] } {
  const workbook = XLSX.read(file, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (!data || data.length === 0) {
    throw new Error('文件内容为空');
  }
  
  const headers = (data[0] as any[]).map((h: any) => String(h || '').trim());
  const rows = data.slice(1) as any[][];
  
  return { headers, rows };
}

export function matchTemplate(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const normalizedHeader = String(header || '').trim().toLowerCase();
    
    const fieldAliases = Object.entries(FIELD_ALIASES);
    for (let j = 0; j < fieldAliases.length; j++) {
      const [field, aliases] = fieldAliases[j];
      if (aliases.some(alias => alias.toLowerCase() === normalizedHeader)) {
        mapping[field] = i;
        break;
      }
    }
  }
  
  return mapping;
}

export function parseRow(row: any[], mapping: Record<string, number>): ParsedRow {
  const result: ParsedRow = {
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
  
  for (const [field, index] of Object.entries(mapping)) {
    const value = row[index];
    if (value !== undefined && value !== null) {
      (result as any)[field] = String(value).trim();
    }
  }
  
  return result;
}

export function validateRow(row: ParsedRow, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Required fields - 发件人信息
  if (!row.sender_name) {
    errors.push({ rowIndex, field: 'sender_name', message: '发件人姓名不能为空' });
  }
  
  if (!row.sender_phone) {
    errors.push({ rowIndex, field: 'sender_phone', message: '发件人电话不能为空' });
  } else if (!/^1[3-9]\d{9}$/.test(row.sender_phone.replace(/\s/g, ''))) {
    errors.push({ rowIndex, field: 'sender_phone', message: '发件人电话格式错误' });
  }
  
  if (!row.sender_address) {
    errors.push({ rowIndex, field: 'sender_address', message: '发件人地址不能为空' });
  }
  
  // Required fields - 收件人信息
  if (!row.receiver_name) {
    errors.push({ rowIndex, field: 'receiver_name', message: '收件人姓名不能为空' });
  }
  
  if (!row.receiver_phone) {
    errors.push({ rowIndex, field: 'receiver_phone', message: '收件人电话不能为空' });
  } else if (!/^1[3-9]\d{9}$/.test(row.receiver_phone.replace(/\s/g, ''))) {
    errors.push({ rowIndex, field: 'receiver_phone', message: '收件人电话格式错误' });
  }
  
  if (!row.receiver_address) {
    errors.push({ rowIndex, field: 'receiver_address', message: '收件人地址不能为空' });
  }
  
  // Weight validation
  const weight = parseFloat(row.weight);
  if (!row.weight) {
    errors.push({ rowIndex, field: 'weight', message: '重量不能为空' });
  } else if (isNaN(weight) || weight <= 0) {
    errors.push({ rowIndex, field: 'weight', message: '重量必须为正数' });
  }
  
  // Quantity validation
  const quantity = parseInt(row.quantity);
  if (!row.quantity) {
    errors.push({ rowIndex, field: 'quantity', message: '件数不能为空' });
  } else if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    errors.push({ rowIndex, field: 'quantity', message: '件数必须为正整数' });
  }
  
  // Temperature validation
  if (!row.temperature) {
    errors.push({ rowIndex, field: 'temperature', message: '温层不能为空' });
  } else if (!['常温', '冷藏', '冷冻', 'ambient', 'chilled', 'frozen'].includes(row.temperature)) {
    errors.push({ rowIndex, field: 'temperature', message: '温层必须是常温、冷藏或冷冻之一' });
  }
  
  // Optional fields - 外部编码和备注允许缺失，不报错
  // external_code 和 remark 是可选字段，缺失时不报错
  
  return errors;
}

export function findDuplicates(rows: ParsedRow[]): { rowIndex: number; duplicateOf: number }[] {
  const duplicates: { rowIndex: number; duplicateOf: number }[] = [];
  const externalCodeMap = new Map<string, number>();
  
  for (let i = 0; i < rows.length; i++) {
    const externalCode = rows[i].external_code;
    if (externalCode) {
      const trimmedCode = externalCode.trim();
      if (externalCodeMap.has(trimmedCode)) {
        duplicates.push({ rowIndex: i, duplicateOf: externalCodeMap.get(trimmedCode)! });
      } else {
        externalCodeMap.set(trimmedCode, i);
      }
    }
  }
  
  return duplicates;
}