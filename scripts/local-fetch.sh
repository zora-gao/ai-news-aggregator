#!/bin/bash
# ============================================================================
# 本地定时抓取脚本
# ----------------------------------------------------------------------------
# 作用：在本机抓取 AI 资讯（含微信公众号，经本地 WeWe RSS :4000），并把数据
#       快照推送到 GitHub；推送会触发线上 GitHub Actions 重新构建并部署。
# 调用：由 launchd 每 2 小时自动执行（见 deploy/launchd/）。也可手动执行测试：
#       bash scripts/local-fetch.sh
# 日志：logs/local-fetch.log
# ============================================================================
set -uo pipefail

# launchd 启动环境的 PATH 极简，需显式补全 node/npm/git/docker 所在目录
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

PROJECT_DIR="/Users/zora/CodeBuddy/ai-radar"
cd "$PROJECT_DIR" || exit 1

mkdir -p logs
LOG="$PROJECT_DIR/logs/local-fetch.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "==================== run start ===================="

# 读取本地环境变量（GLM_API_KEY / GLM_MODEL 等）。.env 不提交 git。
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a; . "$PROJECT_DIR/.env"; set +a
  log "已加载 .env"
else
  log "未发现 .env（GLM 摘要将跳过，仅用缓存回填）"
fi

# 1) 确保 WeWe RSS 容器在运行（抓取公众号必需，提供 :4000）
if ! docker ps --filter name=wewe-rss --filter status=running --format '{{.Names}}' | grep -q wewe-rss; then
  log "wewe-rss 容器未运行，尝试启动…"
  docker start wewe-rss >>"$LOG" 2>&1 \
    || (cd "$PROJECT_DIR/deploy/wewe-rss" && docker compose up -d >>"$LOG" 2>&1)
  sleep 8
fi

# 2) 先同步云端（云端机器人也会提交数据），autostash 防止本地零散改动导致 rebase 失败
log "git pull --rebase --autostash origin main"
if ! git pull --rebase --autostash origin main >>"$LOG" 2>&1; then
  log "git pull 失败，终止本轮（请检查冲突）"
  log "===================== run end (pull failed) ====================="
  exit 1
fi

# 3) 抓取资讯与模型数据
log "npm run fetch"
npm run fetch >>"$LOG" 2>&1 || log "fetch 退出码非 0（继续尝试提交已生成的数据）"
log "npm run fetch:models"
npm run fetch:models >>"$LOG" 2>&1 || log "fetch:models 退出码非 0"

# 4) 仅提交数据快照（与云端 workflow 一致）。无变化则跳过。
DATA_FILES="data/latest-24h.json data/latest-7d.json data/archive.json data/source-status.json data/waytoagi-7d.json data/title-zh-cache.json data/summary-cache.json data/models.json data/models-zh-cache.json"
git add $DATA_FILES 2>/dev/null

if git diff --cached --quiet; then
  log "无数据变化，跳过提交"
else
  # 用 local-fetch-bot 身份提交：云端 workflow 据此识别为「本地推送」，
  # 会触发重新构建+部署（而云端机器人自身回写则被跳过，避免死循环）。
  git -c user.name="local-fetch-bot" -c user.email="local-fetch-bot@localhost" \
    commit -m "chore: local fetch snapshot (含微信公众号)" >>"$LOG" 2>&1
  if git push origin main >>"$LOG" 2>&1; then
    log "push 成功（已触发线上重新部署）"
  else
    log "push 失败（请检查网络或远端冲突）"
  fi
fi

log "===================== run end ====================="
echo "" >>"$LOG"
