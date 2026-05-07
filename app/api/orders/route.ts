// app/api/orders/route.ts
// Orders API routes

import { NextRequest, NextResponse } from 'next/server';
import { query, Order } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const externalCode = searchParams.get('externalCode');
    const receiverName = searchParams.get('receiverName');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    
    let sql = 'SELECT * FROM orders ORDER BY created_at DESC';
    const params: any[] = [];
    
    if (externalCode) {
      sql = sql.replace('ORDER BY', `WHERE external_code ILIKE $${params.length + 1} ORDER BY`);
      params.push(`%${externalCode}%`);
    }
    
    if (receiverName) {
      const connector = params.length > 0 ? 'AND' : 'WHERE';
      sql = sql.replace('ORDER BY', ` ${connector} receiver_name ILIKE $${params.length + 1} ORDER BY`);
      params.push(`%${receiverName}%`);
    }
    
    // Pagination
    const offset = (page - 1) * pageSize;
    const countResult = await query('SELECT COUNT(*) FROM orders');
    const total = parseInt(countResult.rows[0].count);
    
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pageSize, offset);
    
    const result = await query(sql, params);
    const orders = result.rows as Order[];
    
    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch orders',
        message: '获取订单列表失败，请检查数据库连接'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orders = body.orders as Order[];
    
    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No orders provided', message: '没有提供订单数据' },
        { status: 400 }
      );
    }
    
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    for (const order of orders) {
      try {
        await query(
          'INSERT INTO orders (external_code, sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight, quantity, temperature, remark) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          [
            order.external_code || null,
            order.sender_name,
            order.sender_phone,
            order.sender_address,
            order.receiver_name,
            order.receiver_phone,
            order.receiver_address,
            order.weight,
            order.quantity,
            order.temperature,
            order.remark || null,
          ]
        );
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`${order.external_code || 'Unknown'}: ${err.message}`);
        console.error('Failed to insert order:', err.message);
      }
    }
    
    return NextResponse.json({
      success: failedCount === 0,
      successCount,
      failedCount,
      errors,
      message: failedCount === 0 
        ? `成功提交 ${successCount} 条订单` 
        : `成功提交 ${successCount} 条订单，失败 ${failedCount} 条`,
    });
  } catch (error: any) {
    console.error('Error creating orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create orders',
        message: '提交订单失败，请检查数据库连接'
      },
      { status: 500 }
    );
  }
}