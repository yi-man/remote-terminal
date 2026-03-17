# 路由重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将单文件 App.tsx 重构为使用 React Router v6 的多页面架构

**Architecture:** 保持现有功能不变，逐步将视图分离到独立页面组件，使用路由进行导航。每个页面保持对现有组件（ConnectionList、ConnectionForm、Terminal）的复用，只重构应用根组件和导航逻辑。

**Tech Stack:** React 18 + TypeScript + React Router v6

---

## 前置要求

当前项目已具备：
- React 18, TypeScript, Vite, Tailwind CSS
- 完整的组件库（ConnectionList, ConnectionForm, Terminal 等）
- 自定义钩子（useUserId, useSSHConnections）
- E2E 测试（Playwright）

---

## Task 1: 安装 React Router v6 依赖

**Files:**
- Modify: `frontend/package.json`

**Step 1: 安装依赖**

```bash
cd frontend
pnpm add react-router-dom
pnpm add -D @types/react-router-dom
```

**Step 2: 验证安装**

检查 `frontend/package.json` 的 dependencies 中是否包含 `"react-router-dom"`

**Step 3: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "build: add react-router-dom v6 dependency"
```

---

## Task 2: 创建 PageLayout 布局组件

**Files:**
- Create: `frontend/src/layouts/PageLayout.tsx`

**Step 1: 创建目录和文件**

```bash
mkdir -p frontend/src/layouts
```

**Step 2: 实现 PageLayout**

```tsx
// frontend/src/layouts/PageLayout.tsx
import { PropsWithChildren } from 'react';

