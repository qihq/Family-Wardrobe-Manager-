# 用 AI 做项目全程记录：家庭衣橱管理系统
# Building a Project with AI: Family Wardrobe Management System

> 作者备注 / Author's Note：本文记录了从零开始，通过与 AI 对话完成一个真实项目的全过程。
> This document records the entire process of building a real project from scratch through AI conversation.

---

## 一、项目背景 / Project Background

**中文：**
家里有两个儿子，购置了大量衣服、裤子、鞋子，家里阿姨不清楚有哪些衣物可用。需要一个简单的衣橱管理系统，方便主人录入管理、阿姨只读查阅。系统部署在家里的群晖 NAS 上，局域网内使用。

**English：**
With two sons at home and a large collection of clothes, pants, and shoes, the housekeeper had no way to know what was available. The goal was to build a simple wardrobe management system — an admin interface for the owner to manage items, and a read-only interface for the housekeeper. The system runs on a Synology NAS at home, used only on the local network.

---

## 二、技术选型讨论 / Tech Stack Discussion

**中文：**
最初希望用纯 HTML+JS 实现，AI 解释了浏览器安全限制后，确定了最终方案。

**English：**
The initial idea was to use pure HTML+JS. After AI explained browser security limitations, the final stack was determined.

| 能力 / Capability | 纯静态 HTML+JS / Pure Static | 需要后端 / Needs Backend |
|---|---|---|
| 展示图片、筛选浏览 / Display & filter | ✅ | ✅ |
| 上传图片到 NAS / Upload to NAS | ❌ | ✅ |
| 保存数据到文件 / Save data to file | ❌ | ✅ |
| 离线图像识别 / Offline image recognition | ✅ | ✅ |
| 双界面权限控制 / Dual interface auth | ⚠️ 很弱 / Weak | ✅ |

**最终技术栈 / Final Stack：**
- 后端 / Backend：Node.js + Express（极简 / minimal）
- 数据存储 / Storage：JSON 文件（无数据库 / no database）
- 前端 / Frontend：纯 HTML + CSS + JavaScript（无框架 / no framework）
- 图像识别 / Image recognition：TensorFlow.js + MobileNet（完全离线 / fully offline）
- 图片存储 / Photo storage：NAS 本地文件夹 / local NAS folder
- 部署 / Deployment：群晖 Docker / Synology Docker

---

## 三、初版需求提示词 / Initial Prompt to Claude

**中文说明：** 以下是发给 Claude 的完整提示词，产品经理视角整理需求。
**English note:** The following is the complete prompt sent to Claude, organized from a product manager's perspective.

```
你是一名全栈开发工程师，我需要你帮我开发一个运行在群晖 NAS Web Station + Node.js
上的家庭衣橱管理网站。

You are a full-stack engineer. Help me build a family wardrobe management website
running on Synology NAS Web Station + Node.js.

技术栈要求（不可更改）/ Tech stack (non-negotiable):
- 后端 / Backend: Node.js + Express
- 数据存储 / Storage: JSON files (no database)
- 前端 / Frontend: Pure HTML + CSS + JavaScript, no frameworks
- 图像识别 / Image recognition: TensorFlow.js + MobileNet, fully offline
- 图片路径 / Photo path: /photos/{member}/{type}/filename.jpg
- 界面语言 / Language: 中文 Chinese

核心功能 / Core features:

1. 衣物录入 / Clothing entry:
   - 拍照上传后，先展示大按钮选类型（主流程）
   - After photo upload, show large type-selection buttons (main flow)
   - AI 识别结果作为辅助参考 / AI recognition as reference only
   - 字段 / Fields: 名称 name、类型 type、尺码 size、颜色 color、
     品牌 brand、适用人员 member、备注 notes、状态 status

2. 适用人员管理 / Member management:
   - 可自定义增删改 / Customizable CRUD
   - 初始：大儿子、小儿子 / Default: Son1, Son2

3. 双界面 / Dual interface:
   - 管理端 /admin：密码登录，完整增删改查
   - Admin /admin: password login, full CRUD
   - 只读端 /view：无需登录，阿姨使用，卡片式展示
   - Read-only /view: no login, housekeeper use, card grid

4. 筛选搜索 / Filter & search:
   - 按人员、类型、状态、季节筛选
   - Filter by member, type, status, season
   - 关键词搜索 / Keyword search

请先输出项目架构，确认后再逐模块输出代码。
Output project architecture first, then code module by module after confirmation.
```

