# Integration Tests Gap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 补齐 `frontend/tests` 的集成测试缺口（优先 Layer 1/2），并为 Terminal 复用会话提供稳定可断言的 UI 可观测点，降低 flaky。

**Architecture:** 以“接口级锁行为 + UI 级覆盖路径 + 最小可观测点”为主线推进。先用 Playwright `request` 覆盖 `/api/connections` 的缺失用例，随后扩展现有 e2e CRUD/Terminal 用例；为会话复用引入 `connected { reused: true }` 的前端状态，避免依赖时序/隐式输出。

**Tech Stack:** Playwright (`@playwright/test`), React 18 + TypeScript, Socket.IO, Fastify (后端已实现 `connected { reused: true }`), zod（后端校验错误结构）。

---

## Preconditions / How to run

- 在 `frontend/` 下运行 Playwright（会自动拉起前后端）：
  - Run: `pnpm -C frontend test:e2e`
  - 仅跑单文件：`pnpm -C frontend test:e2e -- tests/api/connections.spec.ts`
  - 仅跑单用例：`pnpm -C frontend test:e2e -- tests/e2e/connection-crud.spec.ts -g "should delete"`
- Playwright 配置：`frontend/playwright.config.ts` 已固定 `workers=1` 且 `fullyParallel=false`，适合避免 `user_id`/cleanup 相互影响。

## Conventions for new tests (stability)

- **User isolation:** 每个 `describe` 生成自己的 `TEST_USER_ID`（例如 `pw-it-<suite>-<timestamp>`），不要复用 `"playwright-test-user-id"`。
- **Name isolation:** 每条用例用 `namePrefix = "pw-<suite>-<case>-<timestamp>"`，仅清理该前缀的连接（避免误删其它 suite 的数据）。
- **Selectors:** 尽量使用 `data-testid`（已有：`terminal-page`, `terminal-container`, `error-message`, `connection-status`），减少依赖 Tailwind class / 文案。

---

### Task 1: Add Playwright API coverage for `/api/connections`

**Files:**
- Create: `frontend/tests/api/connections.spec.ts`
- Reference (existing helper): `frontend/tests/utils/api-helper.ts`
- Reference (existing baseline): `frontend/tests/api/health.spec.ts`

**Step 1: Write the failing test**

- Create `frontend/tests/api/connections.spec.ts` with these cases (先写断言，再实现 helper/结构化复用)：
  - missing `x-user-id` header → `400` + `{ error: "x-user-id header is required" }`
  - POST invalid payload → `400` + `{ error:"Validation error", details:[...] }`
  - host includes port defensive fix → create with `host:"1.2.3.4:2222"` returns `host:"1.2.3.4"` and `port:2222`
  - cross-user isolation → user A creates, user B GET list empty; user B GET single(A.id) returns `404` + `{ error:"Connection not found" }`

**Step 2: Run test to verify it fails**

- Run: `pnpm -C frontend test:e2e -- tests/api/connections.spec.ts`
- Expected: FAIL（文件不存在或断言不匹配，取决于实现进度）

**Step 3: Write minimal implementation**

- 实现测试，优先用 Playwright `request` 直接调用后端：
  - `await request.get("http://localhost:8080/api/connections", { headers: { "x-user-id": userId } })`
  - `await request.post(...)` 并 `await response.json()`
- 复用 payload：
  - 用 `frontend/tests/fixtures/test-data.ts` 的 `TEST_CONNECTION` 作为合法基准，再覆盖字段用于 invalid/cross-user/host:port 场景。

**Step 4: Run test to verify it passes**

- Run: `pnpm -C frontend test:e2e -- tests/api/connections.spec.ts`
- Expected: PASS

**Step 5: Commit**

```bash
git add frontend/tests/api/connections.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): add API coverage for connections

Lock down backend validation, host:port normalization, and cross-user isolation via Playwright request tests.
EOF
)"
```

---

### Task 2: Expand Connection CRUD e2e (edit, delete, validation failures)

**Files:**
- Modify: `frontend/tests/e2e/connection-crud.spec.ts`
- Reference (UI): `frontend/src/components/ConnectionForm.tsx`
- Reference (UI): `frontend/src/components/ConnectionList.tsx`
- Reference (API helper): `frontend/tests/utils/api-helper.ts`

**Step 1: Write the failing tests**

Add tests to `frontend/tests/e2e/connection-crud.spec.ts`:

- **Edit connection**
  - Arrange: use `APIHelper` 创建连接（避免 UI 前置太慢）
  - Act: 打开列表页，点击卡片“编辑”，修改 `name/host/port/username`，保存
  - Assert: 返回列表，展示更新后的 `name` 与 `username@host:port`

- **Delete connection**
  - Arrange: 预置 1 条连接
  - Act: 点击卡片“删除”
  - Assert: 卡片消失；并用 `APIHelper.getConnections()` 验证列表不包含该 id

