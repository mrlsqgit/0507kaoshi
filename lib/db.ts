// lib/db.ts
// Database connection and query functions

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false,
});

export async function query(text: string, params?: any[]) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export interface Order {
  id: string;
  external_code: string | null;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  weight: number;
  quantity: number;
  temperature: '常温' | '冷藏' | '冷冻';
  remark: string | null;
  status: 'pending' | 'submitted' | 'failed';
  error_message: string | null;
  created_at: Date;
}

export interface TemplateMapping {
  id: string;
  name: string;
  mappings: Record<string, string>;
  created_at: Date;
}

export interface ParsedRow {
  external_code?: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  weight: string;
  quantity: string;
  temperature: string;
  remark?: string;
}

export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
}