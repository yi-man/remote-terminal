import React, { useState } from 'react';
import { SSHConnection, CreateSSHConnection, UpdateSSHConnection } from '../types';

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

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：我的 Mac"
          />
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

              // 防御性修复：如果输入包含端口号，自动分离
              if (host.includes(':')) {
                const parts = host.split(':');
                if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
                  host = parts[0].trim();
                  port = parseInt(parts[1]);
                }
              }

              setFormData((prev) => ({ ...prev, host, port }));
            }}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="192.168.1.100"
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            端口
          </label>
          <input
            type="number"
            required
            value={formData.port}
            onChange={(e) => setFormData((prev) => ({ ...prev, port: parseInt(e.target.value) }))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="22"
          />
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
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="username"
          />
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
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
            />
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
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={6}
                placeholder="-----BEGIN RSA PRIVATE KEY-----..."
              />
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
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300">
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
