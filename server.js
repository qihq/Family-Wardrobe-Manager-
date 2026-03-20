'use strict';

const express = require('express');
const session = require('express-session');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

// ─── 读取配置 ─────────────────────────────────────────────────────
const config        = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const PORT          = config.port         || 3000;
const ADMIN_PWD     = config.adminPassword;
const SESSION_SEC   = config.sessionSecret;
const PHOTO_BASE    = path.resolve(__dirname, config.photoBaseDir || './photos');
const DATA_DIR      = path.join(__dirname, 'data');
const WARDROBE_FILE = path.join(DATA_DIR, 'wardrobe.json');
const MEMBERS_FILE  = path.join(DATA_DIR, 'members.json');

// ─── 确保目录存在 ─────────────────────────────────────────────────
[DATA_DIR, PHOTO_BASE].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(WARDROBE_FILE)) fs.writeFileSync(WARDROBE_FILE, '[]', 'utf8');
if (!fs.existsSync(MEMBERS_FILE)) {
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify([
    { id: 'member_1', name: '大儿子' },
    { id: 'member_2', name: '小儿子' }
  ], null, 2), 'utf8');
}

// ─── JSON 读写 ────────────────────────────────────────────────────
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ─── 多值参数解析工具 ─────────────────────────────────────────────
// 支持逗号分隔：?member=大儿子,小儿子 → ['大儿子', '小儿子']
// 支持重复键：?member=大儿子&member=小儿子 → ['大儿子', '小儿子']
// 空字符串过滤，返回空数组表示"不过滤此维度"
function parseMultiParam(query, key) {
  const raw = query[key];
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .flatMap(v => v.split(','))
    .map(v => v.trim())
    .filter(Boolean);
}

// ─── 季节匹配（四季 = 全季）──────────────────────────────────────
// seasons: 衣物的季节数组；querySeasons: 筛选选中的季节数组
function matchSeasons(itemSeasons, querySeasons) {
  if (!querySeasons || querySeasons.length === 0) return true;
  if (!itemSeasons  || itemSeasons.length  === 0) return false;
  if (itemSeasons.includes('四季')) return true;       // 四季衣物全命中
  return querySeasons.some(s => itemSeasons.includes(s)); // OR 匹配
}

// ─── Multer：photo + thumb 双字段 ────────────────────────────────
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const member = sanitizePath(req.body.member || '未分类');
    const type   = sanitizePath(req.body.clothingType || '其他');
    let dir = path.join(PHOTO_BASE, member, type);
    if (file.fieldname === 'thumb') dir = path.join(dir, 'thumbs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    if (!req._fileBasename) req._fileBasename = `${Date.now()}_${uuidv4().slice(0, 8)}`;
    cb(null, req._fileBasename + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只允许上传图片文件'));
  }
});
const uploadFields = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'thumb', maxCount: 1 }
]);

function sanitizePath(str) {
  return String(str).replace(/[\/\\:*?"<>|]/g, '_').slice(0, 50);
}
function extractPaths(req) {
  const files = req.files || {};
  let photoPath = null, thumbPath = null;
  if (files.photo?.[0]) {
    photoPath = '/photos/' + path.relative(PHOTO_BASE, files.photo[0].path).replace(/\\/g, '/');
  }
  if (files.thumb?.[0]) {
    thumbPath = '/photos/' + path.relative(PHOTO_BASE, files.thumb[0].path).replace(/\\/g, '/');
  }
  return { photoPath, thumbPath };
}
function deleteFile(filePath) {
  if (!filePath) return;
  const abs = path.join(PHOTO_BASE, filePath.replace(/^\/photos\//, ''));
  if (fs.existsSync(abs)) try { fs.unlinkSync(abs); } catch {}
}

// ─── Express ──────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SEC,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/photos', express.static(PHOTO_BASE));

// ─── 页面路由 ─────────────────────────────────────────────────────
app.get('/',            (req, res) => res.redirect('/view'));
app.get('/view',        (req, res) => res.sendFile(path.join(__dirname, 'public/view/index.html')));
app.get('/admin',       (req, res) => {
  if (!req.session.isAdmin) return res.redirect('/admin/login');
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/login.html')));

// ─── Auth ─────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PWD) { req.session.isAdmin = true; res.json({ success: true }); }
  else res.status(401).json({ success: false, message: '密码错误' });
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ success: true })));
app.get('/api/auth/check', (req, res) => res.json({ isAdmin: !!req.session.isAdmin }));

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  return res.status(401).json({ success: false, message: '请先登录' });
}

// ─── 人员 API ─────────────────────────────────────────────────────
app.get('/api/members', (req, res) => res.json(readJSON(MEMBERS_FILE)));

app.post('/api/members', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: '人员姓名不能为空' });
  const members = readJSON(MEMBERS_FILE);
  if (members.find(m => m.name === name.trim()))
    return res.status(400).json({ message: '该人员已存在' });
  const newMember = { id: `member_${uuidv4().slice(0, 8)}`, name: name.trim() };
  members.push(newMember);
  writeJSON(MEMBERS_FILE, members);
  res.json(newMember);
});

