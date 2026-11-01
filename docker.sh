#!/bin/bash
# Docker Compose 服务管理脚本（Shell 版，对应 docker.ts 功能）
#
# 用法: ./docker.sh [选项] [操作] [服务名称|all]
# 示例: ./docker.sh start nginx
#       ./docker.sh -f docker-compose.prod.yml start all
#
# 功能: build/start/stop/restart/up/down/rm/rmi/ps/logs/status/images/export/import/list/exec/prune
#
# 开机启动: 本脚本通过 apt/dnf/yum 或 get.docker.com 安装 Docker 时会执行 systemctl enable --now docker，
# 即开机启动且立即启动。compose 中服务均为 restart: unless-stopped，Docker 启动后会自动拉起容器。
# 若 Docker 已存在但未设置开机启动，Linux 下可手动执行: sudo systemctl enable --now docker
#
# 支持系统:
#   - Linux: 自动安装支持 Debian/Ubuntu(apt)、Fedora(dnf)、RHEL/CentOS(yum) 或 get.docker.com 通用脚本；启动用 systemctl/service
#   - macOS (Darwin): 自动安装依赖 Homebrew (brew install --cask docker)；启动用 open -a Docker
#   - 其他系统: 脚本的 start/stop/ps 等 compose 操作通用，仅「未安装时自动安装」不覆盖，需自行安装 Docker 与 Compose

set -e

# 脚本所在目录（项目根）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 默认 compose 文件
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
FORCE_BUILD=false

# 颜色（可选，终端支持时使用）
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

# ---------- 检测 Docker 与 Docker Compose ----------
# 优先使用 docker compose (v2)，否则 docker-compose (v1)
detect_compose_cmd() {
  if docker compose version &>/dev/null; then
    echo "docker compose"
    return 0
  fi
  if command -v docker-compose &>/dev/null && docker-compose --version &>/dev/null; then
    echo "docker-compose"
    return 0
  fi
  return 1
}

# 检测 Docker 是否已安装且运行（不尝试安装）
check_docker() {
  if ! command -v docker &>/dev/null; then
    echo -e "${RED}错误: 未找到 docker 命令${NC}"
    return 1
  fi
  if ! docker info &>/dev/null; then
    echo -e "${RED}错误: Docker 未运行${NC}"
    return 1
  fi
  return 0
}

# 尝试安装 Docker（Linux: 官方脚本；macOS: Homebrew Docker Desktop）
install_docker() {
  local os
  os="$(uname -s)"
  if [[ "$os" == "Linux" ]]; then
    echo -e "${BLUE}正在尝试安装 Docker（Linux）...${NC}"
    if command -v curl &>/dev/null; then
      if curl -fsSL https://get.docker.com | sh; then
        echo -e "${GREEN}Docker 安装完成${NC}"
        sudo systemctl enable --now docker 2>/dev/null || true
        return 0
      fi
    fi
    # 备选：包管理器
    if command -v apt-get &>/dev/null; then
      sudo apt-get update -qq && sudo apt-get install -y docker.io
      sudo systemctl enable --now docker
      return 0
    fi
    if command -v dnf &>/dev/null; then
      sudo dnf install -y dnf-plugins-core && sudo dnf config-manager -y --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
      sudo dnf install -y docker-ce docker-ce-cli containerd.io
      sudo systemctl enable --now docker
      return 0
    fi
    if command -v yum &>/dev/null; then
      sudo yum install -y yum-utils && sudo yum-config-manager -y --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      sudo yum install -y docker-ce docker-ce-cli containerd.io
      sudo systemctl enable --now docker
      return 0
    fi
    echo -e "${YELLOW}无法自动安装，请手动安装: https://docs.docker.com/engine/install/${NC}" >&2
    return 1
  fi
  if [[ "$os" == "Darwin" ]]; then
    echo -e "${BLUE}正在尝试安装 Docker（macOS）...${NC}"
    if command -v brew &>/dev/null; then
      if brew install --cask docker; then
        echo -e "${GREEN}Docker Desktop 已安装${NC}"
        start_docker
        return 0
      fi
    fi
    echo -e "${YELLOW}请手动安装 Docker Desktop: https://www.docker.com/products/docker-desktop/${NC}" >&2
    return 1
  fi
  echo -e "${YELLOW}当前系统暂不支持自动安装 Docker${NC}" >&2
  return 1
}

# 尝试启动 Docker 服务（Linux: systemctl/service；macOS: 打开 Docker Desktop）
start_docker() {
  local os
  os="$(uname -s)"
  if [[ "$os" == "Linux" ]]; then
    if command -v systemctl &>/dev/null; then
      sudo systemctl start docker 2>/dev/null && return 0
    fi
    if command -v service &>/dev/null; then
      sudo service docker start 2>/dev/null && return 0
    fi
    echo -e "${YELLOW}请手动启动 Docker 服务${NC}" >&2
    return 1
  fi
  if [[ "$os" == "Darwin" ]]; then
    open -a Docker 2>/dev/null && echo -e "${BLUE}正在启动 Docker Desktop，请稍候...${NC}" && return 0
    echo -e "${YELLOW}请从「应用程序」中手动启动 Docker Desktop${NC}" >&2
    return 1
  fi
  return 1
}

