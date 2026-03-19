# Docker 部署操作手册 · Docker Deployment Manual

[中文](#中文) | [English](#english)

---

<a name="中文"></a>
# 中文

> 本手册面向不熟悉命令行的用户，所有操作均通过图形界面完成。
> 预计总用时：**30～45 分钟**（首次操作）

---

## 开始之前

**需要准备：**
- 一台 Windows 或 Mac 电脑，已安装 Docker Desktop
- 一台群晖 NAS，已安装 Container Manager
- 项目压缩包 `wardrobe-project.zip`
- NAS 的 IP 地址（如 `192.168.1.100`）

**Docker Desktop 下载：** https://www.docker.com/products/docker-desktop/

---

# 第一阶段：在电脑上操作

---

## Step 1：解压并修改配置文件

1. 解压 `wardrobe-project.zip`，得到 `wardrobe` 文件夹
2. 用记事本（Windows）或文本编辑（Mac）打开 `wardrobe/config.json`

```json
{
  "port": 3000,
  "adminPassword": "修改为你的密码",
  "sessionSecret": "修改为一串随机字符",
  "photoBaseDir": "/app/photos"
}
```

- `adminPassword`：设置管理端登录密码，**请牢记**
- `sessionSecret`：随机填写一串字符，越长越好
- `photoBaseDir`：**保持 `/app/photos` 不变**

保存文件。

---

## Step 2：构建 Docker 镜像

**Windows：**

1. 打开 `wardrobe` 文件夹
2. 按住 `Shift` + 右键空白处 → 「在此处打开 PowerShell 窗口」
3. 输入以下命令，按回车：

```
docker build --platform linux/amd64 -t wardrobe-manager:latest .
```

注意最后有个英文句号，不要漏掉。

**Mac：**

1. 打开终端
2. 把 `wardrobe` 文件夹拖入终端（自动填入路径），前面加 `cd `，按回车
3. 执行：

```bash
docker build --platform linux/amd64 -t wardrobe-manager:latest .
```

等待约 3～5 分钟，看到 `writing image sha256:...` 即构建完成。

---

## Step 3：导出镜像为 tar 文件

```
docker save -o wardrobe.tar wardrobe-manager:latest
```

约 1～2 分钟后，`wardrobe` 文件夹里出现 `wardrobe.tar`（约 60～80MB）。

---

# 第二阶段：在群晖 NAS 上操作

---

## Step 4：在 NAS 上创建目录结构

打开群晖管理界面 → **File Station**，在 `/volume1/web/` 下创建以下结构：

```
/volume1/web/wardrobe/
├── data/
└── photos/
```

然后上传以下文件：

| 本地文件 | 上传到 NAS |
|---|---|
| `wardrobe.tar` | `/volume1/web/wardrobe/` |
| `config.json` | `/volume1/web/wardrobe/` |
| `data/wardrobe.json` | `/volume1/web/wardrobe/data/` |
| `data/members.json` | `/volume1/web/wardrobe/data/` |
| `public/`（整个文件夹）| `/volume1/web/wardrobe/` |

---

## Step 5：导入镜像

1. 打开 **Container Manager** → 左侧「**映像**」
2. 右上角「**新增**」→「**从文件新增**」
3. 选择 `/volume1/web/wardrobe/wardrobe.tar`
4. 等待约 1～2 分钟，映像列表出现 `wardrobe-manager:latest` 即成功

---

## Step 6：创建容器

1. 找到 `wardrobe-manager:latest`，点「**执行**」
2. 按以下配置填写：

**【常规】**
- 容器名称：`wardrobe`
- 勾选「**自动重新启动**」

**【端口】**

| 本地端口 | 容器端口 | 类型 |
|---|---|---|
| `3000` | `3000` | TCP |

**【存储空间】** 添加 4 条挂载：

| 本地路径 | 容器路径 | 权限 |
|---|---|---|
| `/volume1/web/wardrobe/data` | `/app/data` | 读写 |
| `/volume1/web/wardrobe/photos` | `/app/photos` | 读写 |
| `/volume1/web/wardrobe/config.json` | `/app/config.json` | 只读 |
| `/volume1/web/wardrobe/public` | `/app/public` | 读写 |

> ⚠️ 第三条是**文件挂载**（不是文件夹），选择 `config.json` 文件本身。
>
> 💡 挂载 `public/` 目录后，更新前端文件只需替换 NAS 上对应文件，刷新浏览器即生效，无需重建镜像。

**【环境变量】**

| 变量名 | 值 |
|---|---|
| `TZ` | `Asia/Shanghai` |

点「**完成**」，容器自动启动。

---

## Step 7：验证访问

浏览器访问（将 IP 替换为您的 NAS 地址）：

- 只读端：`http://192.168.1.100:3000/view`
- 管理端：`http://192.168.1.100:3000/admin`

输入 Step 1 设置的密码，登录成功即部署完成 🎉

---

# 日常使用

## 更新前端文件（无需重建镜像）

直接用 File Station 替换对应文件，**刷新浏览器**即生效：

```
/volume1/web/wardrobe/public/shared/style.css
/volume1/web/wardrobe/public/shared/utils.js
/volume1/web/wardrobe/public/admin/index.html
/volume1/web/wardrobe/public/admin/admin.js
/volume1/web/wardrobe/public/view/index.html
/volume1/web/wardrobe/public/view/view.js
```

## 重建镜像（更新 server.js 时需要）

1. 电脑上重新执行 Step 2～3，生成新的 `wardrobe.tar`
2. 上传新 `wardrobe.tar` 到 NAS
3. Container Manager → 映像 → 从文件新增 → 导入新 tar
4. 容器列表 → 停止并删除旧容器
5. 用新镜像重新创建容器（挂载配置不变）

> ✅ 重建镜像**不会丢失任何数据**，数据保存在 volume 挂载目录中。

## 修改管理密码

1. File Station 打开 `/volume1/web/wardrobe/config.json`
2. 修改 `adminPassword` 字段，保存
3. Container Manager → 容器 → `wardrobe` → 重新启动

---

# 常见问题

| 问题 | 解决方法 |
|---|---|
| 页面无法访问 | Container Manager 确认容器状态为绿色「正在运行」 |
| 密码错误 | 检查 `config.json` 中 `adminPassword` 是否与输入一致（区分大小写）|
| 图片上传后不显示 | 确认 `config.json` 中 `photoBaseDir` 为 `/app/photos` |
| 修改前端文件不生效 | 浏览器按 `Ctrl+Shift+R` 强制刷新（Mac 用 `Command+Shift+R`）|
| NAS 重启后容器没启动 | Container Manager → 容器 → `wardrobe` → 确认「自动重新启动」已勾选 |

---

<a name="english"></a>
# English

> This guide is written for users unfamiliar with the command line. All steps use graphical interfaces.
> Estimated time: **30–45 minutes** (first-time setup)

---

## Before You Begin

**You will need:**
- A Windows or Mac computer with Docker Desktop installed
- A Synology NAS with Container Manager installed
- The project archive `wardrobe-project.zip`
- Your NAS IP address (e.g. `192.168.1.100`)

**Download Docker Desktop:** https://www.docker.com/products/docker-desktop/

---

# Phase 1: On Your Computer

---

## Step 1: Extract and Edit the Config File

1. Extract `wardrobe-project.zip` to get a `wardrobe` folder
2. Open `wardrobe/config.json` with Notepad (Windows) or TextEdit (Mac)

```json
{
  "port": 3000,
  "adminPassword": "set-your-password-here",
  "sessionSecret": "replace-with-a-random-string",
  "photoBaseDir": "/app/photos"
}
```

- `adminPassword`: your admin login password — **remember this**
- `sessionSecret`: any random string, the longer the better
- `photoBaseDir`: **leave this as `/app/photos`**

Save the file.

---

## Step 2: Build the Docker Image

**Windows:**

1. Open the `wardrobe` folder
2. Hold `Shift` + right-click on an empty area → **Open PowerShell window here**
3. Run:

```
docker build --platform linux/amd64 -t wardrobe-manager:latest .
```

Don't forget the `.` at the end.

**Mac:**

1. Open Terminal
2. Type `cd ` (with a space), drag the `wardrobe` folder into Terminal, press Enter
3. Run:

```bash
docker build --platform linux/amd64 -t wardrobe-manager:latest .
```

Wait about 3–5 minutes. When you see `writing image sha256:...` the build is complete.

---

## Step 3: Export the Image as a tar File

```
docker save -o wardrobe.tar wardrobe-manager:latest
```

After about 1–2 minutes, `wardrobe.tar` (~60–80MB) will appear in the `wardrobe` folder.

---

# Phase 2: On Your Synology NAS

---

## Step 4: Create the Directory Structure on NAS

Open the Synology web interface → **File Station**. Under `/volume1/web/`, create:

```
/volume1/web/wardrobe/
├── data/
└── photos/
```

Then upload the following files:

| Local file | Upload to NAS |
|---|---|
| `wardrobe.tar` | `/volume1/web/wardrobe/` |
| `config.json` | `/volume1/web/wardrobe/` |
| `data/wardrobe.json` | `/volume1/web/wardrobe/data/` |
| `data/members.json` | `/volume1/web/wardrobe/data/` |
| `public/` (entire folder) | `/volume1/web/wardrobe/` |

---

## Step 5: Import the Image

1. Open **Container Manager** → **Image** (left sidebar)
2. Top-right: **Add** → **Add from File**
3. Select `/volume1/web/wardrobe/wardrobe.tar`
4. Wait about 1–2 minutes — `wardrobe-manager:latest` will appear in the list

---

## Step 6: Create the Container

1. Find `wardrobe-manager:latest` and click **Run**
2. Fill in the settings:

**[General]**
- Container name: `wardrobe`
- Enable auto-restart ✅

**[Port]**

| Local Port | Container Port | Type |
|---|---|---|
| `3000` | `3000` | TCP |

**[Volume]** — add 4 entries:

| Local Path | Container Path | Mode |
|---|---|---|
| `/volume1/web/wardrobe/data` | `/app/data` | Read/Write |
| `/volume1/web/wardrobe/photos` | `/app/photos` | Read/Write |
| `/volume1/web/wardrobe/config.json` | `/app/config.json` | Read-only |
| `/volume1/web/wardrobe/public` | `/app/public` | Read/Write |

> ⚠️ The third entry is a **file mount** (not a folder) — select the `config.json` file itself.
>
> 💡 Mounting `public/` means you can update frontend files by replacing them on the NAS — no image rebuild needed, just refresh the browser.

**[Environment Variables]**

| Name | Value |
|---|---|
| `TZ` | `Asia/Shanghai` |

Click **Done** — the container starts automatically.

---

## Step 7: Verify

Open in your browser (replace IP with your NAS address):

- Read-only view: `http://192.168.1.100:3000/view`
- Admin panel: `http://192.168.1.100:3000/admin`

Log in with the password you set in Step 1. If it works, you're done 🎉

---

# Day-to-Day Usage

## Updating Frontend Files (no image rebuild needed)

Replace files via File Station, then **hard-refresh the browser** (`Ctrl+Shift+R` / `Cmd+Shift+R`):

```
/volume1/web/wardrobe/public/shared/style.css
/volume1/web/wardrobe/public/shared/utils.js
/volume1/web/wardrobe/public/admin/index.html
/volume1/web/wardrobe/public/admin/admin.js
/volume1/web/wardrobe/public/view/index.html
/volume1/web/wardrobe/public/view/view.js
```

## Rebuilding the Image (when server.js changes)

1. Repeat Steps 2–3 on your computer to generate a new `wardrobe.tar`
2. Upload the new `wardrobe.tar` to the NAS
3. Container Manager → Image → Add from File → import new tar
4. Container list → stop and delete the old container
5. Recreate the container using the new image (same volume config)

> ✅ Rebuilding the image **will not affect your data**. All data is stored in volume-mounted directories.

## Changing the Admin Password

1. Open `/volume1/web/wardrobe/config.json` in File Station
2. Edit the `adminPassword` field and save
3. Container Manager → Containers → `wardrobe` → Restart

---

# Troubleshooting

| Issue | Solution |
|---|---|
| Can't access the page | Check Container Manager — container status should show green "Running" |
| Wrong password | Check `adminPassword` in `config.json` — it's case-sensitive |
| Photos not showing | Confirm `photoBaseDir` in `config.json` is `/app/photos` |
| Frontend changes not taking effect | Hard-refresh: `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`) |
| Container didn't restart after NAS reboot | Container Manager → Containers → `wardrobe` → confirm auto-restart is enabled |
