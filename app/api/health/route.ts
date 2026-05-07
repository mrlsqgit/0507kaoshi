// app/api/health/route.ts
// Health check endpoint to verify database connection

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT 1 as health');
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection is working',
      data: result.rows 
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Database connection failed',
        message: '请检查 DATABASE_URL 环境变量是否正确配置'
      },
      { status: 500 }
    );
  }
}