- **Frontend form validation failure**
  - Arrange: 打开“新连接”
  - Act: 输入非法 `host`（例如 `invalid@host`）或非法 `port=0` 或 `username="bad name"`
  - Assert: 字段红字出现；点击“保存”仍停留表单（URL 不回到 `/`），且列表未出现该连接名

- **Backend 400 validation error surfaced**
  - Arrange: 构造会触发后端 `createConnectionSchema` 的 refine 错误（例如 `auth_type=password` + `password=""`）
  - Act: 提交
  - Assert: 页面展示错误信息（`ConnectionForm` 里 error block 可见，包含后端返回的 message 或聚合信息）

**Step 2: Run test to verify it fails**

- Run: `pnpm -C frontend test:e2e -- tests/e2e/connection-crud.spec.ts`
- Expected: FAIL（缺少新用例/选择器不匹配）

**Step 3: Minimal implementation / refactors to support tests**

- 在 `connection-crud.spec.ts` 内做最小“稳定性重构”：
  - `TEST_USER_ID` 改为 suite 内唯一值（参考本计划的 conventions）
  - cleanup 从 `cleanupAllConnections()` 改为仅清理 `namePrefix`（需要在 `APIHelper` 增加 `cleanupConnectionsByNamePrefix(prefix)` 或在测试中用 `getConnections()` 过滤后 delete）
- 若 UI selector 不稳：
  - 在 `ConnectionList` 的按钮上增加 `data-testid`（如 `connection-edit`, `connection-delete`, `connection-connect`，并带上 connection id），让 e2e 不再依赖中文文案
  - 在 `ConnectionForm` 的提交错误区域增加 `data-testid="connection-form-error"`

**Step 4: Run test to verify it passes**

- Run: `pnpm -C frontend test:e2e -- tests/e2e/connection-crud.spec.ts`
- Expected: PASS

**Step 5: Commit**

```bash
git add frontend/tests/e2e/connection-crud.spec.ts frontend/tests/utils/api-helper.ts frontend/src/components/ConnectionList.tsx frontend/src/components/ConnectionForm.tsx
git commit -m "$(cat <<'EOF'
test(e2e): cover connection edit/delete and validation errors

Add stable CRUD coverage with per-suite user isolation and deterministic selectors; ensure frontend surfaces backend validation failures.
EOF
)"
```

---

### Task 3: Expose "session reused" status in Terminal UI (for observability)

**Files:**
- Modify: `frontend/src/hooks/useWebSocket.ts`
- Modify: `frontend/src/components/Terminal.tsx`
- Reference (backend signal): `backend/src/plugins/socket.io.ts` (emits `connected` with `{ reused: true }`)
- Test: `frontend/tests/e2e/ssh-terminal.spec.ts`

**Step 1: Write the failing test**

Add a new test to `frontend/tests/e2e/ssh-terminal.spec.ts` that asserts reused-status changes across reconnect:

- Arrange: create a connection (via UI or API)
- Act:
  - connect → disconnect（点击“断开”，会触发 `kill-session`）
  - connect again
- Assert:
  - 第二次连接时状态栏不应显示“（复用）”

And a second test (optional, if environment supports real SSH reliably) for reuse without kill-session:

- Act:
  - connect → refresh page or navigate away without kill-session（需要产品行为定义：当前 `disconnect` 不会 remove session）
  - connect again
- Assert:
  - 状态栏显示“已连接（复用）”

**Step 2: Run test to verify it fails**

- Run: `pnpm -C frontend test:e2e -- tests/e2e/ssh-terminal.spec.ts -g "reused"`
- Expected: FAIL（UI 尚未展示 reused 状态）

**Step 3: Write minimal implementation**

- `useWebSocket.ts`
  - 在 `socket.on("connected", (data))` 中读取 `data?.reused === true`
  - 增加状态：`const [reused, setReused] = useState(false)`
  - connect 时先 `setReused(false)`（防止沿用旧状态）
  - disconnect 时 `setReused(false)`
  - return object 中暴露 `reused`
- `Terminal.tsx`
  - 使用 `reused` 决定状态文案：
    - `已连接` vs `已连接（复用）`
  - 给该文案增加稳定断言点：
    - 例如 `data-testid="connection-status-text"` 或在 `connection-status` 同级 span 上加 testid

**Step 4: Run test to verify it passes**

- Run: `pnpm -C frontend test:e2e -- tests/e2e/ssh-terminal.spec.ts -g "reused"`
- Expected: PASS（至少 kill-session 场景应可稳定断言；真实复用测试若环境不足可先跳过并写 TODO）

**Step 5: Commit**

```bash
git add frontend/src/hooks/useWebSocket.ts frontend/src/components/Terminal.tsx frontend/tests/e2e/ssh-terminal.spec.ts
git commit -m "$(cat <<'EOF'
feat(terminal): show session reuse status for testing

Track backend connected(reused) signal in websocket hook and surface it in the terminal status bar with stable test selectors.
EOF
)"
```