---

## 四、响应式布局方案 / Responsive Layout

**中文：** AI 提出了三档响应式设计方案。
**English:** AI proposed a three-tier responsive design.

### 桌面端 ≥1024px / Desktop

**中文：** 左侧固定侧边栏 220px，右侧内容区，衣物列表用表格，新增面板两栏布局。
**English:** Fixed left sidebar 220px, right content area, table view for clothes list, two-column add panel.

### 平板端 768px~1023px / Tablet

**中文：** 侧边栏收窄为图标模式（64px），hover 展开；卡片三列。
**English:** Sidebar collapsed to icon mode (64px), expands on hover; 3-column card grid.

### 手机端 ≤767px / Mobile

**中文：** 汉堡菜单 + 抽屉导航；新增衣物分三步录入；View 端底部 Tab 切换人员；详情用 Bottom Sheet。
**English:** Hamburger menu + drawer nav; 3-step add flow; bottom tab bar for member switching in view; Bottom Sheet for details.

---

## 五、第一轮迭代 / First Iteration

**中文：** 系统上线并导入真实数据后，发现以下问题和新需求。
**English:** After going live and importing real data, the following issues and new requirements were identified.

### 需求清单 / Requirements

| # | 需求 / Requirement | 说明 / Notes |
|---|---|---|
| 1 | 季节筛选 Bug | 选「春」时「四季」衣物不显示 / Items with "All Seasons" don't show when filtering "Spring" |
| 2 | Admin ↔ View 互跳 | 两端互相加入口 / Add navigation links between both interfaces |
| 3 | 登录态持久化 | localStorage 保存登录，刷新不重登 / Save login to localStorage |
| 4 | 收藏属性 favorite | 全端适配筛选和展示 / Full integration across filter and display |
| 5 | 尺寸显示强化 | View 端尺寸用大号 badge 突出 / Highlight size with large badge in view |
| 6 | Admin 点击显示详情 | 点图片或空白弹出详情面板 / Click photo or row to show detail panel |
| 7 | 统计点击跳衣物列表 | 点数字显示对应衣物 / Click stat number to show filtered clothes |

### 发给 Claude 的提示词 / Prompt sent to Claude

```
以下是对现有家庭衣橱管理系统的迭代需求。
The following are iteration requirements for the existing wardrobe system.

数据兼容性要求（最高优先级）/ Data compatibility (highest priority):
- 系统已有真实数据，任何改动不得导致数据丢失
- Real data exists; no changes should cause data loss
- 新字段旧数据中不存在时默认 false 或空值
- New fields default to false/empty when absent in old data
- server.js 不得有重置或清空数据的逻辑
- server.js must not contain any data reset logic

Bug 修复 / Bug fix:
1. 季节筛选：seasons 含「四季」的衣物在任意单季筛选下都应显示
   Season filter: items with "All Seasons" should show under any single-season filter

新增功能 / New features:
2. Admin ↔ View 互相跳转入口 / Navigation links between Admin and View
3. Admin 登录态持久化 / Admin login persistence via localStorage
4. favorite 收藏属性全端适配 / favorite property across all interfaces
5. View 端尺寸显示强化 / Enhanced size display in View
6. Admin 端点击衣物显示详情（含编辑/删除）
   Admin click-to-detail (with edit/delete buttons)
7. 统计数字点击显示对应衣物列表
   Stats number click shows filtered clothes list

交付要求 / Delivery:
- 先列文件清单，确认后逐文件输出完整代码
- List files first, then output complete code file by file
- 新字段全部给默认值兜底 / All new fields must have safe defaults
```

---

## 六、遇到的 Bug 及解决 / Bugs & Fixes

### Bug 1：「四季季」显示问题 / "四季季" display bug

**中文：** 统计页面「四季」显示成了「四季季」，原因是代码在所有季节名称后拼接了「季」字。
**English:** The stats page showed "四季季" (redundant character). The cause was code appending "季" to all season names including "四季" which already ends with "季".

**错误代码 / Bug code:**
```javascript
label: s + '季'  // 「四季」+「季」=「四季季」
```

