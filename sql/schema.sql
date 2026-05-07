-- sql/schema.sql
-- Database schema for Excel Import System

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    external_code VARCHAR(255),
    sender_name VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(50) NOT NULL,
    sender_address TEXT NOT NULL,
    receiver_name VARCHAR(255) NOT NULL,
    receiver_phone VARCHAR(50) NOT NULL,
    receiver_address TEXT NOT NULL,
    weight DECIMAL(10, 2) NOT NULL CHECK (weight > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    temperature VARCHAR(20) NOT NULL CHECK (temperature IN ('常温', '冷藏', '冷冻')),
    remark TEXT,
    status VARCHAR(20) DEFAULT 'submitted',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_external_code ON orders(external_code);
CREATE INDEX IF NOT EXISTS idx_orders_receiver_name ON orders(receiver_name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create templates table for template mappings
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mappings JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for template name
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);