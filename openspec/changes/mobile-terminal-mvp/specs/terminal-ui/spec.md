## ADDED Requirements

### Requirement: 终端界面显示
系统 SHALL 提供类似 macOS Terminal 的终端界面。

#### Scenario: 终端启动
- **WHEN** 用户成功连接 SSH
- **THEN** 系统显示终端界面

#### Scenario: 终端输出
- **WHEN** SSH 有输出
- **THEN** 终端实时显示输出内容

### Requirement: 用户输入
系统 SHALL 接收并处理用户的键盘输入。

#### Scenario: 输入字符
- **WHEN** 用户在终端输入字符
- **THEN** 输入通过 SSH 发送到远程主机

#### Scenario: 输入特殊键
- **WHEN** 用户通过工具栏点击特殊键
- **THEN** 对应的特殊键序列发送到远程主机

### Requirement: 手机端特殊工具栏
系统 SHALL 提供手机端特殊工具栏。

#### Scenario: 工具栏显示
- **WHEN** 用户在终端页面
- **THEN** 屏幕底部显示工具栏

#### Scenario: 工具栏按钮
- **WHEN** 用户点击工具栏按钮
- **THEN** 对应的按键输入发送到终端

### Requirement: 响应式设计
系统 SHALL 适配不同屏幕尺寸。

#### Scenario: 竖屏显示
- **WHEN** 设备处于竖屏模式
- **THEN** 终端自适应屏幕宽度

#### Scenario: 横屏显示
- **WHEN** 设备处于横屏模式
- **THEN** 终端利用更宽的显示空间

### Requirement: 终端自动调整大小
系统 SHALL 终端大小自动适应容器。

#### Scenario: 窗口大小变化
- **WHEN** 浏览器窗口大小变化
- **THEN** 终端自动调整行列数
