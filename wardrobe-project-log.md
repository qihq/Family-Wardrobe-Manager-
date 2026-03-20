# 家庭衣橱管理系统 — 完整项目开发记录

> 平台：群晖 NAS · Docker · Node.js + 纯 HTML/JS · JSON 存储
> 时间：2026年3月19日

---

## 一、项目起源与需求分析

### 原始需求
家里有两个儿子，购置了大量衣服、裤子、鞋子，家里阿姨不清楚有哪些衣物可用。需要一个简单的衣橱管理系统，方便主人录入管理、阿姨只读查阅。

### 核心功能需求
- 支持拍照或上传图片，自动识别衣物类型（可人工修改）
- 可手动编辑：衣物名称、类型、尺码、颜色、品牌、适用人员、备注、状态
- 适用人员支持自定义管理（增删改），初始设「大儿子」「小儿子」
- 图片按规则分类保存：`/photos/{适用人员}/{衣物类型}/文件名.jpg`
- 双界面：管理端（需密码登录）+ 只读端（阿姨使用）
- 支持按使用人、类型、状态筛选和关键词搜索

---

## 二、技术选型讨论

### 为什么不用纯 HTML+JS？
浏览器安全限制，纯静态 HTML+JS 无法在服务器端写入文件或修改 JSON：

| 能力 | 纯静态 HTML+JS | 需要后端 |
|------|--------------|---------|
| 展示图片、筛选浏览 | ✅ | ✅ |
| 上传图片到 NAS | ❌ | ✅ |
| 保存数据到 JSON | ❌ | ✅ |
| 离线图像识别 | ✅ | ✅ |
| 双界面权限控制 | ⚠️ 很弱 | ✅ |

### 最终技术栈
- **后端**：Node.js（极简 express）
- **数据存储**：JSON 文件（不使用任何数据库）
- **前端**：纯 HTML + CSS + JavaScript，无框架
- **图像识别**：浏览器端 TensorFlow.js + MobileNet（完全离线）
- **图片存储**：NAS 本地文件夹
- **界面语言**：中文

---

## 三、初版 Claude 提示词

你是一名全栈开发工程师，我需要你帮我开发一个运行在群晖 NAS Web Station + Node.js 上的家庭衣橱管理网站。

技术栈要求（不可更改）：

后端：Node.js（使用内置 http 模块或极简 express）

数据存储：JSON 文件（不使用任何数据库，包括 SQLite）

前端：纯 HTML + CSS + JavaScript，不使用任何前端框架

图像识别：完全离线，使用浏览器端 TensorFlow.js + MobileNet 模型

图片存储：/photos/{适用人员}/{衣物类型}/文件名.jpg

界面语言：中文

核心功能需求：

衣物录入主流程（重要）：

拍照或上传图片后，首先展示一排大按钮供用户点击选择衣物类型（上衣/裤子/鞋子/外套/其他）

同时显示 TensorFlow.js + MobileNet 离线 AI 识别建议（标注「AI 参考」）

手动选择优先级高于 AI 识别结果

适用人员管理：可自定义增删改，初始设「大儿子」「小儿子」

双界面设计：

管理端 /admin：需密码登录，支持完整增删改查

只读端 /view：无需登录，阿姨专用，卡片式展示，字体适当放大

交付要求：

完整项目目录结构

群晖 NAS Web Station 部署步骤

移动端和桌面端响应式适配

请先输出项目架构，确认后再逐模块输出代码

text

---

## 四、响应式布局方案

### 三档适配设计

**桌面端（≥1024px）**
- 左侧固定侧边栏 220px，包含 Logo、导航菜单、退出按钮
- 右侧内容区 calc(100% - 220px)
- 衣物列表用表格视图
- 新增面板两栏：左图片（40%）+ 右表单（60%）
- 筛选栏横向一行排开

**平板端（768px~1023px）**
- 侧边栏收窄为 64px 图标模式，hover 展开到 220px
- 衣物卡片网格：3 列

**手机端（≤767px）**
- 顶部 Logo + 新增按钮 + 汉堡菜单
- 汉堡菜单点击弹出全屏抽屉（左侧滑入）
- 新增衣物分三步：① 拍照上传 → ② 选择类型 → ③ 填写信息
- View 端底部固定 Tab 栏切换人员
- 点击卡片弹出 Bottom Sheet 详情