app.put('/api/members/:id', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: '姓名不能为空' });
  const members = readJSON(MEMBERS_FILE);
  const idx = members.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: '人员不存在' });
  const oldName = members[idx].name;
  const newName = name.trim();
  members[idx].name = newName;
  writeJSON(MEMBERS_FILE, members);
  if (oldName !== newName) {
    const wardrobe = readJSON(WARDROBE_FILE);
    let changed = false;
    wardrobe.forEach(item => { if (item.member === oldName) { item.member = newName; changed = true; } });
    if (changed) writeJSON(WARDROBE_FILE, wardrobe);
  }
  res.json(members[idx]);
});

app.delete('/api/members/:id', requireAdmin, (req, res) => {
  let members = readJSON(MEMBERS_FILE);
  const exists = members.find(m => m.id === req.params.id);
  if (!exists) return res.status(404).json({ message: '人员不存在' });
  if (readJSON(WARDROBE_FILE).some(c => c.member === exists.name))
    return res.status(400).json({ message: '该人员名下还有衣物，请先转移或删除后再操作' });
  writeJSON(MEMBERS_FILE, members.filter(m => m.id !== req.params.id));
  res.json({ success: true });
});

// ─── 衣物 API ─────────────────────────────────────────────────────

// GET /api/clothes
// 多值参数支持逗号分隔或重复键，同维度 OR，跨维度 AND
app.get('/api/clothes', (req, res) => {
  let list = readJSON(WARDROBE_FILE);

  const members  = parseMultiParam(req.query, 'member');
  const types    = parseMultiParam(req.query, 'type');
  const seasons  = parseMultiParam(req.query, 'season');
  const statuses = parseMultiParam(req.query, 'status');
  const { favorite, q } = req.query;

  // 同维度 OR 过滤
  if (members.length)  list = list.filter(c => members.includes(c.member));
  if (types.length)    list = list.filter(c => types.includes(c.clothingType));
  if (statuses.length) list = list.filter(c => statuses.includes(c.status));

  // 季节：四季衣物全命中，否则 OR 匹配
  if (seasons.length)  list = list.filter(c => matchSeasons(c.seasons, seasons));

  // 收藏（单值）
  if (favorite === 'true') list = list.filter(c => c.favorite === true);

  // 文本搜索
  if (q) list = list.filter(c =>
    (c.name  && c.name.includes(q))  ||
    (c.brand && c.brand.includes(q)) ||
    (c.color && c.color.includes(q)) ||
    (c.notes && c.notes.includes(q))
  );

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// POST /api/clothes
app.post('/api/clothes', requireAdmin, uploadFields, (req, res) => {
  try {
    const { name, clothingType, member, size, color, brand, notes, status, seasons, favorite } = req.body;
    if (!clothingType || !member)
      return res.status(400).json({ message: '衣物类型和适用人员为必填项' });

    const { photoPath, thumbPath } = extractPaths(req);
    let seasonsArr = [];
    if (seasons) {
      try { seasonsArr = JSON.parse(seasons); }
      catch { seasonsArr = String(seasons).split(',').map(s => s.trim()).filter(Boolean); }
    }

    const item = {
      id: uuidv4(), name: (name || '').trim(), clothingType, member,
      size: (size || '').trim(), color: (color || '').trim(),
      brand: (brand || '').trim(), notes: (notes || '').trim(),
      status: status || '在用', seasons: seasonsArr,
      favorite: favorite === 'true' || favorite === true,
      photoPath, thumbPath,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    const wardrobe = readJSON(WARDROBE_FILE);
    wardrobe.push(item);
    writeJSON(WARDROBE_FILE, wardrobe);
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: '服务器错误: ' + err.message });
  }
});

// PATCH /api/clothes/:id/favorite
app.patch('/api/clothes/:id/favorite', requireAdmin, (req, res) => {
  const wardrobe = readJSON(WARDROBE_FILE);
  const idx = wardrobe.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: '衣物不存在' });
  wardrobe[idx].favorite  = !wardrobe[idx].favorite;
  wardrobe[idx].updatedAt = new Date().toISOString();
  writeJSON(WARDROBE_FILE, wardrobe);
  res.json({ id: wardrobe[idx].id, favorite: wardrobe[idx].favorite });
});