**修复代码 / Fix:**
```javascript
label: s.endsWith('季') ? s : s + '季'
```

---

### Bug 2：Docker 文件映射缺失 / Missing Docker volume mapping

**中文：** 修改了宿主机的 JS 文件，但容器里跑的还是旧代码。原因是 docker-compose.yml 没有映射该文件。
**English:** Modified JS files on the host didn't take effect because the docker-compose.yml didn't map those files into the container.

**解决方案 / Solution:**
```yaml
# 推荐：映射整个项目目录 / Recommended: map entire project directory
volumes:
  - /your/nas/path/wardrobe:/app
```

```bash
# 重启容器 / Restart container
docker-compose down && docker-compose up -d
```

---

## 七、第二轮迭代：性能优化 / Second Iteration: Performance

**中文：** 随着衣物数量增加，图片加载变慢，需要优化。
**English:** As the number of items grew, image loading became slow and needed optimization.

### 问题分析 / Problem Analysis

| 问题 / Issue | 现状 / Current | 目标 / Target |
|---|---|---|
| 列表图片大小 / List image size | 原图 2.5MB / Original 2.5MB | 缩略图 ~40KB / Thumbnail ~40KB |
| 上传文件大小 / Upload size | 2.5MB | ~240KB（展示图+缩略图）|
| 列表排序 / List sorting | 不支持 / Not supported | 列头点击排序 / Click column header |

### 为什么选前端压缩方案 / Why Frontend Compression

**中文：** 不使用 sharp 等 npm 包，避免重建 Docker 镜像。用浏览器 canvas 在前端完成压缩，同时生成展示图和缩略图，通过 FormData 双字段上传。
**English:** Avoid rebuilding the Docker image by not using npm packages like sharp. Use browser canvas to compress images in the frontend, generate both display and thumbnail images, and upload both via FormData.

**压缩耗时 / Compression time:** ~0.3~0.5 秒（用户几乎感知不到 / barely noticeable）

**上传速度对比 / Upload speed comparison:**

| | 优化前 / Before | 优化后 / After |
|---|---|---|
| 上传大小 / Upload size | 2.5MB | ~240KB |
| 局域网传输 / LAN transfer | ~1-2秒 | ~0.1秒 |

### 发给 Claude 的提示词 / Prompt sent to Claude

```
对现有家庭衣橱管理系统进行以下三项优化。
Apply the following three optimizations to the existing wardrobe system.

约束条件 / Constraints:
- 不得影响现有 wardrobe.json 数据 / Must not affect existing wardrobe.json data
- 所有改动向后兼容 / All changes must be backward compatible
- 不得引入任何新 npm 包 / No new npm packages allowed
- 使用纯 Node.js 原生 + 浏览器原生 API
  Use pure Node.js native + browser native APIs only

优化一 / Optimization 1: 前端压缩 + 缩略图 / Frontend compression + thumbnail

前端 / Frontend (utils.js):
- 新增 U.compressImage(file, maxEdge, quality) 使用 canvas 压缩
- 生成展示图 (1200px, 0.85) 和缩略图 (400px, 0.80)
- FormData 同时上传 photo 和 thumb 两个字段
- 压缩期间显示「正在优化图片…」提示
- 适用所有上传入口（桌面新增、手机分步、编辑弹窗）

后端 / Backend (server.js, pure Node.js):
- 接收 photo 和 thumb 双字段
- 展示图路径：/photos/{member}/{type}/filename.jpg
- 缩略图路径：/photos/{member}/{type}/thumbs/filename.jpg
- wardrobe.json 新增 thumbPath 字段
- 旧数据无 thumbPath 时 fallback photoPath

优化二 / Optimization 2: 缩略图加载 / Thumbnail loading
- 列表/卡片加载 thumbPath，fallback photoPath
- 详情页始终加载原图 photoPath
- 所有列表图片加 loading="lazy"

优化三 / Optimization 3: 列排序 / Column sorting
- 桌面列头三态：升序↑ → 降序↓ → 取消
- 手机端横向滚动排序胶囊
- 前端本地排序，不重新请求接口

交付 / Delivery:
- 先列文件清单，确认后逐文件输出完整代码
- 不引入任何新 npm 依赖
```

### 第二轮迭代文件清单 / File List

