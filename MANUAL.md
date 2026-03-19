# 手动部署操作手册

> 不使用 Docker，直接用 Node.js 运行。
> 预计总用时：**30～45 分钟**

---

## 开始之前

**需要准备：**
- 群晖 NAS，已在套件中心安装 **Node.js v18** 和 **Web Station**
- 项目压缩包 `wardrobe-project.zip`
- NAS 的 IP 地址

**安装 Node.js（如未安装）：**
1. 套件中心 → 设置 → 套件来源 → 新增 `https://packages.synocommunity.com/`
2. 搜索 **Node.js v18** → 安装

---

## Step 1：解压并修改配置文件

1. 解压 `wardrobe-project.zip` 得到 `wardrobe` 文件夹
2. 用记事本打开 `config.json`，修改以下字段：

```json
{
  "port": 3000,
  "adminPassword": "你的管理密码",
  "sessionSecret": "随机长字符串",
  "photoBaseDir": "/volume1/web/wardrobe/photos"
}
```

> `photoBaseDir` 填 NAS 上的实际绝对路径。

---

## Step 2：上传文件到 NAS

打开群晖 **File Station**：

1. 在 `/volume1/web/` 下新建 `wardrobe` 文件夹
2. 进入该文件夹，上传 `wardrobe` 文件夹内的**所有文件**

最终结构：

```
/volume1/web/wardrobe/
├── server.js
├── package.json
├── config.json
├── data/
│   ├── wardrobe.json
│   └── members.json
├── photos/
└── public/
    ├── shared/
    ├── admin/
    └── view/
```

---

## Step 3：SSH 连接 NAS

**先开启 SSH：** 控制面板 → 终端机和 SNMP → 启动 SSH 功能

**Windows（PuTTY）：** 输入 NAS IP，端口 22，用 admin 账号登录

**Mac（终端）：**
```bash
ssh admin@192.168.1.100
```

---

## Step 4：安装依赖

```bash
cd /volume1/web/wardrobe
npm install
```

看到 `added XX packages` 即成功。

---

## Step 5：测试启动

```bash
node server.js
```

看到以下输出即正常：

```
✅ 衣橱管理系统已启动
   只读端: http://localhost:3000/view
   管理端: http://localhost:3000/admin
```

浏览器访问 `http://NAS的IP:3000/view` 验证，正常后按 `Ctrl+C` 停止。

---

## Step 6：配置开机自启

**创建启动脚本：**

```bash
cat > /volume1/web/wardrobe/start.sh << 'SCRIPT'
#!/bin/bash
cd /volume1/web/wardrobe
/usr/local/bin/node server.js >> /volume1/web/wardrobe/wardrobe.log 2>&1 &
echo $! > /volume1/web/wardrobe/wardrobe.pid
echo "衣橱系统已启动，PID: $!"
SCRIPT
chmod +x /volume1/web/wardrobe/start.sh
```

**创建停止脚本：**

```bash
cat > /volume1/web/wardrobe/stop.sh << 'SCRIPT'
#!/bin/bash
PID_FILE=/volume1/web/wardrobe/wardrobe.pid
if [ -f "$PID_FILE" ]; then
  kill $(cat "$PID_FILE") && rm "$PID_FILE"
  echo "衣橱系统已停止"
else
  echo "未找到 PID 文件"
fi
SCRIPT
chmod +x /volume1/web/wardrobe/stop.sh
```

**配置任务计划：**

1. 控制面板 → 任务计划 → 新增 → 触发的任务 → 用户定义的脚本
2. 填写：

| 项目 | 值 |
|---|---|
| 任务名称 | `wardrobe 衣橱系统` |
| 用户账号 | `root` |
| 事件 | `开机` |

3. 运行命令填入：`bash /volume1/web/wardrobe/start.sh`
4. 点击确定保存

---

## Step 7：验证完成

```bash
bash /volume1/web/wardrobe/start.sh
```

浏览器访问：
- 只读端：`http://NAS的IP:3000/view`
- 管理端：`http://NAS的IP:3000/admin`

---

## 日常管理

```bash
# 启动
bash /volume1/web/wardrobe/start.sh

# 停止
bash /volume1/web/wardrobe/stop.sh

# 查看日志
tail -f /volume1/web/wardrobe/wardrobe.log
```

---

## 常见问题

| 问题 | 解决方法 |
|---|---|
| 页面无法访问 | 执行 `ps aux \| grep node` 确认进程在运行 |
| 密码错误 | 检查 `config.json` 中 `adminPassword`，区分大小写 |
| 图片上传不显示 | 检查 `photoBaseDir` 是否为正确绝对路径 |
| 重启后未自启 | 任务计划中确认任务存在且已启用 |