### 新增交互组件
- **Bottom Sheet**：底部滑入面板，用于筛选和详情
- **抽屉菜单**：手机端管理端导航
- **分步录入进度条**：三步骤圆点进度指示

---

## 五、第一轮迭代需求（功能完善）

### 需求清单
1. **季节筛选 Bug**：单独选「春」时，seasons 含「四季」的衣物不显示
2. **Admin ↔ View 互相跳转入口**
3. **Admin 登录态持久化**（localStorage，刷新不需重新登录）
4. **新增 favorite（收藏）属性**，筛选、卡片、统计全适配
5. **View 端尺寸显示强化**（大号字体 + 品牌色 badge）
6. **Admin 端点击图片或空白显示衣物详情**（与 view 端详情一致，含编辑/删除按钮）
7. **统计页面点击数字显示对应衣物列表**，可点开详情

### 数据兼容性要求
- 系统已有真实数据在 wardrobe.json，任何改动不得导致现有数据丢失
- 新增字段在旧数据中不存在时，默认为 false 或空值
- server.js 不得有重置或清空 JSON 数据的逻辑

### 发给 Claude 的提示词

以下是对现有家庭衣橱管理系统的迭代需求。请在不破坏现有 wardrobe.json 数据结构的前提下进行升级，所有新字段对旧数据向后兼容。

数据兼容性要求（最高优先级）：

新增字段（如 favorite）在旧数据中不存在时，默认为 false 或空值

server.js 不得有重置或清空 JSON 数据的逻辑

Bug 修复：

季节筛选逻辑：seasons 包含「四季」的衣物在任意单季筛选下都应显示

新增功能：
2. Admin ↔ View 互相跳转入口
3. Admin 登录态持久化（localStorage）
4. favorite 收藏属性（全端适配）
5. View 端尺寸显示强化
6. Admin 端点击衣物显示详情（含编辑/删除）
7. 统计数字点击显示对应衣物列表

交付要求：

先列出所有需要修改的文件名

逐文件输出完整代码

新字段全部给默认值兜底

text

---

## 六、Bug 修复：「四季季」显示问题

### 问题原因
`renderStats` 函数中季节 label 拼接逻辑：

