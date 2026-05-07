# 万能导入系统 - 多模板自动导入下单系统

一个支持多种 Excel 模板自动识别与导入的批量下单系统。

## 功能特性

### 模块一：模板管理与文件导入
- ✅ 支持上传 Excel 文件（.xlsx / .xls）
- ✅ 支持拖拽上传和点击上传
- ✅ 自动识别多种模板格式（不同列名、不同列序）
- ✅ 模板记忆学习：自动记录列映射规则
- ✅ 实时进度条显示
- ✅ 支持 1000+ 条数据导入
- ✅ 完善的错误处理

### 模块二：数据预览与编辑
- ✅ 类 Excel 表格展示
- ✅ 表头固定、横向滚动
- ✅ 单元格点击直接编辑
- ✅ 行内错误实时校验（标红提示）
- ✅ 全部错误一次性展示
- ✅ 外部编码重复检测
- ✅ 支持删除行、新增空行
- ✅ 支持导出数据

### 模块三：提交下单
- ✅ 错误行禁止提交
- ✅ 提交进度条
- ✅ 数据持久化到数据库
- ✅ 返回提交结果汇总

### 模块四：已导入运单列表
- ✅ 查看历史运单记录
- ✅ 支持搜索筛选
- ✅ 分页展示

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 3
- **数据库**: PostgreSQL (Neon/Supabase/Vercel Postgres)
- **Excel解析**: SheetJS (xlsx)
- **图标**: Lucide React

## 快速开始

### 安装依赖

```bash
cd excel-import-system
npm install
```

### 环境变量

复制 `.env.example` 并重命名为 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接字符串：

```env
DATABASE_URL="your-database-connection-string"
```

### 创建数据库表

在你的 PostgreSQL 数据库中执行 `sql/schema.sql` 文件：

```bash
psql -d your-database -f sql/schema.sql
```

或在数据库管理界面中执行 SQL。

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm start
```

## 部署到 Vercel

### 步骤 1：推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/excel-import-system.git
git push -u origin main
```

### 步骤 2：导入项目到 Vercel

1. 访问 https://vercel.com
2. 点击 "New Project"
3. 选择你的 GitHub 仓库
4. 点击 "Import"

### 步骤 3：配置环境变量

在 Vercel 项目设置中添加环境变量：

```
DATABASE_URL=your-database-connection-string
```

### 步骤 4：创建数据库

推荐使用 **Neon** 或 **Supabase**：

#### 使用 Neon（推荐）
1. 访问 https://neon.tech
2. 创建新数据库
3. 获取连接字符串
4. 在 SQL Editor 中执行 `sql/schema.sql`

#### 使用 Supabase
1. 访问 https://supabase.com
2. 创建新项目
3. 获取连接字符串
4. 在 SQL Editor 中执行 `sql/schema.sql`

### 步骤 5：部署

点击 Vercel 中的 "Deploy" 按钮，等待构建完成。

## 字段说明

| 字段名 | 说明 | 必填 |
|--------|------|------|
| 外部编码 | 外部系统订单唯一编号（用于去重） | 否 |
| 发件人姓名 | 寄件人姓名 | 是 |
| 发件人电话 | 寄件人联系方式 | 是 |
| 发件人地址 | 寄件人完整地址 | 是 |
| 收件人姓名 | 收货人姓名 | 是 |
| 收件人电话 | 收货人联系方式 | 是 |
| 收件人地址 | 收货人完整地址 | 是 |
| 重量 (kg) | 货物重量，必须为正数 | 是 |
| 件数 | 包裹数量，必须为正整数 | 是 |
| 温层 | 常温 / 冷藏 / 冷冻 | 是 |
| 备注 | 附加说明 | 否 |

## API 接口

### 文件上传

```
POST /api/upload
Content-Type: multipart/form-data

参数:
- file: Excel 文件 (.xlsx/.xls)

返回:
{
  "success": true,
  "data": {
    "headers": [...],
    "rows": [...],
    "mapping": {...},
    "errors": [...],
    "duplicates": [...],
    "totalRows": 100
  }
}
```

### 提交订单

```
POST /api/orders
Content-Type: application/json

参数:
{
  "orders": [
    {
      "sender_name": "...",
      "sender_phone": "...",
      "sender_address": "...",
      "receiver_name": "...",
      "receiver_phone": "...",
      "receiver_address": "...",
      "weight": 10.5,
      "quantity": 5,
      "temperature": "常温",
      "remark": "..."
    }
  ]
}

返回:
{
  "success": true,
  "successCount": 98,
  "failedCount": 2,
  "errors": [...]
}
```

### 查询订单列表

```
GET /api/orders?page=1&pageSize=20&receiverName=xxx

返回:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "pages": 5
  }
}
```

## 项目结构

```
excel-import-system/
├── app/
│   ├── api/
│   │   ├── orders/route.ts      # 订单 API
│   │   ├── templates/route.ts   # 模板 API
│   │   └── upload/route.ts      # 上传 API
│   ├── components/
│   │   ├── DataTable.tsx        # 数据表格组件
│   │   ├── ErrorList.tsx        # 错误列表组件
│   │   ├── FileUploader.tsx     # 文件上传组件
│   │   └── ProgressBar.tsx      # 进度条组件
│   ├── globals.css              # 全局样式
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 主页面
├── lib/
│   └── db.ts                    # 数据库连接
├── sql/
│   └── schema.sql               # 数据库建表语句
├── utils/
│   └── excelParser.ts           # Excel 解析工具
├── .env.example                 # 环境变量示例
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 许可证

MIT License