// PUT /api/clothes/:id
app.put('/api/clothes/:id', requireAdmin, uploadFields, (req, res) => {
  try {
    const wardrobe = readJSON(WARDROBE_FILE);
    const idx = wardrobe.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: '衣物不存在' });

    const existing = wardrobe[idx];
    const { name, clothingType, member, size, color, brand, notes, status, seasons, favorite } = req.body;
    const { photoPath: newPhoto, thumbPath: newThumb } = extractPaths(req);

    let photoPath = existing.photoPath;
    let thumbPath = existing.thumbPath || null;
    if (newPhoto) { deleteFile(existing.photoPath); photoPath = newPhoto; }
    if (newThumb) { deleteFile(existing.thumbPath); thumbPath = newThumb; }

    let seasonsArrPut = existing.seasons || [];
    if (seasons !== undefined) {
      try { seasonsArrPut = JSON.parse(seasons); }
      catch { seasonsArrPut = String(seasons).split(',').map(s => s.trim()).filter(Boolean); }
    }

    wardrobe[idx] = {
      ...existing,
      name:         (name  !== undefined ? name  : existing.name  || '').trim(),
      clothingType:  clothingType || existing.clothingType,
      member:        member       || existing.member,
      size:         (size  !== undefined ? size  : existing.size  || '').trim(),
      color:        (color !== undefined ? color : existing.color || '').trim(),
      brand:        (brand !== undefined ? brand : existing.brand || '').trim(),
      notes:        (notes !== undefined ? notes : existing.notes || '').trim(),
      status:        status || existing.status,
      seasons:       seasonsArrPut,
      favorite:      favorite !== undefined
                       ? (favorite === 'true' || favorite === true)
                       : (existing.favorite || false),
      photoPath, thumbPath,
      updatedAt: new Date().toISOString()
    };
    writeJSON(WARDROBE_FILE, wardrobe);
    res.json(wardrobe[idx]);
  } catch (err) {
    res.status(500).json({ message: '服务器错误: ' + err.message });
  }
});

// DELETE /api/clothes/:id
app.delete('/api/clothes/:id', requireAdmin, (req, res) => {
  let wardrobe = readJSON(WARDROBE_FILE);
  const item = wardrobe.find(c => c.id === req.params.id);
  if (!item) return res.status(404).json({ message: '衣物不存在' });
  deleteFile(item.photoPath);
  deleteFile(item.thumbPath);
  writeJSON(WARDROBE_FILE, wardrobe.filter(c => c.id !== req.params.id));
  res.json({ success: true });
});

// ─── 全局错误处理 ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`✅ 衣橱管理系统已启动`);
  console.log(`   只读端: http://localhost:${PORT}/view`);
  console.log(`   管理端: http://localhost:${PORT}/admin`);
  console.log(`   图片根目录: ${PHOTO_BASE}`);
});
