# 数据库配置说明

## 概述

本项目使用 PostgreSQL 数据库通过 Vercel Marketplace 集成，支持 Neon、Supabase 等服务商。

## 快速配置（Vercel）

### 方式 1：使用 Vercel Postgres（推荐）

1. 在 Vercel 项目中，进入 **Settings → Environment Variables**
2. 点击 **Add Database**
3. 选择 **Vercel Postgres**
4. 创建数据库后，`DATABASE_URL` 环境变量会自动添加

### 方式 2：使用 Neon

1. 访问 [neon.tech](https://neon.tech)
2. 注册并创建 PostgreSQL 数据库
3. 复制连接字符串（格式：`postgresql://user:pass@hostname/dbname`）
4. 在 Vercel 项目中添加环境变量：`DATABASE_URL=你的连接字符串`

### 方式 3：使用 Supabase

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 在 Project Settings → Database 中找到连接字符串
4. 在 Vercel 项目中添加环境变量：`DATABASE_URL=你的连接字符串`

## 本地开发配置

1. 在项目根目录创建 `.env.local` 文件
2. 添加你的数据库连接字符串：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/excel_import_db
```

3. 安装依赖并启动开发服务器

```bash
npm install
npm run dev
```

## 数据库初始化

### 使用提供的 SQL 脚本

项目根目录下有 `sql/schema.sql` 文件，包含创建所需表的 SQL。

### 在 Neon 等平台执行

1. 登录数据库管理界面
2. 打开 SQL 编辑器
3. 复制 `sql/schema.sql` 内容并执行

### 使用 psql 命令行

```bash
psql $DATABASE_URL -f sql/schema.sql
```

## 数据表结构

### orders 表

存储运单信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键，订单编号 |
| external_code | VARCHAR(255) | 外部编码 |
| sender_name | VARCHAR(255) | 发件人姓名（必填） |
| sender_phone | VARCHAR(50) | 发件人电话（必填） |
| sender_address | TEXT | 发件人地址（必填） |
| receiver_name | VARCHAR(255) | 收件人姓名（必填） |
| receiver_phone | VARCHAR(50) | 收件人电话（必填） |
| receiver_address | TEXT | 收件人地址（必填） |
| weight | DECIMAL(10,2) | 重量（kg，必填） |
| quantity | INTEGER | 件数（必填） |
| temperature | VARCHAR(20) | 温层：常温/冷藏/冷冻（必填） |
| remark | TEXT | 备注 |
| status | VARCHAR(20) | 状态：pending/submitted/failed（默认 submitted） |
| error_message | TEXT | 错误信息 |
| created_at | TIMESTAMP | 创建时间（默认当前时间） |

### templates 表

存储模板映射

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| name | VARCHAR(255) | 模板名称（必填） |
| mappings | JSONB | 列映射配置（必填） |
| created_at | TIMESTAMP | 创建时间（默认当前时间） |

## API 端点

### GET /api/orders

获取订单列表

**查询参数：**
- `page`：页码（默认 1）
- `pageSize`：每页数量（默认 20）
- `externalCode`：按外部编码模糊搜索
- `receiverName`：按收件人姓名模糊搜索

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sender_name": "张三",
      "receiver_name": "李四",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "pages": 5
  }
}
```

### POST /api/orders

提交订单

**请求体：**
```json
{
  "orders": [
    {
      "external_code": "ABC123",
      "sender_name": "张三",
      "sender_phone": "13800138000",
      "sender_address": "北京市...",
      "receiver_name": "李四",
      "receiver_phone": "13900139000",
      "receiver_address": "上海市...",
      "weight": 10.5,
      "quantity": 3,
      "temperature": "冷藏",
      "remark": "轻拿轻放"
    }
  ]
}
```

## 故障排查

### 数据库连接错误

**问题：** 页面显示 "Database query error" 或 "Database connection error"

**解决方案：**
1. 检查 `DATABASE_URL` 环境变量是否正确设置
2. 确认数据库服务正在运行
3. 检查防火墙/网络连接
4. 确认数据库用户有足够权限

### 表不存在错误

**问题：** 提示 "relation \"orders\" does not exist"

**解决方案：**
1. 执行 `sql/schema.sql` 初始化数据库
2. 确认连接到正确的数据库

### SSL 连接问题

**问题：** 使用 Neon 等云数据库时出现 SSL 错误

**解决方案：**
- 本项目已配置自动检测 Neon 连接并启用 SSL，无需额外配置

## 性能优化建议

1. **索引：** 已在 `external_code`、`receiver_name`、`created_at`、`status` 上创建索引
2. **分页：** 使用 API 的分页参数，避免一次性加载大量数据
3. **搜索：** 使用模糊搜索时注意性能影响
