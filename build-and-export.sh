#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# build-and-export.sh
# 在普通电脑（非 NAS）上运行，构建 Docker 镜像并导出为 tar 包
# 用途：为无法联网拉取镜像的群晖 NAS 提供离线安装包
#
# 前置要求：
#   - 本机已安装 Docker Desktop（Windows/Mac）
#   - 在 wardrobe 项目根目录下运行此脚本
#
# 用法：
#   bash build-and-export.sh
# ═══════════════════════════════════════════════════════════════

set -e  # 任意命令失败则立即退出

IMAGE_NAME="wardrobe-manager"
IMAGE_TAG="latest"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
OUTPUT_FILE="wardrobe.tar"

echo "════════════════════════════════════════════"
echo "  家庭衣橱管理系统 · Docker 镜像构建工具"
echo "════════════════════════════════════════════"
echo ""

# ── Step 1：检查 Docker 是否可用 ─────────────────────────────
echo "▶ 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
  echo "❌ 未检测到 Docker，请先安装 Docker Desktop："
  echo "   Windows/Mac：https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "❌ Docker 未运行，请先启动 Docker Desktop 后重试"
  exit 1
fi
echo "✅ Docker 环境正常"
echo ""

# ── Step 2：检查必要文件 ──────────────────────────────────────
echo "▶ 检查项目文件..."
REQUIRED_FILES=("Dockerfile" "server.js" "package.json" "config.json")
for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "❌ 缺少必要文件：$f"
    echo "   请在 wardrobe 项目根目录下运行此脚本"
    exit 1
  fi
done
echo "✅ 项目文件检查通过"
echo ""

# ── Step 3：构建 Docker 镜像 ──────────────────────────────────
echo "▶ 开始构建 Docker 镜像（首次构建约需 2～5 分钟）..."
echo "   镜像名称：${FULL_IMAGE}"
echo ""

docker build \
  --platform linux/amd64 \
  -t "${FULL_IMAGE}" \
  .

echo ""
echo "✅ 镜像构建成功"
echo ""

# ── Step 4：导出为 tar 文件 ───────────────────────────────────
echo "▶ 导出镜像为 ${OUTPUT_FILE}..."
docker save -o "${OUTPUT_FILE}" "${FULL_IMAGE}"

# 计算文件大小
if command -v du &> /dev/null; then
  SIZE=$(du -sh "${OUTPUT_FILE}" | cut -f1)
else
  SIZE="（请手动查看）"
fi

echo ""
echo "✅ 导出完成！"
echo ""
echo "════════════════════════════════════════════"
echo "  导出文件：$(pwd)/${OUTPUT_FILE}"
echo "  文件大小：${SIZE}"
echo "════════════════════════════════════════════"
echo ""
echo "📋 后续步骤（将 tar 包导入群晖 NAS）："
echo ""
echo "  1. 将以下文件拷贝到群晖 NAS（用 File Station）："
echo "     - ${OUTPUT_FILE}              （Docker 镜像）"
echo "     - config.json                  （配置文件，请先修改密码）"
echo "     - data/wardrobe.json           （初始数据文件）"
echo "     - data/members.json            （初始人员文件）"
echo "     - public/shared/tfjs/          （AI 模型文件，如已下载）"
echo ""
echo "  2. 在群晖 Container Manager 中导入镜像："
echo "     Container Manager → 映像 → 新增 → 从文件新增"
echo "     选择 ${OUTPUT_FILE} 导入"
echo ""
echo "  3. 参考 DEPLOY.md 中「Docker 部署方式」章节完成后续配置"
echo ""