---

### Task 4: Expand Terminal e2e error paths + resize + kill-session behavior

**Files:**
- Modify: `frontend/tests/e2e/ssh-terminal.spec.ts`
- Reference (UI error): `frontend/src/components/Terminal.tsx` (`data-testid="error-message"`, status text)
- Reference (socket behavior): `backend/src/plugins/socket.io.ts` (error: Connection not found / Unauthorized; kill-session)

**Step 1: Write the failing tests**

Add tests in `ssh-terminal.spec.ts`:

- **Connection not found**
  - Act: 直接访问 `/terminal/<non-existent-id>`（按路由定义；若路径不同，先从现有测试中确认进入方式）
  - Assert: `data-testid="error-message"` 可见，包含 `Connection not found`；状态文字为 `连接失败`

- **Unauthorized**
  - Arrange: user A 创建连接
  - Act: 用 user B（localStorage `user_id`）访问同一 `connectionId` 的 terminal
  - Assert: error message 包含 `Unauthorized`；状态 `连接失败`

- **Resize minimal behavior**
  - Arrange: 打开 terminal 页
  - Act: `page.setViewportSize(...)` 触发 window resize
  - Assert: 页面不崩溃；`terminal-page` 与 status bar 仍可见

- **Kill-session behavior**
  - Arrange: connect
  - Act: 点击“断开”（当前实现会 emit `kill-session`）
  - Assert: 再次连接时不显示 `（复用）`（依赖 Task 3 的 UI）

**Step 2: Run test to verify it fails**

- Run: `pnpm -C frontend test:e2e -- tests/e2e/ssh-terminal.spec.ts`
- Expected: FAIL

**Step 3: Minimal implementation / selectors**

- 若路由路径不清晰：
  - 先在测试里通过列表页点击“连接”进入终端，拿到 URL pattern（例如 `/terminal/:id`）
- 若 Unauthorized / not-found 触发后页面没有调用 connect：
  - 确认 `TerminalPage.tsx` 会在 `id` 存在时渲染 `Terminal`，`Terminal` 的 `useEffect` 会立即 `connect(...)`，应能触发后端 error
- 如错误提示仅显示后端 message 字符串：
  - 测试断言只匹配稳定子串（`toContainText("Unauthorized")` 等）

**Step 4: Run test to verify it passes**

- Run: `pnpm -C frontend test:e2e -- tests/e2e/ssh-terminal.spec.ts`
- Expected: PASS（不要求真实 SSH 成功；只验证错误/状态/UI 不崩溃）

**Step 5: Commit**

```bash
git add frontend/tests/e2e/ssh-terminal.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): add terminal error, resize, and kill-session coverage

Cover not-found/unauthorized error rendering, basic resize stability, and ensure kill-session prevents session reuse.
EOF
)"
```

---

### Task 5 (Deferred / Layer 3): Real SSH outputs + history replay + tmux branch

**Files:**
- Modify: `frontend/tests/e2e/ssh-terminal.spec.ts`
- Reference: `backend/src/plugins/socket.io.ts` (history replay, tmux detection & last N lines policy)
- Reference helper: `frontend/tests/utils/ssh-helper.ts` (if present/usable for env provisioning)

**Step 1: Define a stable SSH test environment**

- Provide a known-good SSH server in CI (container or dedicated host) with:
  - deterministic user/password or test key
  - predictable shell prompt and locale
  - optional tmux installed

**Step 2: Add command marker test**

- Send `echo "__pw_marker__"` and assert output appears in terminal (requires stable way to read xterm buffer; may require adding a small “last output” debug buffer in frontend for tests only, or a `data-testid` mirror of recent output).

**Step 3: Add reuse + history replay test**

- Connect → send marker → refresh → assert `已连接（复用）` and marker is present in replayed content.

**Step 4: Add tmux branch test**

- Arrange: produce enough output lines to exceed thresholds
- Assert: replay policy (50 lines for tmux, 500 lines for normal) behaves as expected and renders without乱码。

**Step 5: Commit**

- Commit separately once environment is ready; keep Layer 1/2 green first.

---

## Acceptance Criteria

- `pnpm -C frontend test:e2e` 全绿（Layer 1/2 用例），且不依赖真实 SSH 成功连接。
- 新增的 API / e2e 用例在本地重复运行 5 次（`--repeat-each 5`）不应出现明显 flaky（目标：零失败）。
- Terminal 状态栏能稳定展示 `已连接（复用）`（当后端发出 `connected { reused:true }` 时），并具备 `data-testid` 供断言。

## Notes / Known constraints

- 当前后端 `/api/connections/:id` 在跨用户访问时返回 `404 Connection not found`（不是 401/403）。测试应以此为准锁定行为。
- 现有 e2e 里多个 suite 仍可能共享同一个 user_id；本计划要求逐步改为 per-suite 生成并配套 prefix 清理，以避免未来启用并发时互相污染。

