# 集成测试缺口盘点与补齐方案（方案 A）

**日期**: 2026-03-18  
**范围**: `frontend/tests`（Playwright `api/**` + `e2e/**`）  
**目标**: 基于当前项目实现，盘点缺失的集成测试用例，并提供可执行、低 flaky 的补齐路径（分层推进）。

---

## 背景与现状

当前 Playwright 集成测试主要覆盖：
- **Health**：后端 `/health` 200；前端首页可加载（`tests/api/health.spec.ts`）
- **连接创建/列表**：UI 创建；API 预置后列表展示（`tests/e2e/connection-crud.spec.ts`、`tests/e2e/full-flow.spec.ts`）
- **终端基础流程**：进入终端页；断开/重连（`tests/e2e/ssh-terminal.spec.ts`）

当前已知约束/风险点：
- 多个 e2e suite 复用同一 `user_id`，且包含清理逻辑，若并发运行易互相影响（已采取串行运行策略）。
- Terminal 输出来自 xterm.js 渲染，文本断言需要可观测点或稳定的读取方式。

---

## 方案 A：分层推进（推荐）

### Layer 1（最高 ROI / 最稳）
补齐连接 CRUD 与校验失败路径。**不依赖真实 SSH 环境**，可在本地/CI 稳定跑通。

### Layer 2（中等复杂度）
补齐 Terminal 的错误路径、kill-session、resize 行为。尽量用“可预期失败”触发 `error`，减少环境依赖。

### Layer 3（真实 SSH 深度）
覆盖真实命令输出、会话复用/历史回放、tmux 分支。需要稳定测试 SSH 环境与更强可观测点。

---

## 设计决策：UI 显示“复用会话”状态（用于可测性）

为降低 flaky 并让用例可断言：
- 在终端状态栏展示会话是否复用，例如：
  - 新会话：`已连接`
  - 复用会话：`已连接（复用）`
- 依据后端复用路径会发送的 `connected { reused: true }` 信号（`backend/src/plugins/socket.io.ts`）。

该 UI 变化不仅用于测试，也对用户理解“复用 tmux/会话保持”有帮助。

---

## 缺失用例清单（按价值/风险排序）

### 1) 连接 CRUD（UI 级）
建议扩展 `tests/e2e/connection-crud.spec.ts`：
- **编辑连接**
  - Given：列表存在一个连接
  - When：点击“编辑”→修改 `name/host/port/username/auth_type`→保存
  - Then：列表展示更新（字段变更可见）
- **删除连接**
  - Given：列表存在一个连接
  - When：点击“删除”（如有二次确认则确认）
  - Then：卡片消失；API GET list 不包含该连接
- **表单校验失败（前端）**
  - Given：打开新建/编辑表单
  - When：输入非法 `host/port/username`，或 `auth_type=password` 且 password 为空，或 `auth_type=privateKey` 且 private_key 为空
  - Then：字段红字出现；点击“保存”仍停留在表单且不会创建/更新
- **后端 400 校验错误的 UI 呈现**
  - Given：通过 API 构造后端会拒绝的 payload（或通过 UI 触发后端拒绝）
  - When：提交
  - Then：用户能看到可理解的错误信息（至少不吞错、不 silent-fail）

### 2) 连接 API（接口级）
建议新增 `tests/api/connections.spec.ts`：
- **缺失 x-user-id header**
  - GET `/api/connections` → 400
- **创建非法 payload**
  - POST `/api/connections` → 400 + `{ error:'Validation error', details:[...] }`
- **host 携带端口的防御性修复**
  - POST `host: "1.2.3.4:2222"` → 存储后 `host="1.2.3.4"` 且 `port=2222`
- **跨用户隔离**
  - user A 创建后：user B GET list 为空；GET single(A 的 id) 返回 404/Unauthorized（以现有实现为准锁定行为）

### 3) Terminal（Layer 2：错误路径 + 关键事件）
建议扩展 `tests/e2e/ssh-terminal.spec.ts`：
- **Connection not found**
  - Given：一个不存在的 `connectionId`（或连接被删除）
  - When：尝试连接
  - Then：错误条（`data-testid="error-message"`）出现；状态显示“连接失败”
- **Unauthorized**
  - Given：user A 创建连接，但页面 localStorage 使用 user B
  - When：尝试连接
  - Then：显示 Unauthorized 错误
- **认证失败**
  - Given：错误密码/错误私钥
  - When：连接
  - Then：显示连接失败 + 错误信息
- **resize 行为（最低要求）**
  - Given：终端页打开
  - When：改变 viewport（触发 resize）
  - Then：页面不崩溃；状态栏仍可见；（可选：加入更强后端观测）
- **kill-session 行为**
  - Given：终端已连接（或至少进入终端页）
  - When：点击“断开”（触发 kill-session）→再连接同一连接
  - Then：不会复用旧会话（通过 UI 的“（复用）”标识断言）

### 4) Terminal（Layer 3：真实 SSH 深度）
在具备稳定 SSH 测试环境后补齐：
- **真实命令输出**
  - When：发送 `echo "__pw_marker__"` / `pwd`
  - Then：终端输出出现 marker
- **会话复用 + 历史回放**
  - Given：产生 marker 输出
  - When：刷新/重新进入
  - Then：显示 `已连接（复用）` 且历史回放包含 marker
- **tmux 分支（50 行回放策略）**
  - Given：预置 tmux 会话并输出大量行，确保后端识别 tmux
  - Then：回放行数策略与显示效果稳定（不乱码）

---

## 稳定性策略（减少 flaky）

- **串行执行**：保持 `workers=1`（尤其在复用同一 `user_id` + 存在 cleanup 的情况下）。
- **命名隔离**：为每条用例生成唯一 `name` 前缀（如 `pw-<suite>-<case>-<timestamp>`），清理只清理该前缀。
- **清理粒度**：
  - CRUD 用例：可清理“该 suite 前缀”的连接
  - 复用/历史类用例：需要保留同一连接跨步骤复用，避免 beforeEach 全清
- **可观测点优先**：
  - 对“复用/新建”这种内部状态，优先通过 UI 文案或 `data-testid` 暴露，避免依赖时序与隐式行为。

---

## 实施建议（建议顺序）

1. 新增 `tests/api/connections.spec.ts`（接口级，先把后端行为锁住）
2. 扩展 `tests/e2e/connection-crud.spec.ts`（编辑/删除/校验失败）
3. 在 `Terminal` 状态栏加入“复用会话”UI 标识
4. 扩展 `tests/e2e/ssh-terminal.spec.ts`（错误路径、kill-session、resize）
5. 在具备稳定 SSH 测试环境后，追加 Layer 3（命令输出/历史/tmux）

