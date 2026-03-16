## ADDED Requirements

### Requirement: 浏览器指纹生成
系统 SHALL 使用 FingerprintJS2 生成浏览器指纹作为 user_id。

#### Scenario: 首次访问
- **WHEN** 用户首次访问
- **THEN** 系统生成浏览器指纹作为 user_id

#### Scenario: 指纹保存
- **WHEN** 指纹生成后
- **THEN** 指纹保存到 localStorage 作为 user_id

### Requirement: 浏览器指纹加载
系统 SHALL 从 localStorage 加载已保存的浏览器指纹。

#### Scenario: 再次访问
- **WHEN** 用户再次访问
- **THEN** 系统从 localStorage 加载指纹作为 user_id

#### Scenario: 指纹用于标识
- **WHEN** 系统加载指纹后
- **THEN** 指纹作为用户唯一标识（user_id）