| 文件 / File | 改动 / Changes |
|---|---|
| `server.js` | 双字段接收 + thumbPath 存储 |
| `public/shared/utils.js` | compressImage() + thumbPath fallback |
| `public/shared/style.css` | 排序样式 + 压缩提示样式 |
| `public/admin/admin.js` | 双图上传 + 列排序三态 + 手机胶囊 |
| `public/admin/index.html` | compress-status 占位 + 排序列头 |
| `public/view/view.js` | thumbPath fallback + 四季季 bug 修复 |

---

## 八、第三轮迭代：多选筛选 / Third Iteration: Multi-select Filter

**中文：** Admin 端和 View 端的筛选均为单选，需要升级为多选。
**English:** All filters in Admin and View were single-select and needed to be upgraded to multi-select.

### 筛选逻辑设计 / Filter Logic

**同维度 OR，跨维度 AND / Same-dimension OR, cross-dimension AND**

> 示例 / Example：选「大儿子 + 小儿子」+「裤子」
> → 显示（大儿子 OR 小儿子）AND 裤子的衣物
> → Shows items belonging to (Son1 OR Son2) AND of type Pants

未选任何选项的维度 = 不过滤该维度（显示全部）
Unselected dimensions = no filter applied (show all)

### 发给 Claude 的提示词 / Prompt sent to Claude

```
对现有家庭衣橱管理系统的筛选功能进行升级，将所有筛选维度从单选改为多选。
不得影响现有数据，不引入任何新 npm 包。

多选筛选逻辑 / Multi-select logic:
- 同维度 OR，跨维度 AND
- 未选任何选项的维度不过滤

前端改动 / Frontend:
- Admin 桌面：select 下拉改为胶囊多选组
- Admin 手机 Sheet：胶囊从单选改为多选
- View 端所有胶囊支持多选
- 手机底部人员 Tab 支持多选
- 所有端新增「重置」按钮，有激活项时显示红点

后端改动 / Backend (server.js):
- /api/clothes 支持逗号分隔多值参数
- 过滤逻辑改为 OR 匹配（同维度）
- 四季兼容逻辑保留

交付 / Delivery:
- 先列文件清单，确认后逐文件输出完整代码
```

### 第三轮迭代文件清单 / File List

| 文件 / File | 改动 / Changes |
|---|---|
| `server.js` | parseMultiParam() + OR 过滤逻辑 |
| `public/admin/admin.js` | 多选状态数组 + 胶囊渲染 + 重置 |
| `public/admin/index.html` | 筛选区 HTML 从 select 改为胶囊组 |
| `public/view/view.js` | 多选数组 + 人员 Tab 多选 + 重置 |
| `public/view/index.html` | 筛选栏结构调整 + 重置按钮位置 |

---

## 九、关键代码片段 / Key Code Snippets

### 前端图片压缩 / Frontend Image Compression

```javascript
// utils.js
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

U.prepareImages = async function(file) {
  const [display, thumb] = await Promise.all([
    U.compressImage(file, 1200, 0.85),
    U.compressImage(file, 400, 0.80)
  ]);
  return { display, thumb };
};
```

### 后端双字段接收 / Backend Dual Field Receive

```javascript
// server.js - multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'thumb'
      ? path.join(uploadDir, 'thumbs')
      : uploadDir;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    if (!req._fileBasename) {
      req._fileBasename = Date.now() + '-' + Math.random().toString(36).slice(2);
    }
    cb(null, req._fileBasename + '.jpg');
  }
});

const upload = multer({ storage });
app.post('/api/clothes', upload.fields([{name:'photo'},{name:'thumb'}]), ...);
```

### 季节筛选四季兼容 / Season Filter All-Seasons Compatibility

```javascript
// server.js
if (seasons.length) {
  list = list.filter(c =>
    c.seasons && (
      c.seasons.includes('四季') ||
      c.seasons.some(s => seasons.includes(s))
    )
  );
}
```

### 多选筛选参数构建 / Multi-select Filter Params

```javascript
// admin.js / view.js
function buildFilterParams() {
  const params = new URLSearchParams();
  if (filterMembers.length)  params.set('member',  filterMembers.join(','));
  if (filterTypes.length)    params.set('type',    filterTypes.join(','));
  if (filterSeasons.length)  params.set('season',  filterSeasons.join(','));
  if (filterStatuses.length) params.set('status',  filterStatuses.join(','));
  if (filterFav)             params.set('favorite','true');
  return params;
}
```

