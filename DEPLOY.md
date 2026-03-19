# 部署指南

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

安装后启动，确认任务栏出现 🐳 图标。

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

在映像列表找到 `wardrobe-manager:latest`，点「**执行**」，按以下配置填写：

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

> 💡 挂载 `public/` 目录后，以后更新前端文件（HTML/CSS/JS）只需替换 NAS 上的文件，刷新浏览器即生效，无需重建镜像。

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

直接用 File Station 替换 NAS 上对应文件，刷新浏览器即生效：

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
2. 停止并删除旧容器，用新镜像重新创建（volume 配置不变，数据不丢失）

### 数据安全说明

重建镜像、删除容器**不会影响任何数据**，数据全部存在 volume 挂载目录中：

```
/volume1/web/wardrobe/data/      ← 衣物和人员数据
/volume1/web/wardrobe/photos/    ← 图片文件
```

---

## Docker 常用命令

```bash
# 查看容器状态
docker ps | grep wardrobe

# 查看日志
docker logs -f wardrobe

# 重启容器（修改 config.json 后需重启）
docker restart wardrobe

# 停止 / 启动
docker stop wardrobe
docker start wardrobe
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

> 手动部署时 `photoBaseDir` 填 NAS 实际路径。

### 3. 安装依赖

```bash
cd /volume1/web/wardrobe
npm install
```

### 4. 测试启动

```bash
node server.js
```

看到 `✅ 衣橱管理系统已启动` 即正常，浏览器验证后 Ctrl+C 停止。

### 5. 配置开机自启

创建启动脚本 `/volume1/web/wardrobe/start.sh`：

```bash
#!/bin/bash
cd /volume1/web/wardrobe
/usr/local/bin/node server.js >> /volume1/web/wardrobe/wardrobe.log 2>&1 &
echo $! > /volume1/web/wardrobe/wardrobe.pid
```

```bash
chmod +x /volume1/web/wardrobe/start.sh
```

DSM → 控制面板 → 任务计划 → 新增触发任务：
- 事件：开机
- 用户：root
- 命令：`bash /volume1/web/wardrobe/start.sh`

---

## 访问地址

| 用途 | 地址 |
|---|---|
| 只读端（阿姨用）| `http://NAS的IP:3000/view` |
| 管理端 | `http://NAS的IP:3000/admin` |

> 建议将只读端地址制成二维码贴在衣橱旁，方便扫码查看。