# 尝试安装 Docker Compose（Linux: 插件或独立命令；macOS: brew install docker-compose）
install_compose() {
  local os
  os="$(uname -s)"
  if [[ "$os" == "Linux" ]]; then
    echo -e "${BLUE}正在尝试安装 Docker Compose（Linux）...${NC}"
    if command -v apt-get &>/dev/null; then
      sudo apt-get update -qq && sudo apt-get install -y docker-compose-plugin 2>/dev/null && return 0
    fi
    if command -v dnf &>/dev/null; then
      sudo dnf install -y docker-compose-plugin 2>/dev/null && return 0
    fi
    if command -v yum &>/dev/null; then
      sudo yum install -y docker-compose-plugin 2>/dev/null && return 0
    fi
    # 独立二进制（GitHub release 架构名: x86_64, aarch64）
    local ver="v2.24.0" bin_path="/usr/local/bin/docker-compose" arch
    arch="$(uname -m)"
    [[ "$arch" == "arm64" ]] && arch="aarch64"
    [[ "$arch" != "x86_64" ]] && [[ "$arch" != "aarch64" ]] && arch="x86_64"
    if command -v curl &>/dev/null; then
      if sudo curl -fsSL "https://github.com/docker/compose/releases/download/${ver}/docker-compose-linux-${arch}" -o "$bin_path"; then
        sudo chmod +x "$bin_path"
        return 0
      fi
    fi
    echo -e "${YELLOW}请手动安装 Docker Compose: https://docs.docker.com/compose/install/${NC}" >&2
    return 1
  fi
  if [[ "$os" == "Darwin" ]]; then
    echo -e "${BLUE}正在尝试安装 Docker Compose（macOS）...${NC}"
    if command -v brew &>/dev/null; then
      brew install docker-compose 2>/dev/null && return 0
    fi
    echo -e "${YELLOW}Docker Desktop 通常已包含 docker compose，请先启动 Docker Desktop${NC}" >&2
    return 1
  fi
  return 1
}

# 确保 Docker 已就绪：未安装则尝试安装，未运行则尝试启动，失败时询问是否自动安装
# 设置环境变量 DOCKER_SH_AUTO_INSTALL=1 可跳过确认直接尝试安装
ensure_docker_ready() {
  if check_docker; then
    return 0
  fi
  if ! command -v docker &>/dev/null; then
    if [[ "${DOCKER_SH_AUTO_INSTALL:-0}" != "1" ]] && [[ -t 0 ]]; then
      echo -e "${YELLOW}是否尝试自动安装 Docker? (y/N)${NC}"
      read -r -n 1 reply
      echo ""
      [[ "${reply,,}" != "y" ]] && [[ "$reply" != "Y" ]] && exit 1
    elif [[ "${DOCKER_SH_AUTO_INSTALL:-0}" != "1" ]]; then
      echo -e "${YELLOW}未检测到 Docker，非交互模式下不自动安装。可设置 DOCKER_SH_AUTO_INSTALL=1 或交互运行本脚本${NC}" >&2
      exit 1
    fi
    if ! install_docker; then
      exit 1
    fi
    # 安装后可能需加入 PATH 或新开终端，先再测一次
    if ! command -v docker &>/dev/null; then
      echo -e "${YELLOW}请新开终端后再执行本脚本，或手动将 docker 加入 PATH${NC}" >&2
      exit 1
    fi
  fi
  if ! docker info &>/dev/null; then
    if [[ "${DOCKER_SH_AUTO_INSTALL:-0}" != "1" ]] && [[ -t 0 ]]; then
      echo -e "${YELLOW}是否尝试启动 Docker? (y/N)${NC}"
      read -r -n 1 reply
      echo ""
      [[ "${reply,,}" != "y" ]] && [[ "$reply" != "Y" ]] && exit 1
    elif [[ "${DOCKER_SH_AUTO_INSTALL:-0}" != "1" ]]; then
      echo -e "${YELLOW}Docker 未运行，非交互模式下不自动启动${NC}" >&2
      exit 1
    fi
    if ! start_docker; then
      exit 1
    fi
    echo -e "${BLUE}等待 Docker 就绪...${NC}"
    for i in {1..30}; do
      sleep 1
      docker info &>/dev/null && return 0
    done
    echo -e "${RED}Docker 启动超时${NC}" >&2
    exit 1
  fi
  return 0
}

# 确保 Docker Compose 可用：未找到则尝试安装
ensure_compose_ready() {
  local cmd
  cmd=$(detect_compose_cmd) && echo "$cmd" && return 0
  echo -e "${YELLOW}未找到 docker compose 或 docker-compose${NC}"
  if [[ "${DOCKER_SH_AUTO_INSTALL:-0}" != "1" ]] && [[ -t 0 ]]; then
    echo -e "${YELLOW}是否尝试自动安装 Docker Compose? (y/N)${NC}"
    read -r -n 1 reply
    echo ""
    [[ "${reply,,}" != "y" ]] && [[ "$reply" != "Y" ]] && return 1
  elif [[ "${DOCKER_SH_AUTO_INSTALL:-0}" != "1" ]]; then
    return 1
  fi
  if ! install_compose; then
    return 1
  fi
  cmd=$(detect_compose_cmd) && echo "$cmd" && return 0
  echo -e "${RED}安装后仍未检测到 Docker Compose，请新开终端重试或手动安装${NC}" >&2
  return 1
}

# ---------- 帮助信息 ----------
show_help() {
  echo -e "${BLUE}Docker Compose 服务管理脚本 (docker.sh)${NC}"
  echo ""
  echo "用法: $0 [选项] [操作] [服务名称...|all]"
  echo "      down/stop/start/restart 可同时指定多个服务"
  echo ""
  echo "选项:"
  echo "  --help, -h         显示此帮助"
  echo "  --file, -f FILE    指定 compose 文件（默认: docker-compose.yml）"
  echo "  --dev, -d          使用 docker-compose.dev.yml"
  echo "  --prod, -p         使用 docker-compose.prod.yml"
  echo "  --build            强制重新构建（仅用于 start）"
  echo ""
  echo "操作: build | start | stop | restart | up | down | rm | rmi | ps | logs | status | images | export | import | list | exec | cp | prune"
  echo ""
  echo "示例:"
  echo "  $0 start nginx"
  echo "  $0 start all              # 仅启动未配置 profile 的服务"
  echo "  $0 start --profile       # 仅启动配置了 profile 的服务"
  echo "  $0 start all --profile    # 启动全部服务（含未配置与已配置 profile 的）"
  echo "  $0 stop srs frps frpc"
  echo "  $0 down srs frps frpc"
  echo "  $0 restart nginx mongo"
  echo "  $0 cp ~/all.sql mongo:/tmp/all.sql   # 宿主机 -> 容器"
  echo "  $0 cp mongo:/tmp/backup.sql ~/       # 容器 -> 宿主机"
  echo "  $0 -f docker-compose.prod.yml start nginx"
  echo "  $0 list"
}