export function PageLayout({ children }: PropsWithChildren) {
  return (
    <div className="h-full bg-gray-900 text-white">
      {children}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/layouts/PageLayout.tsx
git commit -m "feat: add PageLayout component"
```

---

## Task 3: 创建 pages 目录和骨架页面

**Files:**
- Create: `frontend/src/pages/ConnectionListPage.tsx`
- Create: `frontend/src/pages/ConnectionCreatePage.tsx`
- Create: `frontend/src/pages/ConnectionEditPage.tsx`
- Create: `frontend/src/pages/TerminalPage.tsx`

**Step 1: 创建目录**

```bash
mkdir -p frontend/src/pages
```

**Step 2: 创建 ConnectionListPage 骨架**

```tsx
// frontend/src/pages/ConnectionListPage.tsx
export function ConnectionListPage() {
  return <div>ConnectionListPage</div>;
}
```

**Step 3: 创建 ConnectionCreatePage 骨架**

```tsx
// frontend/src/pages/ConnectionCreatePage.tsx
export function ConnectionCreatePage() {
  return <div>ConnectionCreatePage</div>;
}
```

**Step 4: 创建 ConnectionEditPage 骨架**

```tsx
// frontend/src/pages/ConnectionEditPage.tsx
export function ConnectionEditPage() {
  return <div>ConnectionEditPage</div>;
}
```

**Step 5: 创建 TerminalPage 骨架**

```tsx
// frontend/src/pages/TerminalPage.tsx
export function TerminalPage() {
  return <div>TerminalPage</div>;
}
```

**Step 6: Commit**

```bash
git add frontend/src/pages/
git commit -m "feat: add skeleton page components"
```

---

## Task 4: 创建 AppRoutes 路由配置

**Files:**
- Create: `frontend/src/routes/AppRoutes.tsx`

**Step 1: 创建目录和文件**

```bash
mkdir -p frontend/src/routes
```

**Step 2: 实现 AppRoutes**

```tsx
// frontend/src/routes/AppRoutes.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConnectionListPage } from '../pages/ConnectionListPage';
import { ConnectionCreatePage } from '../pages/ConnectionCreatePage';
import { ConnectionEditPage } from '../pages/ConnectionEditPage';
import { TerminalPage } from '../pages/TerminalPage';
import { PageLayout } from '../layouts/PageLayout';
import { useUserId } from '../hooks/useUserId';

export function AppRoutes() {
  const userId = useUserId();

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <PageLayout>
        <Routes>
          <Route path="/" element={<ConnectionListPage />} />
          <Route path="/create" element={<ConnectionCreatePage />} />
          <Route path="/connections/:id/edit" element={<ConnectionEditPage />} />
          <Route path="/connections/:id/terminal" element={<TerminalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/routes/AppRoutes.tsx
git commit -m "feat: add AppRoutes component"
```

---

## Task 5: 重构 App.tsx 使用新路由

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: 备份当前 App.tsx（可选但安全）**

```bash
cp frontend/src/App.tsx frontend/src/App.tsx.backup
```

**Step 2: 重写 App.tsx**

```tsx
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return <AppRoutes />;
}

export default App;
```

**Step 3: 启动开发服务器验证**

```bash
cd frontend
pnpm dev
```

访问 http://localhost:5173 应该能看到 "ConnectionListPage"

**Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "refactor: use AppRoutes instead of state machine"
```

---

## Task 6: 实现 ConnectionListPage

**Files:**
- Modify: `frontend/src/pages/ConnectionListPage.tsx`

**Step 1: 实现完整的 ConnectionListPage**

从原始 App.tsx 中提取 list 视图的逻辑：

```tsx
// frontend/src/pages/ConnectionListPage.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import { useSSHConnections } from '../hooks/useSSHConnections';
import { ConnectionList } from '../components/ConnectionList';
import type { SSHConnection } from '../types';

export function ConnectionListPage() {
  const userId = useUserId()!;
  const navigate = useNavigate();
  const { connections, loading, error, createConnection, updateConnection, deleteConnection } =
    useSSHConnections(userId);

  const handleConnect = (connection: SSHConnection) => {
    navigate(`/connections/${connection.id}/terminal`);
  };

  const handleEdit = (connection: SSHConnection) => {
    navigate(`/connections/${connection.id}/edit`);
  };

  const handleDelete = async (connection: SSHConnection) => {
    if (confirm(`确定要删除连接 "${connection.name}" 吗？`)) {
      await deleteConnection(connection.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Remote Terminal</h1>
        <Link
          to="/create"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + 新连接
        </Link>
      </div>
      <div className="flex-1 overflow-auto">
        <ConnectionList
          connections={connections}
          loading={loading}
          error={error}
          onConnect={handleConnect}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
```

**Step 2: 启动开发服务器验证**

```bash
cd frontend
pnpm dev
```

应该能看到连接列表页面

**Step 3: Commit**

```bash
git add frontend/src/pages/ConnectionListPage.tsx
git commit -m "feat: implement ConnectionListPage"
```

---

## Task 7: 实现 ConnectionCreatePage

**Files:**
- Modify: `frontend/src/pages/ConnectionCreatePage.tsx`

**Step 1: 实现 ConnectionCreatePage**

```tsx
// frontend/src/pages/ConnectionCreatePage.tsx
import { useNavigate } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import { useSSHConnections } from '../hooks/useSSHConnections';
import { ConnectionForm } from '../components/ConnectionForm';

export function ConnectionCreatePage() {
  const userId = useUserId()!;
  const navigate = useNavigate();
  const { createConnection } = useSSHConnections(userId);

  const handleSubmit = async (data: any) => {
    await createConnection({ ...data, user_id: userId });
    navigate('/');
  };

  return (
    <div className="h-full bg-gray-900 overflow-auto">
      <div className="sticky top-0 flex items-center px-4 py-4 bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors mr-4"
        >
          ← 返回
        </button>
      </div>
      <ConnectionForm onSubmit={handleSubmit} onCancel={() => navigate('/')} />
    </div>
  );
}
```

**Step 2: 启动开发服务器验证**

访问 http://localhost:5173/create 应该能看到创建连接表单

**Step 3: Commit**

```bash
git add frontend/src/pages/ConnectionCreatePage.tsx
git commit -m "feat: implement ConnectionCreatePage"
```

---

## Task 8: 实现 ConnectionEditPage

**Files:**
- Modify: `frontend/src/pages/ConnectionEditPage.tsx`

**Step 1: 实现 ConnectionEditPage**

```tsx
// frontend/src/pages/ConnectionEditPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUserId } from '../hooks/useUserId';
import { useSSHConnections } from '../hooks/useSSHConnections';
import { ConnectionForm } from '../components/ConnectionForm';
import type { SSHConnection } from '../types';

export function ConnectionEditPage() {
  const { id } = useParams<{ id: string }>();
  const userId = useUserId()!;
  const navigate = useNavigate();
  const { connections, updateConnection } = useSSHConnections(userId);
  const [connection, setConnection] = useState<SSHConnection | null>(null);

  useEffect(() => {
    const found = connections.find((c) => c.id === id);
    if (found) {
      setConnection(found);
    }
  }, [connections, id]);

  const handleSubmit = async (data: any) => {
    if (!id) return;
    await updateConnection(id, data);
    navigate('/');
  };

  if (!connection) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center text-white">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 overflow-auto">
      <div className="sticky top-0 flex items-center px-4 py-4 bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors mr-4"
        >
          ← 返回
        </button>
      </div>
      <ConnectionForm connection={connection} onSubmit={handleSubmit} onCancel={() => navigate('/')} />
    </div>
  );
}
```

**Step 2: 启动开发服务器验证**

点击某个连接的"编辑"按钮，应该能看到编辑表单

**Step 3: Commit**

```bash
git add frontend/src/pages/ConnectionEditPage.tsx
git commit -m "feat: implement ConnectionEditPage"
```

---

## Task 9: 实现 TerminalPage

**Files:**
- Modify: `frontend/src/pages/TerminalPage.tsx`

**Step 1: 实现 TerminalPage**

```tsx
// frontend/src/pages/TerminalPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal } from '../components/Terminal';

export function TerminalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/');
    return null;
  }

  return <Terminal connectionId={id} onDisconnect={() => navigate('/')} />;
}
```

**Step 2: 启动开发服务器验证**

点击某个连接的"连接"按钮，应该能看到终端页面

**Step 3: Commit**

```bash
git add frontend/src/pages/TerminalPage.tsx
git commit -m "feat: implement TerminalPage"
```

---

## Task 10: 运行并修复 E2E 测试

**Files:**
- Modify: `frontend/tests/e2e/connection-crud.spec.ts`

**Step 1: 运行 E2E 测试**

```bash
cd frontend
pnpm test:e2e
```

**Step 2: 修复测试中的导航**

如果测试使用点击操作，通常不需要修改。如果使用 URL 导航，可能需要更新。主要变化：
- 创建连接从 `/create` 而不是通过点击按钮（如果有直接 URL 导航）
- 编辑连接从 `/connections/:id/edit`
- 终端从 `/connections/:id/terminal`

**Step 3: 重新运行测试确保通过**

```bash
pnpm test:e2e
```

**Step 4: Commit（如果有修改）**

```bash
git add frontend/tests/
git commit -m "test: update e2e tests for new routes"
```

---

## Task 11: 清理备份文件

**Files:**
- Delete: `frontend/src/App.tsx.backup`

**Step 1: 删除备份文件**

```bash
rm -f frontend/src/App.tsx.backup
```

**Step 2: Commit**

```bash
git add -u
git commit -m "chore: remove backup file"
```

---

## Task 12: 完整功能验证

**Step 1: 启动完整的前后端**

打开两个终端：

```bash
# 终端 1 - 后端
cd backend
pnpm dev

# 终端 2 - 前端
cd frontend
pnpm dev
```

**Step 2: 手动测试功能**

1. 访问 http://localhost:5173/
2. 创建一个新连接
3. 编辑该连接
4. 连接到该连接（如果有真实 SSH 服务器）
5. 断开连接
6. 删除连接

**Step 3: 检查浏览器历史**

确保浏览器的前进/后退按钮正常工作

---

## 最终步骤：验证 git 历史

```bash
git log --oneline -12
```

应该能看到：
- build: add react-router-dom v6 dependency
- feat: add PageLayout component
- feat: add skeleton page components
- feat: add AppRoutes component
- refactor: use AppRoutes instead of state machine
- feat: implement ConnectionListPage
- feat: implement ConnectionCreatePage
- feat: implement ConnectionEditPage
- feat: implement TerminalPage
- test: update e2e tests (如果有修改)
- chore: remove backup file

---

## 回滚方案（如果需要）

如果遇到问题，可以逐步回滚：

```bash
# 回滚到重构前
git reset --hard HEAD~12
```

---

Plan complete and saved to `docs/plans/2026-03-17-routing-refactor-implementation.md`.

**两个执行选项:**

**1. Subagent-Driven（本会话）** - 我为每个任务分派独立的子代理，任务之间进行代码审查，快速迭代

**2. Parallel Session（独立会话）** - 使用 executing-plans 打开新会话，批量执行并设置检查点

**你想选择哪种方式？**
