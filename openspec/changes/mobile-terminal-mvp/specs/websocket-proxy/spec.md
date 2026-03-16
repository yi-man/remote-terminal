## ADDED Requirements

### Requirement: WebSocket 连接建立
系统 SHALL 通过 WebSocket 建立浏览器与后端的连接。

#### Scenario: 连接建立
- **WHEN** 用户点击连接
- **THEN** 浏览器与后端建立 WebSocket 连接

### Requirement: SSH 连接代理
系统 SHALL 通过 WebSocket 代理 SSH 通信。

#### Scenario: 终端输出转发
- **WHEN** SSH 有输出
- **THEN** 后端通过 WebSocket 转发到浏览器

#### Scenario: 终端输入转发
- **WHEN** 浏览器有输入
- **THEN** 后端通过 SSH 转发到远程主机

### Requirement: 会话保持
系统 SHALL 在手机端断开后保持 SSH 连接一段时间。

#### Scenario: 手机端断开
- **WHEN** 手机端 WebSocket 断开
- **THEN** 后端保持 SSH 连接一段时间（默认 10 分钟）

#### Scenario: 手机端重新连接
- **WHEN** 手机端在保持时间内重新连接
- **THEN** 后端自动恢复会话

### Requirement: SSH 连接优雅断开
系统 SHALL 在保持时间后优雅断开 SSH 连接。

#### Scenario: 保持时间到达
- **WHEN** 手机端断开超过保持时间
- **THEN** 后端优雅断开 SSH 连接
