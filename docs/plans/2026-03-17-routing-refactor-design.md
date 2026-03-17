# 路由重构设计文档

## 概述

将当前所有页面都集中在一个 `App.tsx` 文件中的架构重构为使用 React Router v6 的单页应用架构。每个功能视图将成为独立的页面组件，通过路由进行导航。

## 当前架构问题

- 所有页面逻辑集中在一个组件中，代码量大且难以维护
- 使用状态机管理视图切换，与标准 React 应用架构不符
- 无法利用路由相关的最佳实践（如代码分割、预加载、导航拦截等）
- 测试和调试变得复杂

## 目标

1. 实现清晰的页面分离
2. 采用标准的 React Router v6 架构
3. 保持功能完整性和用户体验不变
4. 提高代码的可维护性和扩展性

## 架构设计

### 1. 项目结构调整

```
frontend/src/
├── pages/                      # 新增：页面组件
│   ├── ConnectionListPage.tsx    # 连接列表页
│   ├── ConnectionCreatePage.tsx  # 创建连接页
│   ├── ConnectionEditPage.tsx    # 编辑连接页
│   └── TerminalPage.tsx          # 终端页面
├── layouts/                    # 新增：布局组件
│   └── PageLayout.tsx            # 页面基础布局
├── routes/                     # 新增：路由配置
│   └── AppRoutes.tsx             # 路由定义
├── components/                 # 保持不变
├── hooks/                      # 保持不变
├── api/                        # 保持不变
└── App.tsx                     # 重构：简化根组件
```

### 2. 路由配置

使用 `react-router-dom` v6 实现以下路由：

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `ConnectionListPage` | 首页，显示连接列表 |
| `/create` | `ConnectionCreatePage` | 创建新的 SSH 连接 |
| `/connections/:id/edit` | `ConnectionEditPage` | 编辑现有连接 |
| `/connections/:id/terminal` | `TerminalPage` | 终端会话页面 |

### 3. 组件职责

#### `PageLayout`
- 提供基础页面布局结构
- 处理背景色、全屏布局等
- 可以扩展以包含通用导航

#### `AppRoutes`
- 路由配置的入口点
- 集成 `useUserId` 钩子进行用户身份识别
- 渲染页面布局和路由匹配

#### `ConnectionListPage`
- 原 App.tsx 中的 list 视图
- 使用 `useSSHConnections` 钩子获取和管理连接数据
- 处理连接创建、编辑、删除、连接操作
- 渲染 ConnectionList 组件

#### `ConnectionCreatePage`
- 原 App.tsx 中的 create 视图
- 使用 ConnectionForm 组件
- 创建成功后导航回列表页

#### `ConnectionEditPage`
- 原 App.tsx 中的 edit 视图
- 通过 URL 参数获取连接 ID
- 使用 `useParams` 和 API 加载连接数据
- 使用 ConnectionForm 组件，传递初始值
- 保存后导航回列表页

#### `TerminalPage`
- 原 App.tsx 中的 terminal 视图
- 通过 URL 参数获取连接 ID
- 加载连接信息并建立 SSH 会话
- 渲染 Terminal 组件和 socket 通信
- 处理终端控制工具栏

### 4. 数据管理策略

- `useUserId` 和 `useSSHConnections` 保持不变，但会在更高层级使用
- 数据加载方式保持不变（REST API + hooks）
- 使用 URL 作为唯一真相来源，替代内部状态
- 通过 `useParams` 获取路由参数，通过 API 加载对应数据

## 实施计划

### 1. 准备工作
- 安装 React Router v6 依赖
- 检查并更新 tsconfig.json（如果需要）

### 2. 架构搭建
- 创建 `layouts/PageLayout.tsx`
- 创建 `routes/AppRoutes.tsx`
- 创建 `pages/` 目录和骨架页面组件

### 3. 页面重构
- 重构 `App.tsx` 为简化的根组件
- 实现 ConnectionListPage（基础页面和导航）
- 实现 ConnectionCreatePage 和 ConnectionEditPage
- 实现 TerminalPage 和路由导航逻辑

### 4. 验证和优化
- 运行所有测试（e2e 和单元测试）
- 测试路由导航和页面切换
- 修复可能的 bug 和边界情况

## 风险评估

### 低风险
- 技术方案成熟（React Router v6 是行业标准）
- 现有功能保持不变
- 渐进式重构允许增量验证

### 中等风险
- 可能需要更新测试文件（特别是 e2e 测试）
- 需要确保路由参数与 API 数据匹配

### 缓解措施
- 保持组件接口不变（ConnectionForm、ConnectionList、Terminal）
- 分步骤实施，确保每个页面功能正常
- 使用类型安全的路由参数

## 结论

本次重构将使代码架构更符合现代 React 应用标准，提高了可维护性和可扩展性，同时保持了原有的功能完整性。