```javascript
// 错误写法
...U.SEASONS.map(s => ({ num: bySeason[s] || 0, label: s + '季', filter: { season: s } }))
// 「四季」+ 「季」= 「四季季」
修复方案
javascript
// 修复后
...U.SEASONS.map(s => ({ num: bySeason[s] || 0, label: s.endsWith('季') ? s : s + '季', filter: { season: s } }))
根本原因
Docker 部署时未映射对应 JS 文件到宿主机，导致修改未生效。

七、Docker 部署文件映射问题
问题
Docker volume 映射漏掉了部分 JS 文件，宿主机修改不生效。

解决方案
推荐：映射整个项目目录

text
volumes:
  - /your/nas/path/wardrobe:/app
或补充单个文件映射

text
volumes:
  - /your/nas/path/admin.js:/app/admin.js
改完后重启容器

bash
docker-compose down && docker-compose up -d
八、第二轮迭代需求（性能优化）
需求分析
图片加载优化
现状：列表加载完整原图（2.5MB），衣物多了会很卡

方案：上传时生成缩略图，列表用缩略图，详情页用原图

上传图片压缩
现状：手机拍照约 2.5MB，存储和传输浪费

建议：展示图压缩到 ~200KB，缩略图 ~40KB

用途	建议尺寸	质量	预期大小
缩略图（列表）	300px	80%	~30KB
展示图（详情）	1200px 长边	85%	~200KB
列表排序
Admin 端衣物列表支持点击列头排序

桌面表格列头 + 手机端排序胶囊

为什么选择纯前端方案（不用 sharp）
不需要重建 Docker 镜像

不需要进容器安装新包

前端 canvas 压缩耗时约 0.3~0.5 秒，体验无影响

压缩后上传量从 2.5MB 降到 ~240KB，上传反而更快

最终发给 Claude 的提示词
text
对现有家庭衣橱管理系统进行以下三项优化，不得影响现有 wardrobe.json 数据，所有改动向后兼容。不得引入任何新的 npm 包，所有实现使用纯 Node.js 原生 + 浏览器原生 API。

优化一：前端压缩图片 + 生成缩略图，后端双文件存储

前端压缩逻辑（封装到 utils.js）：
- 新增 U.compressImage(file, maxEdge, quality)，使用 canvas 压缩
- 同时生成展示图（maxEdge=1200, quality=0.85）和缩略图（maxEdge=400, quality=0.80）
- FormData 同时上传 photo 和 thumb 两个字段
- 压缩期间显示「正在优化图片…」提示，完成后自动提交
- 适用于所有上传入口：新增桌面版、新增手机分步版、编辑弹窗

后端（server.js，纯 Node.js 原生）：
- 接收 photo 和 thumb 两个文件字段
- 展示图：/photos/{人员}/{类型}/文件名.jpg
- 缩略图：/photos/{人员}/{类型}/thumbs/文件名.jpg
- wardrobe.json 新增 thumbPath 字段，旧数据无此字段时 fallback photoPath

优化二：列表改用缩略图，详情用原图
- 列表/卡片加载 thumbPath，fallback photoPath
- 详情页始终加载原图 photoPath
- 所有列表图片加 loading="lazy"

优化三：Admin 端列排序
- 桌面列头三态：升序↑ → 降序↓ → 取消
- 手机端横向滚动排序胶囊
- 前端本地排序，不重新请求接口

交付要求：
- 先列文件清单，确认后逐文件输出完整代码
- 不引入任何新 npm 依赖
九、第二轮迭代文件改动清单
文件	改动内容
server.js	接收 photo + thumb 双字段，存双路径，thumbPath 写入 wardrobe.json
public/shared/utils.js	新增 compressImage()，renderClothesCard 用 thumbPath fallback，renderDetailContent 用 photoPath
public/shared/style.css	排序列头高亮样式，手机端排序胶囊样式，压缩提示样式
public/admin/admin.js	双图上传逻辑（三处入口）、列排序（桌面三态 + 手机胶囊）
public/admin/index.html	新增 compress-status 占位元素、手机排序条、列头 sortable-th
public/view/view.js	卡片用 thumbPath fallback，季节标签修复（顺带修掉四季季 bug）
共 6 个文件，HTML 结构由 JS 动态注入，data/*.json 数据向后兼容。

十、关键实现细节
utils.js — compressImage
javascript
U.compressImage = function(file, maxEdge, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      if (Math.max(w, h) > maxEdge) {
        if (w > h) { h = Math.round(h * maxEdge / w); w = maxEdge; }
        else { w = Math.round(w * maxEdge / h); h = maxEdge; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    img.src = url;
  });
};
server.js — 双字段接收
javascript
// destination 根据 fieldname 判断存储目录
destination: (req, file, cb) => {
  const dir = file.fieldname === 'thumb'
    ? path.join(uploadDir, 'thumbs')
    : uploadDir;
  fs.mkdirSync(dir, { recursive: true });
  cb(null, dir);
}
季节筛选 — 四季兼容逻辑
javascript
// server.js 过滤
if (req.query.season) {
  const s = req.query.season;
  list = list.filter(c =>
    c.seasons && (c.seasons.includes(s) || c.seasons.includes('四季'))
  );
}
十一、部署说明
群晖 Docker 部署
群晖套件中心安装 Docker

上传项目文件到 NAS 指定目录

docker-compose.yml 配置 volume 映射整个项目目录：

text
volumes:
  - /your/nas/path/wardrobe:/app
  - /your/nas/path/wardrobe/data:/app/data
  - /your/nas/path/wardrobe/photos:/app/photos
启动容器：docker-compose up -d

文件更新流程
修改宿主机文件

重启容器：docker-compose restart

刷新浏览器（注意清除缓存）

数据备份
bash
cp /your/nas/path/wardrobe/data/wardrobe.json \
   /your/nas/path/wardrobe/data/wardrobe.json.bak
十二、待办 / 未来可迭代方向
 批量为现有旧图片生成缩略图的一次性迁移脚本

 批量导入衣物功能

 季节标签筛选（按春/夏/秋/冬/四季）

 衣物统计图表（按类型/人员/季节）

 导出功能（CSV / PDF）