### 季节标签显示修复 / Season Label Fix

```javascript
// 修复前 / Before
label: s + '季'  // 「四季」→「四季季」

// 修复后 / After
label: s.endsWith('季') ? s : s + '季'
```

---

## 十、部署说明 / Deployment Notes

### 群晖 Docker 部署 / Synology Docker Setup

```yaml
# docker-compose.yml
version: '3'
services:
  wardrobe:
    image: node:18-alpine
    working_dir: /app
    command: node server.js
    ports:
      - "3000:3000"
    volumes:
      - /your/nas/path/wardrobe:/app        # 项目文件
      - /your/nas/path/wardrobe/data:/app/data    # JSON 数据
      - /your/nas/path/wardrobe/photos:/app/photos # 图片
    restart: unless-stopped
```

### 文件更新流程 / File Update Flow

1. 修改宿主机文件 / Modify files on host
2. 重启容器 / Restart container：`docker-compose restart`
3. 清除浏览器缓存刷新 / Clear browser cache and refresh

### 数据备份 / Data Backup

```bash
cp /your/nas/path/wardrobe/data/wardrobe.json \
   /your/nas/path/wardrobe/data/wardrobe.json.bak
```

---

## 十一、与 AI 协作方法论 / AI Collaboration Methodology

**中文总结：**

1. **分轮对话**：第一轮出架构，第二轮出代码，避免一次要太多
2. **约束先行**：把「不能做什么」写在提示词最前面（不引入新依赖、不破坏现有数据）
3. **文件清单确认**：让 AI 先列出要改哪些文件，确认后再要代码
4. **逐文件替换**：每替换一个文件就测试，出问题容易定位
5. **备份数据**：每次迭代前先备份 `wardrobe.json`
6. **截断续写**：输出被截断直接说「继续」
7. **问题拆解**：遇到 Bug 先描述现象，让 AI 定位原因再修复
8. **技术决策咨询**：不确定的技术方案（如 sharp vs canvas）先问 AI 利弊再决定

**English Summary:**

1. **Multi-round dialogue**: Architecture first, code second
2. **Lead with constraints**: State "what NOT to do" at the top of every prompt
3. **File list confirmation**: Ask AI to list files before writing any code
4. **Replace one file at a time**: Test after each replacement for easier debugging
5. **Backup data**: Always backup `wardrobe.json` before each iteration
6. **Handle truncation**: Just say "continue" when output gets cut off
7. **Bug isolation**: Describe the symptom first, let AI locate the cause before fixing
8. **Technical consultation**: Ask AI to explain trade-offs before making decisions

---

## 十二、已完成功能 / Completed Features

- ✅ 衣物录入（拍照/上传 + 手动选类型 + AI 辅助）/ Clothing entry
- ✅ 双界面（Admin 管理端 + View 只读端）/ Dual interface
- ✅ 三档响应式（桌面/平板/手机）/ 3-tier responsive design
- ✅ 多维度多选筛选（人员/类型/季节/状态/收藏）/ Multi-select filtering
- ✅ 收藏属性 / Favorite feature
- ✅ 统计页面点击跳转衣物列表 / Stats click-through
- ✅ 登录态持久化 / Login persistence
- ✅ 图片前端压缩 + 缩略图 / Image compression + thumbnails
- ✅ 列表排序（桌面列头 + 手机胶囊）/ List sorting
- ✅ Admin ↔ View 互跳入口 / Cross-navigation
- ✅ 已淘汰衣物 View 端默认隐藏 / Retired items hidden by default in View

## 十三、待迭代 / Future Iterations

- [ ] 旧图片批量生成缩略图迁移脚本 / Batch thumbnail migration for existing photos
- [ ] 筛选胶囊添加图标 / Add icons to filter pills
- [ ] 衣物类目图标优化 / Clothing type icon refinement
- [ ] 批量导入 / Bulk import
- [ ] 导出功能（CSV/PDF）/ Export (CSV/PDF)

---

*本项目完全通过 AI 对话完成，从需求分析到多轮迭代上线，前后约 1 天。*
*This project was completed entirely through AI conversation, from requirements to multi-iteration deployment, in approximately one day.*
