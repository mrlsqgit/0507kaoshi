// app/api/upload/route.ts
// File upload API route

import { NextRequest, NextResponse } from 'next/server';
import { parseExcel, matchTemplate, parseRow, validateRow, findDuplicates } from '@/utils/excelParser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { success: false, error: '文件格式错误，仅支持 .xlsx 和 .xls 格式' },
        { status: 400 }
      );
    }
    
    // Read file
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse Excel
    let parsedData;
    try {
      parsedData = parseExcel(buffer);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: `文件解析失败: ${error.message}` },
        { status: 400 }
      );
    }
    
    const { headers, rows } = parsedData;
    
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '文件内容为空' },
        { status: 400 }
      );
    }
    
    // Auto-detect template mapping
    const mapping = matchTemplate(headers);
    
    // Parse all rows
    const parsedRows = rows.map((row, index) => ({
      ...parseRow(row, mapping),
      originalRow: row,
    }));
    
    // Validate rows
    const allErrors: { rowIndex: number; field: string; message: string }[] = [];
    parsedRows.forEach((row, index) => {
      const errors = validateRow(row, index);
      allErrors.push(...errors);
    });
    
    // Find duplicates
    const duplicates = findDuplicates(parsedRows);
    
    return NextResponse.json({
      success: true,
      data: {
        headers,
        rows: parsedRows,
        originalRows: rows,
        mapping,
        errors: allErrors,
        duplicates,
        totalRows: rows.length,
      },
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: error.message || '上传失败' },
      { status: 500 }
    );
  }
}