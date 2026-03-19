import React, { useState } from 'react';
import { SSHConnection, CreateSSHConnection, UpdateSSHConnection } from '../types';
import { validateSSHConnection } from '../hooks/useSSHConnectionValidation';

interface ConnectionFormProps {
  connection?: SSHConnection;
  onSubmit: (data: CreateSSHConnection | UpdateSSHConnection) => Promise<void>;
  onCancel: () => void;
}

export function ConnectionForm({ connection, onSubmit, onCancel }: ConnectionFormProps) {
  const [formData, setFormData] = useState({
    name: connection?.name || '',
    host: connection?.host || '',
    port: connection?.port || 22,
    username: connection?.username || '',
    auth_type: connection?.auth_type || 'password',
    password: '',
    private_key: '',
    passphrase: '',
    terminal_type: connection?.terminal_type || 'xterm-256color',
    font_size: connection?.font_size || 14,
    theme: connection?.theme || 'dark',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 前端验证
    const validationResult = validateSSHConnection.create(formData);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map(issue => issue.message)
        .join('\n');
      setError(errorMessages);
      setLoading(false);
      return;
    }

    try {
      await onSubmit(validationResult.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 实时字段验证函数
  const getFormFieldErrors = (fieldName: keyof typeof formData) => {
    const result = validateSSHConnection.create(formData);
    if (result.success) return null;

    const fieldErrors = result.error.issues
      .filter(issue => issue.path[0] === fieldName)
      .map(issue => issue.message);

    return fieldErrors.length > 0 ? fieldErrors[0] : null;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">
        {connection ? '编辑连接' : '创建新连接'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            连接名称
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('name') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="例如：我的 Mac"
          />
          {getFormFieldErrors('name') && (
            <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('name')}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            主机地址
          </label>
          <input
            type="text"
            required
            value={formData.host}
            onChange={(e) => {
              let host = e.target.value.trim();
              let port = formData.port;

              if (host.includes(':')) {
                const parts = host.split(':');
                if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
                  host = parts[0].trim();
                  port = parseInt(parts[1]);
                }
              }

              setFormData((prev) => ({ ...prev, host, port }));
            }}
            className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('host') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="192.168.1.100"
          />
          {getFormFieldErrors('host') && (
            <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('host')}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            端口
          </label>
          <input
            type="number"
            required
            value={formData.port}
            onChange={(e) => {
              // For `type="number"`, browsers can briefly provide `""` during edits.
              // `parseInt("")` becomes NaN, which makes Zod report "Invalid input".
              // Map empty to 0 so the Zod min(1) error message is consistent.
              const raw = e.target.value;
              const nextPort = raw === "" ? 0 : Number(raw);
              setFormData((prev) => ({ ...prev, port: nextPort }));
            }}
            className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('port') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="22"
          />
          {getFormFieldErrors('port') && (
            <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('port')}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            用户名
          </label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('username') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="username"
          />
          {getFormFieldErrors('username') && (
            <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('username')}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            认证方式
          </label>
          <select
            value={formData.auth_type}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, auth_type: e.target.value as any }))
            }
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="password">密码</option>
            <option value="privateKey">SSH 私钥</option>
          </select>
        </div>

        {formData.auth_type === 'password' && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              密码
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('password') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter password"
            />
            {getFormFieldErrors('password') && (
              <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('password')}</p>
            )}
          </div>
        )}

        {formData.auth_type === 'privateKey' && (
          <>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                私钥
              </label>
              <textarea
                value={formData.private_key}
                onChange={(e) => setFormData((prev) => ({ ...prev, private_key: e.target.value }))}
                className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('private_key') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm`}
                rows={6}
                placeholder="-----BEGIN RSA PRIVATE KEY-----..."
              />
              {getFormFieldErrors('private_key') && (
                <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('private_key')}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                私钥密码（可选）
              </label>
              <input
                type="password"
                value={formData.passphrase}
                onChange={(e) => setFormData((prev) => ({ ...prev, passphrase: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter passphrase (if any)"
              />
            </div>
          </>
        )}

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300 whitespace-pre-line">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
