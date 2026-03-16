## ADDED Requirements

### Requirement: 创建 SSH 连接配置
系统 SHALL 允许用户创建 SSH 连接配置。

#### Scenario: 成功创建连接配置
- **WHEN** 用户填写连接名称、主机地址、端口、用户名、认证方式等信息
- **THEN** 系统保存连接配置到后端数据库

#### Scenario: 认证方式选择密码
- **WHEN** 用户选择密码认证方式
- **THEN** 系统显示密码输入框

#### Scenario: 认证方式选择私钥
- **WHEN** 用户选择私钥认证方式
- **THEN** 系统显示私钥输入框和私钥密码输入框（可选）

### Requirement: 保存 SSH 连接配置
系统 SHALL 按 user_id 保存和加载用户的 SSH 连接配置。

#### Scenario: 首次访问
- **WHEN** 用户首次访问应用
- **THEN** 系统显示空的连接列表

#### Scenario: 再次访问
- **WHEN** 用户再次访问应用
- **THEN** 系统加载并显示该 user_id 对应的连接列表

### Requirement: 显示连接列表
系统 SHALL 显示用户的 SSH 连接列表。

#### Scenario: 显示连接信息
- **WHEN** 用户查看连接列表
- **THEN** 每个连接显示名称、主机地址、最后使用时间

### Requirement: 编辑 SSH 连接配置
系统 SHALL 允许用户编辑已保存的 SSH 连接配置。

#### Scenario: 成功编辑连接
- **WHEN** 用户点击编辑按钮并修改连接信息
- **THEN** 系统更新连接配置

### Requirement: 删除 SSH 连接配置
系统 SHALL 允许用户删除已保存的 SSH 连接配置。

#### Scenario: 成功删除连接
- **WHEN** 用户点击删除按钮并确认
- **THEN** 系统从数据库中删除该连接配置

### Requirement: 加密存储敏感信息
系统 SHALL 加密存储所有敏感信息（密码、私钥）。

#### Scenario: 加密存储密码
- **WHEN** 用户保存密码
- **THEN** 密码在存储前进行加密

#### Scenario: 加密存储私钥
- **WHEN** 用户保存私钥
- **THEN** 私钥在存储前进行加密
