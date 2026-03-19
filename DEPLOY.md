# 部署指南 · Deployment Guide

[中文](#中文) | [English](#english)

---

<a name="中文"></a>
# 中文

两种部署方式，**推荐 Docker 方式**：

| 方式 | 难度 | 适合场景 |
|---|---|---|
| **Docker 部署（推荐）** | ⭐ 简单 | 群晖安装了 Container Manager，或电脑上有 Docker |
| 手动部署 | ⭐⭐⭐ 较复杂 | 不方便使用 Docker 的环境 |

---

# 🐳 Docker 部署

## 前置准备

在 NAS 上用 File Station 创建以下目录结构：

```
/volume1/web/wardrobe/
├── config.json          ← 从项目复制并修改
├── data/
│   ├── wardrobe.json    ← 内容为 []
│   └── members.json     ← 见下方
├── photos/              ← 空文件夹
└── public/              ← 从项目复制整个 public 文件夹
```

**`data/members.json` 初始内容（按实际人员修改）：**

```json
[
  { "id": "member_1", "name": "大儿子" },
  { "id": "member_2", "name": "小儿子" }
]
```

**`config.json` 必须修改：**

```json
{
  "port": 3000,
  "adminPassword": "你的管理密码",
  "sessionSecret": "请替换为随机长字符串如xK9mP2qR8nW3jA7c",
  "photoBaseDir": "/app/photos"
}
```

> ⚠️ Docker 环境下 `photoBaseDir` **必须填 `/app/photos`**，这是容器内路径。

---

## 方式 A：在电脑上构建镜像（推荐）

适合大多数家庭 NAS（NAS 不需要联网）。

### A-1：安装 Docker Desktop

下载地址：https://www.docker.com/products/docker-desktop/

### A-2：构建并导出镜像

打开 PowerShell（Windows）或终端（Mac），进入项目文件夹执行：

```
docker build --platform linux/amd64 -t wardrobe-manager:latest .
docker save -o wardrobe.tar wardrobe-manager:latest
```

约 3～5 分钟后生成 `wardrobe.tar`（约 60～80MB）。

### A-3：上传 tar 到 NAS

用 File Station 将 `wardrobe.tar` 上传到 `/volume1/web/wardrobe/`。

### A-4：在 Container Manager 导入镜像

1. 打开 **Container Manager** → 左侧「**映像**」
2. 「**新增**」→「**从文件新增**」→ 选择 `wardrobe.tar`
3. 等待导入完成，映像列表出现 `wardrobe-manager:latest`

### A-5：创建容器

在映像列表找到 `wardrobe-manager:latest`，点「**执行**」：

**常规：**
- 容器名称：`wardrobe`
- 勾选「自动重新启动」

**端口：**

| 本地端口 | 容器端口 |
|---|---|
| `3000` | `3000` |

**存储空间（4 条 volume 挂载）：**

| 本地路径 | 容器路径 | 权限 |
|---|---|---|
| `/volume1/web/wardrobe/data` | `/app/data` | 读写 |
| `/volume1/web/wardrobe/photos` | `/app/photos` | 读写 |
| `/volume1/web/wardrobe/config.json` | `/app/config.json` | 只读 |
| `/volume1/web/wardrobe/public` | `/app/public` | 读写 |

> 💡 挂载 `public/` 后，更新前端文件只需替换 NAS 上的文件，刷新浏览器即生效，无需重建镜像。

**环境变量：**

| 变量名 | 值 |
|---|---|
| `TZ` | `Asia/Shanghai` |

点「**完成**」，容器自动启动。

### A-6：验证

浏览器访问：
- 只读端：`http://NAS的IP:3000/view`
- 管理端：`http://NAS的IP:3000/admin`

---

## 方式 B：NAS 直接构建（需要 NAS 能访问外网）

SSH 连接 NAS 后执行：

```bash
cd /volume1/web/wardrobe
docker compose up -d
```

首次构建约 5～10 分钟。

---

## 更新升级

### 只更新前端文件（无需重建镜像）

用 File Station 替换以下文件，刷新浏览器即生效：

```
/volume1/web/wardrobe/public/shared/style.css
/volume1/web/wardrobe/public/shared/utils.js
/volume1/web/wardrobe/public/admin/index.html
/volume1/web/wardrobe/public/admin/admin.js
/volume1/web/wardrobe/public/view/index.html
/volume1/web/wardrobe/public/view/view.js
```

### 更新后端 server.js（需重建镜像）

1. 本地修改 `server.js` 后重新执行 A-2～A-5
2. 停止并删除旧容器，用新镜像重新创建（volume 配置不变）

### 数据安全说明

重建镜像、删除容器**不会影响任何数据**，数据全部在 volume 挂载目录中：

```
/volume1/web/wardrobe/data/      ← 衣物和人员数据
/volume1/web/wardrobe/photos/    ← 图片文件
```

---

## Docker 常用命令

```bash
docker ps | grep wardrobe       # 查看容器状态
docker logs -f wardrobe         # 查看日志
docker restart wardrobe         # 重启容器
docker stop wardrobe            # 停止
docker start wardrobe           # 启动
```

---

# 📋 手动部署（不使用 Docker）

## 前置要求

| 软件 | 版本 | 安装方式 |
|---|---|---|
| Node.js | 18.x 或以上 | 套件中心 → SynoCommunity |
| Web Station | 3.x | 套件中心 |

## 步骤

### 1. 上传项目文件

将项目文件夹上传到 `/volume1/web/wardrobe/`

### 2. 修改 config.json

```json
{
  "port": 3000,
  "adminPassword": "你的密码",
  "sessionSecret": "随机长字符串",
  "photoBaseDir": "/volume1/web/wardrobe/photos"
}
```

### 3. 安装依赖

```bash
cd /volume1/web/wardrobe
npm install
```

### 4. 测试启动

```bash
node server.js
```

### 5. 配置开机自启

创建 `/volume1/web/wardrobe/start.sh`：

```bash
#!/bin/bash
cd /volume1/web/wardrobe
/usr/local/bin/node server.js >> /volume1/web/wardrobe/wardrobe.log 2>&1 &
echo $! > /volume1/web/wardrobe/wardrobe.pid
```

```bash
chmod +x /volume1/web/wardrobe/start.sh
```

DSM → 控制面板 → 任务计划 → 新增触发任务（开机）→ 运行命令：
```
bash /volume1/web/wardrobe/start.sh
```

---

## 访问地址

| 用途 | 地址 |
|---|---|
| 只读端 | `http://NAS的IP:3000/view` |
| 管理端 | `http://NAS的IP:3000/admin` |

---

<a name="english"></a>
# English

Two deployment options. **Docker is recommended.**

| Method | Difficulty | Best for |
|---|---|---|
| **Docker (Recommended)** | ⭐ Easy | Synology NAS with Container Manager, or any machine with Docker |
| Manual | ⭐⭐⭐ Advanced | Environments where Docker is not available |

---

# 🐳 Docker Deployment

## Prerequisites

Create the following directory structure on your NAS using File Station:

```
/volume1/web/wardrobe/
├── config.json          ← copy from project and edit
├── data/
│   ├── wardrobe.json    ← content: []
│   └── members.json     ← see below
├── photos/              ← empty folder
└── public/              ← copy the entire public/ folder from project
```

**Initial `data/members.json` (edit to match your family):**

```json
[
  { "id": "member_1", "name": "Child 1" },
  { "id": "member_2", "name": "Child 2" }
]
```

**`config.json` — required fields:**

```json
{
  "port": 3000,
  "adminPassword": "your-password",
  "sessionSecret": "replace-with-a-random-string-like-xK9mP2qR8nW3jA7c",
  "photoBaseDir": "/app/photos"
}
```

> ⚠️ When using Docker, `photoBaseDir` **must be `/app/photos`** (the container's internal path).

---

## Option A: Build on Your Computer (Recommended)

Best for home NAS setups — the NAS does not need internet access.

### A-1: Install Docker Desktop

Download: https://www.docker.com/products/docker-desktop/

### A-2: Build and Export the Image

Open PowerShell (Windows) or Terminal (Mac), navigate to the project folder and run:

```
docker build --platform linux/amd64 -t wardrobe-manager:latest .
docker save -o wardrobe.tar wardrobe-manager:latest
```

Takes about 3–5 minutes. A `wardrobe.tar` file (~60–80MB) will be created.

### A-3: Upload tar to NAS

Use File Station to upload `wardrobe.tar` to `/volume1/web/wardrobe/`.

### A-4: Import Image in Container Manager

1. Open **Container Manager** → **Image** (left sidebar)
2. Click **Add** → **Add from File** → select `wardrobe.tar`
3. Wait for import to finish — `wardrobe-manager:latest` will appear in the list

### A-5: Create Container

Find `wardrobe-manager:latest` and click **Run**:

**General:**
- Container name: `wardrobe`
- Enable auto-restart ✅

**Port:**

| Local Port | Container Port |
|---|---|
| `3000` | `3000` |

**Volume Mounts (4 entries):**

| Local Path | Container Path | Mode |
|---|---|---|
| `/volume1/web/wardrobe/data` | `/app/data` | Read/Write |
| `/volume1/web/wardrobe/photos` | `/app/photos` | Read/Write |
| `/volume1/web/wardrobe/config.json` | `/app/config.json` | Read-only |
| `/volume1/web/wardrobe/public` | `/app/public` | Read/Write |

> 💡 Mounting `public/` means you can update frontend files (HTML/CSS/JS) by replacing files on the NAS — no image rebuild needed, just refresh the browser.

**Environment Variables:**

| Name | Value |
|---|---|
| `TZ` | `Asia/Shanghai` |

Click **Done** — the container starts automatically.

### A-6: Verify

Open in browser:
- Read-only view: `http://YOUR-NAS-IP:3000/view`
- Admin panel: `http://YOUR-NAS-IP:3000/admin`

---

## Option B: Build Directly on NAS (requires internet access)

SSH into NAS and run:

```bash
cd /volume1/web/wardrobe
docker compose up -d
```

First build takes about 5–10 minutes.

---

## Updating

### Frontend files only (no image rebuild needed)

Replace files via File Station, then refresh the browser:

```
/volume1/web/wardrobe/public/shared/style.css
/volume1/web/wardrobe/public/shared/utils.js
/volume1/web/wardrobe/public/admin/index.html
/volume1/web/wardrobe/public/admin/admin.js
/volume1/web/wardrobe/public/view/index.html
/volume1/web/wardrobe/public/view/view.js
```

### Backend server.js (image rebuild required)

1. Update `server.js` locally, then repeat A-2 through A-5
2. Stop and delete the old container, recreate with the new image (keep same volume config)

### Data Safety

Rebuilding the image or deleting the container **will not affect your data**. All data lives in the volume-mounted directories:

```
/volume1/web/wardrobe/data/      ← clothing and member records
/volume1/web/wardrobe/photos/    ← photo files
```

---

## Useful Docker Commands

```bash
docker ps | grep wardrobe       # check container status
docker logs -f wardrobe         # view logs
docker restart wardrobe         # restart container
docker stop wardrobe            # stop
docker start wardrobe           # start
```

---

# 📋 Manual Deployment (without Docker)

## Requirements

| Software | Version | Install via |
|---|---|---|
| Node.js | 18.x or higher | Package Center → SynoCommunity |
| Web Station | 3.x | Package Center |

## Steps

### 1. Upload project files

Upload the project folder to `/volume1/web/wardrobe/`

### 2. Edit config.json

```json
{
  "port": 3000,
  "adminPassword": "your-password",
  "sessionSecret": "random-long-string",
  "photoBaseDir": "/volume1/web/wardrobe/photos"
}
```

> For manual deployment, `photoBaseDir` should be the actual NAS path.

### 3. Install dependencies

```bash
cd /volume1/web/wardrobe
npm install
```

### 4. Test run

```bash
node server.js
```

You should see:
```
✅ Server started
   Read-only: http://localhost:3000/view
   Admin: http://localhost:3000/admin
```

### 5. Auto-start on boot

Create `/volume1/web/wardrobe/start.sh`:

```bash
#!/bin/bash
cd /volume1/web/wardrobe
/usr/local/bin/node server.js >> /volume1/web/wardrobe/wardrobe.log 2>&1 &
echo $! > /volume1/web/wardrobe/wardrobe.pid
```

```bash
chmod +x /volume1/web/wardrobe/start.sh
```

In DSM: Control Panel → Task Scheduler → Create Triggered Task (Boot-up) → run command:
```
bash /volume1/web/wardrobe/start.sh
```

---

## Access URLs

| Purpose | URL |
|---|---|
| Read-only view | `http://YOUR-NAS-IP:3000/view` |
| Admin panel | `http://YOUR-NAS-IP:3000/admin` |
