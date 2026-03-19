# 家庭衣橱管理系统 · Family Wardrobe Manager

[中文](#中文) | [English](#english)

---

<a name="中文"></a>
# 中文

一个为家庭设计的衣物管理工具，帮助记录和整理家庭成员的衣物信息，支持只读端供阿姨等人员查看。

## 功能特性

- 👕 衣物录入：支持拍照上传，图片自动压缩生成缩略图
- 👨‍👩‍👦 多人员管理：按家庭成员分类管理衣物
- 🔍 多维筛选：按类型、季节、状态、收藏筛选
- ↕️ 列表排序：桌面端点击列头排序，手机端胶囊排序
- ⭐ 收藏标记：快速标记常用衣物，一键切换
- 📊 统计概览：点击数字卡片展开对应衣物列表
- 📱 响应式设计：桌面 / 平板 / 手机三档自适应
- 👀 只读端：无需登录，供家里阿姨等人员查看

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML / CSS / JavaScript（无框架）
- **存储**：JSON 文件（无数据库）
- **部署**：Docker（推荐）或 Node.js 直接运行

## 快速开始

### Docker 部署（推荐）

```bash
# 1. 修改配置
vim config.json  # 设置密码和路径

# 2. 构建并启动
docker compose up -d
```

详细步骤见 [DEPLOY.md](./DEPLOY.md)

### 本地开发

```bash
npm install
node server.js
```

访问：
- 只读端：http://localhost:3000/view
- 管理端：http://localhost:3000/admin

## 项目结构

```
wardrobe/
├── server.js              # 后端主服务
├── package.json
├── config.json            # 配置文件（密码、路径等）
├── Dockerfile
├── docker-compose.yml
├── data/
│   ├── wardrobe.json      # 衣物数据
│   └── members.json       # 人员数据
├── photos/                # 图片存储（volume 挂载）
└── public/
    ├── shared/
    │   ├── style.css
    │   └── utils.js
    ├── admin/
    │   ├── index.html
    │   ├── login.html
    │   └── admin.js
    └── view/
        ├── index.html
        └── view.js
```

## 数据结构

`wardrobe.json` 每条记录字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | UUID |
| `name` | string | 衣物名称 |
| `clothingType` | string | 上衣/裤子/鞋子/外套/内衣/内裤/其他 |
| `member` | string | 适用人员 |
| `size` | string | 尺码 |
| `color` | string | 颜色 |
| `brand` | string | 品牌 |
| `notes` | string | 备注 |
| `status` | string | 在用/闲置/已淘汰 |
| `seasons` | array | 适穿季节，可多选：春/夏/秋/冬/四季 |
| `favorite` | boolean | 是否收藏，旧数据默认 false |
| `photoPath` | string | 展示图路径 |
| `thumbPath` | string | 缩略图路径，旧数据默认 null |
| `createdAt` | string | 创建时间 ISO8601 |
| `updatedAt` | string | 更新时间 ISO8601 |

## API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/clothes` | 获取列表，支持 `?member=&type=&status=&season=&favorite=&q=` |
| POST | `/api/clothes` | 新增（multipart/form-data，photo + thumb 双字段）|
| PUT | `/api/clothes/:id` | 编辑 |
| PATCH | `/api/clothes/:id/favorite` | 快速切换收藏 |
| DELETE | `/api/clothes/:id` | 删除 |
| GET | `/api/members` | 获取人员列表 |
| POST | `/api/members` | 新增人员 |
| PUT | `/api/members/:id` | 编辑人员（同步更新衣物 member 字段）|
| DELETE | `/api/members/:id` | 删除人员 |
| POST | `/api/login` | 登录 |
| POST | `/api/logout` | 退出 |
| GET | `/api/auth/check` | 检查登录状态 |

## 配置说明

```json
{
  "port": 3000,
  "adminPassword": "your-password",
  "sessionSecret": "random-long-string",
  "photoBaseDir": "/app/photos"
}
```

> Docker 部署时 `photoBaseDir` 必须填 `/app/photos`。
> 手动部署时填 NAS 实际路径，如 `/volume1/web/wardrobe/photos`。

## 许可证

MIT

---

<a name="english"></a>
# English

A family wardrobe management tool for recording and organizing clothing items by family member. Includes a read-only view for caregivers and household staff.

## Features

- 👕 Clothing entry with photo upload — images are automatically compressed and thumbnails generated
- 👨‍👩‍👦 Multi-member management — organize clothing by family member
- 🔍 Multi-dimensional filtering — by type, season, status, and favorites
- ↕️ Sortable list — click column headers on desktop, pill buttons on mobile
- ⭐ Favorites — one-click toggle to mark frequently used items
- 📊 Statistics — click any stat card to expand the matching clothing list
- 📱 Responsive design — desktop / tablet / mobile adaptive layout
- 👀 Read-only view — no login required, designed for household staff

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML / CSS / JavaScript (no framework)
- **Storage**: JSON files (no database)
- **Deployment**: Docker (recommended) or Node.js directly

## Quick Start

### Docker (Recommended)

```bash
# 1. Edit config
vim config.json  # set your password and paths

# 2. Build and start
docker compose up -d
```

See [DEPLOY.md](./DEPLOY.md) for full instructions.

### Local Development

```bash
npm install
node server.js
```

Access:
- Read-only view: http://localhost:3000/view
- Admin panel: http://localhost:3000/admin

## Project Structure

```
wardrobe/
├── server.js              # Backend server
├── package.json
├── config.json            # Config (password, paths)
├── Dockerfile
├── docker-compose.yml
├── data/
│   ├── wardrobe.json      # Clothing data
│   └── members.json       # Member data
├── photos/                # Photo storage (volume mount)
└── public/
    ├── shared/
    │   ├── style.css
    │   └── utils.js
    ├── admin/
    │   ├── index.html
    │   ├── login.html
    │   └── admin.js
    └── view/
        ├── index.html
        └── view.js
```

## Data Schema

Each record in `wardrobe.json`:

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID |
| `name` | string | Item name |
| `clothingType` | string | Top / Pants / Shoes / Coat / Underwear / Underpants / Other |
| `member` | string | Family member |
| `size` | string | Size |
| `color` | string | Color |
| `brand` | string | Brand |
| `notes` | string | Notes |
| `status` | string | In use / Idle / Retired |
| `seasons` | array | Seasons: Spring / Summer / Autumn / Winter / All-season |
| `favorite` | boolean | Favorited, defaults to false for legacy data |
| `photoPath` | string | Full-size photo path |
| `thumbPath` | string | Thumbnail path, null for legacy data |
| `createdAt` | string | ISO8601 created timestamp |
| `updatedAt` | string | ISO8601 updated timestamp |

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/clothes` | List clothes, supports `?member=&type=&status=&season=&favorite=&q=` |
| POST | `/api/clothes` | Create (multipart/form-data, `photo` + `thumb` fields) |
| PUT | `/api/clothes/:id` | Update |
| PATCH | `/api/clothes/:id/favorite` | Toggle favorite |
| DELETE | `/api/clothes/:id` | Delete |
| GET | `/api/members` | List members |
| POST | `/api/members` | Create member |
| PUT | `/api/members/:id` | Update member (syncs clothing records) |
| DELETE | `/api/members/:id` | Delete member |
| POST | `/api/login` | Login |
| POST | `/api/logout` | Logout |
| GET | `/api/auth/check` | Check auth status |

## Configuration

```json
{
  "port": 3000,
  "adminPassword": "your-password",
  "sessionSecret": "random-long-string",
  "photoBaseDir": "/app/photos"
}
```

> When using Docker, `photoBaseDir` must be `/app/photos` (container path).
> For manual deployment, use the actual NAS path, e.g. `/volume1/web/wardrobe/photos`.

## License

MIT