# ---------- 解析选项：-f/--file、--dev/-d、--prod/-p、--build ----------
# 输出：剩余参数写回全局 COMPOSE_ARGS，并设置 COMPOSE_FILE、FORCE_BUILD
parse_opts() {
  local args=("$@")
  local out=()
  local i=0
  COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
  FORCE_BUILD=false

  while [[ $i -lt ${#args[@]} ]]; do
    local a="${args[$i]}"
    case "$a" in
      -h|--help)
        show_help
        exit 0
        ;;
      -f|--file)
        (( i++ )) || true
        if [[ $i -ge ${#args[@]} ]]; then
          echo -e "${RED}错误: -f/--file 需要指定文件路径${NC}" >&2
          exit 1
        fi
        if [[ "${args[$i]}" != /* ]]; then
          COMPOSE_FILE="${SCRIPT_DIR}/${args[$i]}"
        else
          COMPOSE_FILE="${args[$i]}"
        fi
        [[ -f "$COMPOSE_FILE" ]] || { echo -e "${RED}错误: 文件不存在: $COMPOSE_FILE${NC}" >&2; exit 1; }
        (( i++ )) || true
        ;;
      -f=*|--file=*)
        COMPOSE_FILE="${a#*=}"
        [[ "$COMPOSE_FILE" != /* ]] && COMPOSE_FILE="${SCRIPT_DIR}/${COMPOSE_FILE}"
        [[ -f "$COMPOSE_FILE" ]] || { echo -e "${RED}错误: 文件不存在: $COMPOSE_FILE${NC}" >&2; exit 1; }
        (( i++ )) || true
        ;;
      -d|--dev)
        COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.dev.yml"
        [[ -f "$COMPOSE_FILE" ]] || { echo -e "${RED}错误: 文件不存在: $COMPOSE_FILE${NC}" >&2; exit 1; }
        (( i++ )) || true
        ;;
      -p|--prod)
        COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
        [[ -f "$COMPOSE_FILE" ]] || { echo -e "${RED}错误: 文件不存在: $COMPOSE_FILE${NC}" >&2; exit 1; }
        (( i++ )) || true
        ;;
      --build)
        FORCE_BUILD=true
        (( i++ )) || true
        ;;
      *)
        out+=("$a")
        (( i++ )) || true
        ;;
    esac
  done

  # 写回：ACTION 与 SERVICES 由 main 从 out 取
  REMAINING_ARGS=("${out[@]}")
}

# ---------- 从 compose 文件解析 project 名（用于 docker ps --filter label） ----------
# compose 创建的容器带 label com.docker.compose.project=<name>，用此查容器不依赖 compose 命令
get_compose_project_name() {
  local name_line
  name_line=$(grep -E '^name:[[:space:]]' "$COMPOSE_FILE" 2>/dev/null | head -1)
  if [[ -n "$name_line" ]]; then
    echo "$name_line" | sed 's/^name:[[:space:]]*//;s/[[:space:]]*$//'
    return
  fi
  basename "$(cd "$(dirname "$COMPOSE_FILE")" && pwd)"
}

# ---------- 从 compose 文件解析所有服务名（含带 profile 与不带 profile 的；与 docker.ts 逻辑一致） ----------
# 用法: all_svcs=($(get_all_services))
get_all_services() {
  local in_services=false
  local list=()
  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*services:[[:space:]]*$ ]]; then
      in_services=true
      continue
    fi
    if [[ "$in_services" == true ]]; then
      # 遇到顶层 networks: / volumes: 等则结束
      if [[ "$line" =~ ^(networks|volumes)[[:space:]]*: ]]; then
        break
      fi
      # 匹配 "  服务名:"（至少两个空格开头，小写字母数字横线）
      if [[ "$line" =~ ^[[:space:]]{2}([a-z0-9-]+): ]]; then
        local name="${BASH_REMATCH[1]}"
        [[ -n "$name" ]] && list+=("$name")
      fi
    fi
  done < "$COMPOSE_FILE"
  # 去重并排序后输出（每行一个，便于调用方用数组接收）
  printf '%s\n' "${list[@]}" | sort -u
}

# ---------- 解析 compose 中某服务的 profile（与 docker.ts getServiceProfile 一致） ----------
# 用法: get_service_profile <服务名>  ；有则输出 profile 名，无则无输出
# 注释行（含 # profiles:）一律视为无 profile，不参与匹配
get_service_profile() {
  local service="$1"
  local in_block=0
  local need_next=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]{2}"${service}":[[:space:]]*$ ]]; then
      in_block=1
      continue
    fi
    if (( in_block )); then
      # 跳过注释行，避免把 # profiles: / #   - xxx 当作有效 profile
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      # 回到同层或更浅（下一服务或顶层）则结束
      if [[ "$line" =~ ^([[:space:]]*)(.) ]]; then
        local indent=${#BASH_REMATCH[1]}
        local first="${BASH_REMATCH[2]}"
        if (( indent <= 2 )) && [[ "$first" =~ [a-zA-Z] ]]; then
          break
        fi
      fi
      if [[ "$line" =~ ^[[:space:]]*profiles:[[:space:]]* ]]; then
        need_next=1
        continue
      fi
      if (( need_next )) && [[ "$line" =~ ^[[:space:]]+-[[:space:]]+([a-z0-9-]+) ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
      fi
    fi
  done < "$COMPOSE_FILE"
  return 1
}

# ---------- 过滤 compose 输出的常见警告（与 docker.ts 一致，且不输出任何 warning 行） ----------
# 跳过：warning、网络已存在、exists but was not created、Set、external: true、No services to build、level=warning 等
filter_compose_output() {
  local line
  while IFS= read -r line; do
    [[ "$line" =~ [Ww]arning ]] && continue
    [[ "$line" == *"level=warning"* ]] && continue
    [[ "$line" == *"No services to build"* ]] && continue
    [[ "$line" == *"a network with name"* ]] && continue
    [[ "$line" == *"exists but was not created"* ]] && continue
    [[ "$line" == *"external: true"* ]] && continue
    [[ "$line" =~ ^[[:space:]]*Set[[:space:]] ]] && continue
    [[ "$line" == *"already exists"* ]] && continue
    printf '%s\n' "$line"
  done
  return 0
}

# ---------- 显示旋转进度指示器（后台运行，需配合 wait 使用） ----------
# 用法: show_progress_spinner "构建中..." & spinner_pid=$!; ...; kill $spinner_pid 2>/dev/null; wait $spinner_pid 2>/dev/null
show_progress_spinner() {
  local msg="${1:-处理中...}"
  # 使用更大的旋转字符，更明显
  local spinner=("◐" "◓" "◑" "◒")
  local i=0
  # 输出到 stderr 避免被重定向，并禁用缓冲
  while true; do
    printf "\r${YELLOW}%s  %s${NC}" "${spinner[$i]}" "$msg" >&2
    i=$(((i + 1) % ${#spinner[@]}))
    sleep 0.2
  done
}

# ---------- 执行 docker compose 命令（支持传入 profile 列表，通过全局 COMPOSE_PROFILES） ----------
# 显式传 --project-directory，确保与 start/ps 使用同一 project；exec/logs/up/stop/restart/down 不过滤以便看到结果
# 用法: COMPOSE_PROFILES=(p1 p2) run_compose ps
# 或直接: run_compose up -d nginx
run_compose() {
  local compose_dir
  compose_dir="$(cd "$(dirname "$COMPOSE_FILE")" && pwd)"
  local compose_file_abs="${compose_dir}/$(basename "$COMPOSE_FILE")"

  local arr=()
  if [[ "$COMPOSE_CMD" == "docker compose" ]]; then
    # 显式指定项目目录，避免脚本在其他目录执行时 project 错位
    arr=(docker compose --project-directory "$compose_dir" -f "$compose_file_abs")
  else
    arr=(docker-compose --project-directory "$compose_dir" -f "$compose_file_abs")
  fi
  local p
  for p in "${COMPOSE_PROFILES[@]:-}"; do
    [[ -n "$p" ]] && arr+=(--profile "$p")
  done
  # build 时加 -q；up 时一律 --progress quiet，不刷屏不报错（tty/auto 在部分环境下仍会刷屏或报错，quiet 最稳定）
  if [[ "${1:-}" == "build" ]]; then
    arr+=(build -q "${@:2}")
  elif [[ "${1:-}" == "up" ]]; then
    arr+=(--progress quiet "$@")
  else
    arr+=("$@")
  fi

  # exec、logs、stop、restart、down 不过滤；up 走过滤分支以屏蔽 "No services to build" 等警告
  if [[ "${1:-}" == "exec" ]] || [[ "${1:-}" == "logs" ]] || [[ "${1:-}" == "stop" ]] || [[ "${1:-}" == "restart" ]] || [[ "${1:-}" == "down" ]]; then
    (cd "$compose_dir" && "${arr[@]}")
    return
  fi

  # up 时：显示进度指示器（构建/拉取/启动时），后台运行 compose，等待完成后停止指示器并显示结果
  if [[ "${1:-}" == "up" ]]; then
    # 显示进度指示器
    show_progress_spinner "构建/启动中..." &
    local spinner_pid=$!
    # 运行 compose，捕获输出（不吞错误，让失败能暴露）
    local compose_output
    set +e
    compose_output=$((cd "$compose_dir" && "${arr[@]}") 2>&1)
    local compose_exit=$?
    set -e
    # 停止进度指示器（清除当前行），kill/wait 可能失败但不影响主流程
    set +e
    kill $spinner_pid 2>/dev/null || true
    wait $spinner_pid 2>/dev/null || true
    set -e
    printf "\r%${COLUMNS:-80}s\r" "" >&2  # 清除进度指示器行（输出到 stderr）
    # 显示结果（过滤警告），即使 compose 失败也要显示错误信息（错误信息不过滤）
    if [[ -n "$compose_output" ]]; then
      if [[ $compose_exit -eq 0 ]]; then
        # 成功时过滤警告
        printf '%s\n' "$compose_output" | filter_compose_output
      else
        # 失败时显示完整错误信息（不过滤）
        printf '%s\n' "$compose_output"
      fi
    elif [[ $compose_exit -ne 0 ]]; then
      echo -e "${RED}错误: docker compose 执行失败（退出码: $compose_exit），无输出信息${NC}" >&2
    fi
    return $compose_exit
  fi

  # ps/build/up（非 TTY）等过滤警告后输出，透传退出码（up 时过滤 WARN No services to build）
  (cd "$compose_dir" && "${arr[@]}") 2>&1 | filter_compose_output
  return "${PIPESTATUS[0]:-0}"
}

# ---------- list：列出所有可用服务 ----------
handle_list() {
  echo -e "${BLUE}可用服务:${NC}"
  get_all_services | while read -r s; do
    [[ -n "$s" ]] && echo "  - $s"
  done
}

# ---------- 为若干服务收集 profile 并设置 COMPOSE_PROFILES ----------
# 用法: set_profiles_for_services "all" 或 set_profiles_for_services "nginx" "mongo"
set_profiles_for_services() {
  COMPOSE_PROFILES=()
  local svcs=("$@")
  local all=()
  if [[ "${svcs[*]}" == "all" ]] || [[ ${#svcs[@]} -eq 0 ]]; then
    while read -r s; do [[ -n "$s" ]] && all+=("$s"); done < <(get_all_services)
    svcs=("${all[@]}")
  fi
  local seen=""
  local p
  for s in "${svcs[@]}"; do
    # get_service_profile 无 profile 时 return 1，在 set -e 下会导致脚本退出，故用 || true 避免
    p=$(get_service_profile "$s" 2>/dev/null) || true
    if [[ -n "$p" ]] && [[ " $seen " != *" $p "* ]]; then
      seen=" $seen $p "
      COMPOSE_PROFILES+=("$p")
    fi
  done
}

# ---------- 获取当前 profile 下「生效」的服务列表（与 run_compose 同源；含无 profile 的服务） ----------
# 调用前需已执行 set_profiles_for_services，以便 COMPOSE_PROFILES 正确。
# 用法: set_profiles_for_services "all"; all_svcs=($(get_effective_services))
get_effective_services() {
  local arr=()
  if [[ "${COMPOSE_CMD:-}" == "docker compose" ]]; then
    arr=(docker compose -f "$COMPOSE_FILE")
  else
    arr=(docker-compose -f "$COMPOSE_FILE")
  fi
  local p
  for p in "${COMPOSE_PROFILES[@]:-}"; do
    [[ -n "$p" ]] && arr+=(--profile "$p")
  done
  arr+=(config --services)
  "${arr[@]}" 2>/dev/null || true
}

# ---------- 获取「未配置 profiles」的服务列表（供 start all 使用） ----------
# 只启动这些服务时无需传 --profile，compose 默认会包含它们。
get_services_without_profile() {
  local s
  while read -r s; do
    [[ -z "$s" ]] && continue
    if ! get_service_profile "$s" >/dev/null 2>&1; then
      echo "$s"
    fi
  done < <(get_all_services)
}

# ---------- 获取「已配置 profiles」的服务列表（供 start --profile 使用） ----------
get_services_with_profile() {
  local s
  while read -r s; do
    [[ -z "$s" ]] && continue
    if get_service_profile "$s" >/dev/null 2>&1; then
      echo "$s"
    fi
  done < <(get_all_services)
}

# ---------- 获取「当前已启动」的服务列表（供 restart all / stop all / down all 使用） ----------
# 与 run_compose 一致：在 compose 文件所在目录执行，确保与 stop/restart 同一项目。
# 调用前需已执行 set_profiles_for_services "all"，以便能查到整个项目下的容器。
# 用法: set_profiles_for_services "all"; running=($(get_running_services))
get_running_services() {
  local compose_dir compose_file_abs
  compose_dir="$(cd "$(dirname "$COMPOSE_FILE")" && pwd)"
  compose_file_abs="${compose_dir}/$(basename "$COMPOSE_FILE")"
  local arr=()
  if [[ "${COMPOSE_CMD:-}" == "docker compose" ]]; then
    arr=(docker compose --project-directory "$compose_dir" -f "$compose_file_abs")
  else
    arr=(docker-compose --project-directory "$compose_dir" -f "$compose_file_abs")
  fi
  local p
  for p in "${COMPOSE_PROFILES[@]:-}"; do
    [[ -n "$p" ]] && arr+=(--profile "$p")
  done
  arr+=(ps --services)
  # 不吞掉 stderr，便于排查「返回为空」时 compose 的报错（如 project 名、路径不一致等）
  (cd "$compose_dir" && "${arr[@]}") || true
}

# ---------- 获取当前 project 下所有运行中容器的 ID（用于 stop all 时逐个 docker stop，更可靠） ----------
# 调用前需已执行 set_profiles_for_services "all"。
get_project_container_ids() {
  local compose_dir compose_file_abs
  compose_dir="$(cd "$(dirname "$COMPOSE_FILE")" && pwd)"
  compose_file_abs="${compose_dir}/$(basename "$COMPOSE_FILE")"
  local arr=()
  if [[ "${COMPOSE_CMD:-}" == "docker compose" ]]; then
    arr=(docker compose --project-directory "$compose_dir" -f "$compose_file_abs")
  else
    arr=(docker-compose --project-directory "$compose_dir" -f "$compose_file_abs")
  fi
  local p
  for p in "${COMPOSE_PROFILES[@]:-}"; do
    [[ -n "$p" ]] && arr+=(--profile "$p")
  done
  arr+=(ps -q)
  (cd "$compose_dir" && "${arr[@]}") 2>/dev/null || true
}

# ---------- ps：查看容器状态；无运行中服务时提示「当前没有启动的服务」；all 时 set_profiles_for_services "all" || true 防退出 ----------
handle_ps() {
  set +e
  local target="${1:-all}"
  set_profiles_for_services "$target" || true
  local out
  out=$(run_compose ps 2>&1) || true
  local non_empty
  non_empty=$(printf '%s' "$out" | grep -c . 2>/dev/null || true)
  set -e
  if [[ "${non_empty:-0}" -le 1 ]]; then
    echo -e "${YELLOW}当前没有启动的服务${NC}"
    return
  fi
  printf '%s\n' "$out"
  echo ""  # 输出后加一个空行
}

# ---------- start：启动服务（支持多服务；all = 仅「未配置 profiles」的服务；all --profile = 全部服务含 profile，按服务逐个构建/启动并提示） ----------
handle_start() {
  if [[ $# -eq 0 ]]; then
    echo -e "${RED}错误: start 需要指定服务名或 all${NC}" >&2
    exit 1
  fi
  # 判断：start all = 仅未配置 profile 的服务；start --profile = 仅配置了 profile 的服务；start all --profile = 全部服务
  local start_all=false start_all_with_profiles=false start_profile_only=false
  if [[ $# -eq 1 && "$1" == "all" ]]; then
    start_all=true
  elif [[ $# -eq 2 && "$1" == "all" && "$2" == "--profile" ]]; then
    start_all=true
    start_all_with_profiles=true
  elif [[ $# -eq 1 && "$1" == "--profile" ]]; then
    start_all=true
    start_profile_only=true
  fi
  if [[ "$start_all" == true ]]; then
    set +e
    local all_svcs
    if [[ "$start_all_with_profiles" == true ]]; then
      set_profiles_for_services "all" || true
      all_svcs=($(get_effective_services)) || true
    elif [[ "$start_profile_only" == true ]]; then
      set_profiles_for_services "all" || true
      all_svcs=($(get_services_with_profile)) || true
    else
      COMPOSE_PROFILES=()
      all_svcs=($(get_services_without_profile)) || true
    fi
    set -e
    [[ ${#all_svcs[@]} -eq 0 ]] && { echo -e "${YELLOW}没有可启动的服务${NC}" >&2; exit 0; }
    local build_opt=()
    [[ "$FORCE_BUILD" == true ]] && build_opt=(--build)
    # 按服务逐个构建/启动：每个服务单独显示「构建/启动中: xxx...」，完成后提示「xxx 已就绪」再进入下一个
    local compose_dir compose_file_abs arr svc pid out ex p
    compose_dir="$(cd "$(dirname "$COMPOSE_FILE")" && pwd)"
    compose_file_abs="${compose_dir}/$(basename "$COMPOSE_FILE")"
    if [[ "$COMPOSE_CMD" == "docker compose" ]]; then
      arr=(docker compose --project-directory "$compose_dir" -f "$compose_file_abs")
    else
      arr=(docker-compose --project-directory "$compose_dir" -f "$compose_file_abs")
    fi
    for p in "${COMPOSE_PROFILES[@]:-}"; do
      [[ -n "$p" ]] && arr+=(--profile "$p")
    done
    arr+=(--progress quiet up -d "${build_opt[@]}")
    for svc in "${all_svcs[@]}"; do
      [[ -z "$svc" ]] && continue
      show_progress_spinner "构建/启动中: $svc..." &
      pid=$!
      set +e
      out=$(cd "$compose_dir" && "${arr[@]}" "$svc" 2>&1)
      ex=$?
      set -e
      kill $pid 2>/dev/null || true
      wait $pid 2>/dev/null || true
      printf "\r%${COLUMNS:-80}s\r" "" >&2
      if [[ $ex -eq 0 ]]; then
        echo -e "${GREEN}$svc 已就绪${NC}"
        [[ -n "$out" ]] && printf '%s\n' "$out" | filter_compose_output
      else
        echo -e "${RED}$svc 启动失败${NC}" >&2
        [[ -n "$out" ]] && printf '%s\n' "$out"
      fi
    done
  else
    echo -e "${GREEN}启动服务: $*${NC}"
    # 单个/多个服务：有 profile 与无 profile 的都要能启动；直接按每个服务的 profile 情况判断
    # - 若全部无 profile：与 start all 一致，不传 --profile、不传 --no-deps
    # - 若任一带 profile：set_profiles_for_services 收集这些服务的 profile，up -d --no-deps
    local has_any_profile=false s
    for s in "$@"; do
      if get_service_profile "$s" >/dev/null 2>&1; then
        has_any_profile=true
        break
      fi
    done
    local build_opt=()
    [[ "$FORCE_BUILD" == true ]] && build_opt=(--build)
    if [[ "$has_any_profile" == false ]]; then
      COMPOSE_PROFILES=()
      run_compose up -d "${build_opt[@]}" "$@"
    else
      set_profiles_for_services "$@"
      run_compose up -d "${build_opt[@]}" --no-deps "$@"
    fi
  fi
  if [[ "$FORCE_BUILD" == true ]]; then
    echo -e "${YELLOW}清理悬空镜像（旧构建层）...${NC}"
    docker image prune -f
  fi
  # start 完成后显示当前已运行的服务
  echo ""
  handle_ps "all"
}

# ---------- stop：停止服务（支持多服务；all = 用 docker compose ps --services 拿当前已启动的服务名，打日志后循环对每个服务执行 stop） ----------
handle_stop() {
  if [[ $# -eq 0 ]]; then
    echo -e "${RED}错误: stop 需要指定服务名或 all${NC}" >&2
    exit 1
  fi
  if [[ $# -eq 1 && "$1" == "all" ]]; then
    echo -e "${GREEN}停止所有服务...${NC}"
    set +e
    set_profiles_for_services "all" || true
    local svcs
    svcs=($(get_running_services)) || true
    set -e
    if [[ ${#svcs[@]} -eq 0 ]]; then
      echo -e "${YELLOW}当前没有启动的服务${NC}"
      return 0
    fi
    local svc
    for svc in "${svcs[@]}"; do
      [[ -z "$svc" ]] && continue
      echo -e "${GREEN}正在停止服务: $svc${NC}"
      set_profiles_for_services "$svc" || true
      run_compose stop "$svc"
    done
  else
    echo -e "${GREEN}停止服务: $*${NC}"
    set_profiles_for_services "$@"
    run_compose stop "$@"
  fi
}

# ---------- restart：重启服务（支持多服务；all = 用 docker compose ps --services 拿当前已启动的服务名，打日志后循环对每个服务执行 restart） ----------
handle_restart() {
  if [[ $# -eq 0 ]]; then
    echo -e "${RED}错误: restart 需要指定服务名或 all${NC}" >&2
    exit 1
  fi
  if [[ $# -eq 1 && "$1" == "all" ]]; then
    echo -e "${GREEN}重启所有服务...${NC}"
    set +e
    set_profiles_for_services "all" || true
    local svcs
    svcs=($(get_running_services)) || true
    set -e
    if [[ ${#svcs[@]} -eq 0 ]]; then
      echo -e "${YELLOW}当前没有启动的服务${NC}"
      return 0
    fi
    local svc
    for svc in "${svcs[@]}"; do
      [[ -z "$svc" ]] && continue
      echo -e "${GREEN}正在重启服务: $svc${NC}"
      set_profiles_for_services "$svc" || true
      run_compose restart "$svc"
    done
  else
    echo -e "${GREEN}重启服务: $*${NC}"
    set_profiles_for_services "$@"
    run_compose restart "$@"
  fi
  # restart 完成后显示当前已运行的服务
  echo ""
  handle_ps "all"
}

# ---------- build：构建服务镜像；完成后清理悬空镜像（旧构建层） ----------
handle_build() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    echo -e "${RED}错误: build 需要指定服务名或 all${NC}" >&2
    exit 1
  fi
  if [[ "$target" == "all" ]]; then
    echo -e "${GREEN}构建所有服务镜像...${NC}"
    set +e
    set_profiles_for_services "all" || true
    run_compose build
    set -e
  else
    echo -e "${GREEN}构建服务镜像: $target${NC}"
    set_profiles_for_services "$target"
    run_compose build "$target"
  fi
  echo -e "${YELLOW}清理悬空镜像（旧构建层）...${NC}"
  docker image prune -f
  echo -e "${GREEN}✓ 构建完成${NC}"
}

# ---------- up：创建并启动（与 start 行为一致） ----------
handle_up() {
  handle_start "$@"
}

# ---------- down：停止并删除容器（all = 与 docker.ts 一致：整 project 执行 down --rmi local） ----------
handle_down() {
  if [[ $# -eq 0 ]]; then
    echo -e "${RED}错误: down 需要指定服务名或 all${NC}" >&2
    exit 1
  fi
  if [[ $# -eq 1 && "$1" == "all" ]]; then
    echo -e "${RED}停止并删除所有容器和镜像...${NC}"
    read -p "确定要删除所有容器和镜像吗? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "已取消"
      return 0
    fi
    set +e
    set_profiles_for_services "all" || true
    run_compose down --rmi local || true
    set -e
    echo -e "${GREEN}✓ 所有容器和镜像已删除${NC}"
  else
    echo -e "${RED}停止并删除容器: $*${NC}"
    read -p "确定要停止并删除以上容器吗? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "已取消"
      return 0
    fi
    set_profiles_for_services "$@"
    run_compose down "$@"
  fi
}

# ---------- logs：查看服务日志（-f 实时） ----------
handle_logs() {
  local target="${1:-all}"
  if [[ "$target" == "all" ]]; then
    echo -e "${BLUE}查看所有服务日志 (按 Ctrl+C 退出)${NC}"
    set +e
    set_profiles_for_services "all" || true
    set -e
    run_compose logs -f
  else
    echo -e "${BLUE}查看服务日志: $target (按 Ctrl+C 退出)${NC}"
    set_profiles_for_services "$target"
    run_compose logs -f "$target"
  fi
}

# ---------- status：查看服务状态（同 ps，带标题） ----------
handle_status() {
  echo -e "${BLUE}服务状态:${NC}"
  handle_ps "${1:-all}"
}

# ---------- images：查看服务镜像 ----------
handle_images() {
  local target="${1:-all}"
  if [[ "$target" == "all" ]]; then
    echo -e "${BLUE}所有服务镜像:${NC}"
    set +e
    set_profiles_for_services "all" || true
    run_compose images || true
    set -e
  else
    echo -e "${BLUE}服务镜像: $target${NC}"
    set_profiles_for_services "$target"
    run_compose images "$target"
  fi
}

# ---------- exec：进入服务容器（交互式 shell，需指定一个服务，可带后续命令如 bash） ----------
handle_exec() {
  local service="${1:-}"
  if [[ -z "$service" ]]; then
    echo -e "${RED}错误: exec 需要指定一个服务名${NC}" >&2
    exit 1
  fi
  shift
  local cmd=("${@:-bash}")
  set_profiles_for_services "$service"
  echo -e "${GREEN}进入容器: $service${NC}"
  echo -e "${YELLOW}提示: 输入 exit 退出容器${NC}"

  run_compose exec -it "$service" "${cmd[@]}"
}

# ---------- cp：宿主机与容器之间复制文件（用法同 docker cp） ----------
# 宿主机 -> 容器: $0 cp <宿主机路径> <服务名>:<容器内路径>
# 容器 -> 宿主机: $0 cp <服务名>:<容器内路径> <宿主机路径>
handle_cp() {
  local src="${1:-}"
  local dest="${2:-}"
  if [[ -z "$src" || -z "$dest" ]]; then
    echo -e "${RED}错误: cp 需要两个参数（源 目标）${NC}" >&2
    echo "  宿主机 -> 容器: $0 cp <宿主机路径> <服务名>:<容器内路径>" >&2
    echo "  容器 -> 宿主机: $0 cp <服务名>:<容器内路径> <宿主机路径>" >&2
    exit 1
  fi
  # 宿主机路径中的 ~ 由 shell 展开；容器侧格式为 服务名:路径（与 docker cp 一致）
  if [[ "$src" == *:* ]]; then
    echo -e "${GREEN}复制: 容器($src) -> 宿主机($dest)${NC}"
  else
    echo -e "${GREEN}复制: 宿主机($src) -> 容器($dest)${NC}"
  fi
  docker cp "$src" "$dest" || { echo -e "${RED}复制失败${NC}" >&2; exit 1; }
  echo -e "${GREEN}✓ 复制完成${NC}"
}

# ---------- prune：清理悬空镜像（不需要服务名） ----------
handle_prune() {
  echo -e "${YELLOW}正在清理悬空镜像...${NC}"
  docker image prune -f
  echo -e "${GREEN}✓ 清理完成${NC}"
}

# ---------- rm：删除容器 ----------
handle_rm() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    echo -e "${RED}错误: rm 需要指定服务名或 all${NC}" >&2
    exit 1
  fi
  if [[ "$target" == "all" ]]; then
    echo -e "${RED}删除所有容器...${NC}"
    read -p "确定要删除所有容器吗? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "已取消"
      return 0
    fi
    set +e
    set_profiles_for_services "all" || true
    run_compose rm -f || true
    set -e
    echo -e "${GREEN}✓ 已完成${NC}"
  else
    echo -e "${RED}删除容器: $target${NC}"
    set_profiles_for_services "$target"
    run_compose rm -f "$target"
    echo -e "${GREEN}✓ 容器 $target 已删除${NC}"
  fi
}

# ---------- rmi：删除镜像（all = set +e 与 set_profiles_for_services "all" || true 后 down --rmi local，与 stop/restart 同风格，避免提前退出） ----------
handle_rmi() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    echo -e "${RED}错误: rmi 需要指定服务名或 all${NC}" >&2
    exit 1
  fi
  if [[ "$target" == "all" ]]; then
    echo -e "${RED}删除所有服务镜像...${NC}"
    read -p "确定要删除所有镜像吗? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "已取消"
      return 0
    fi
    set +e
    set_profiles_for_services "all" || true
    run_compose down --rmi local || true
    set -e
    echo -e "${GREEN}✓ 已完成${NC}"
  else
    echo -e "${RED}删除服务镜像: $target${NC}"
    read -p "确定要删除服务 \"$target\" 的容器及镜像吗? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "已取消"
      return 0
    fi
    set_profiles_for_services "$target"
    run_compose down "$target"
    local img
    img=$(run_compose images -q "$target" 2>/dev/null | head -1)
    if [[ -n "$img" ]]; then
      docker rmi -f "$img" 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ 已完成${NC}"
  fi
}

# 备份目录（与 docker.ts 一致）
BACKUP_DIR="${SCRIPT_DIR}/backups"

# ---------- export：导出服务镜像到备份目录（需指定一个服务） ----------
handle_export() {
  local service="${1:-}"
  if [[ -z "$service" ]]; then
    echo -e "${RED}错误: export 需要指定一个服务名${NC}" >&2
    exit 1
  fi
  if [[ "$service" == "all" ]]; then
    echo -e "${RED}错误: export 不支持 all，请指定具体服务名${NC}" >&2
    exit 1
  fi
  mkdir -p "$BACKUP_DIR"
  set_profiles_for_services "$service"
  local img
  img=$(run_compose images -q "$service" 2>/dev/null | head -1)
  if [[ -z "$img" ]]; then
    img=$service
  fi
  local ts
  ts=$(date +%Y-%m-%dT%H-%M-%S)
  local out="${BACKUP_DIR}/${service}-${ts}.tar"
  echo -e "${GREEN}导出服务镜像: $service -> $out${NC}"
  docker save -o "$out" "$img" || { echo -e "${RED}导出失败${NC}" >&2; exit 1; }
  echo -e "${GREEN}✓ 导出成功: $out${NC}"
}

# ---------- import：从备份目录导入服务镜像（需指定一个服务） ----------
handle_import() {
  local service="${1:-}"
  if [[ -z "$service" ]]; then
    echo -e "${RED}错误: import 需要指定一个服务名${NC}" >&2
    exit 1
  fi
  if [[ "$service" == "all" ]]; then
    echo -e "${RED}错误: import 不支持 all，请指定具体服务名${NC}" >&2
    exit 1
  fi
  mkdir -p "$BACKUP_DIR"
  local tarfile=""
  if [[ -f "${BACKUP_DIR}/${service}.tar" ]]; then
    tarfile="${BACKUP_DIR}/${service}.tar"
  else
    tarfile=$(ls -t "${BACKUP_DIR}/${service}"-*.tar 2>/dev/null | head -1)
  fi
  if [[ -z "$tarfile" || ! -f "$tarfile" ]]; then
    echo -e "${RED}错误: 未找到服务 '$service' 的备份文件 (.tar)${NC}" >&2
    exit 1
  fi
  echo -e "${GREEN}从备份导入: $tarfile${NC}"
  docker load -i "$tarfile" || { echo -e "${RED}导入失败${NC}" >&2; exit 1; }
  echo -e "${GREEN}✓ 导入成功${NC}"
}

# ---------- 主入口 ----------
main() {
  if [[ $# -eq 0 ]] || [[ " $* " == *" --help "* ]] || [[ " $* " == *" -h "* ]]; then
    show_help
    exit 0
  fi

  parse_opts "$@"
  set -- "${REMAINING_ARGS[@]}"

  if [[ $# -eq 0 ]]; then
    show_help
    exit 0
  fi

  if ! ensure_docker_ready; then
    exit 1
  fi
  COMPOSE_CMD=$(ensure_compose_ready) || {
    echo -e "${RED}错误: 未找到 docker compose 或 docker-compose，且自动安装未完成${NC}" >&2
    exit 1
  }

  ACTION="$1"
  shift
  SERVICES=("$@")

  # 按操作分发（Step 3: list / ps / start / stop / restart）
  case "$ACTION" in
    list)
      handle_list
      ;;
    ps)
      handle_ps "${SERVICES[0]:-all}"
      ;;
    start)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: start 需要指定服务名或 all${NC}" >&2
        exit 1
      fi
      handle_start "${SERVICES[@]}"
      ;;
    stop)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: stop 需要指定服务名或 all${NC}" >&2
        exit 1
      fi
      handle_stop "${SERVICES[@]}"
      ;;
    restart)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: restart 需要指定服务名或 all${NC}" >&2
        exit 1
      fi
      handle_restart "${SERVICES[@]}"
      ;;
    build)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: build 需要指定服务名或 all${NC}" >&2
        exit 1
      fi
      handle_build "${SERVICES[0]}"
      ;;
    up)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: up 需要指定服务名或 all${NC}" >&2
        exit 1
      fi
      handle_up "${SERVICES[@]}"
      ;;
    down)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: down 需要指定服务名或 all${NC}" >&2
        exit 1
      fi
      handle_down "${SERVICES[@]}"
      ;;
    logs)
      handle_logs "${SERVICES[0]:-all}"
      ;;
    status)
      handle_status "${SERVICES[0]:-all}"
      ;;
    images)
      handle_images "${SERVICES[0]:-all}"
      ;;
    exec)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: exec 需要指定一个服务名${NC}" >&2
        exit 1
      fi
      handle_exec "${SERVICES[@]}"
      ;;
    prune)
      handle_prune
      ;;
    rm)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: rm 需要指定服务名或 all${NC}" >&2
        exit 1
      fi
      handle_rm "${SERVICES[0]}"
      ;;
    rmi)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: rmi 需要指定服务名或 all${NC}" >&2
        exit 1
      fi
      handle_rmi "${SERVICES[0]}"
      ;;
    export)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: export 需要指定一个服务名${NC}" >&2
        exit 1
      fi
      handle_export "${SERVICES[0]}"
      ;;
    import)
      if [[ ${#SERVICES[@]} -eq 0 ]]; then
        echo -e "${RED}错误: import 需要指定一个服务名${NC}" >&2
        exit 1
      fi
      handle_import "${SERVICES[0]}"
      ;;
    cp)
      if [[ ${#SERVICES[@]} -lt 2 ]]; then
        echo -e "${RED}错误: cp 需要两个参数（源 目标）${NC}" >&2
        echo "  宿主机 -> 容器: $0 cp <宿主机路径> <服务名>:<容器内路径>" >&2
        echo "  容器 -> 宿主机: $0 cp <服务名>:<容器内路径> <宿主机路径>" >&2
        exit 1
      fi
      handle_cp "${SERVICES[0]}" "${SERVICES[1]}"
      ;;
    *)
      echo -e "${YELLOW}[未实现] 操作: $ACTION${NC}"
      echo "  已支持: list, ps, start, stop, restart, build, up, down, logs, status, images, exec, cp, prune, rm, rmi, export, import"
      exit 1
      ;;
  esac
}

main "$@"
