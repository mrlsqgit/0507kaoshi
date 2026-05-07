// app/api/templates/route.ts
// Templates API routes

import { NextRequest, NextResponse } from 'next/server';
import { query, TemplateMapping } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM templates ORDER BY created_at DESC');
    const templates = result.rows as TemplateMapping[];
    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, mappings } = body;
    
    if (!name || !mappings) {
      return NextResponse.json(
        { success: false, error: 'Name and mappings are required' },
        { status: 400 }
      );
    }
    
    const result = await query(
      'INSERT INTO templates (name, mappings) VALUES ($1, $2) RETURNING *',
      [name, mappings]
    );
    const template = result.rows[0] as TemplateMapping;
    
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    const result = await query('DELETE FROM templates WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}