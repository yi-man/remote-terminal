import { SSHConnection } from '../types';

interface ConnectionListProps {
  connections: SSHConnection[];
  loading: boolean;
  error: string | null;
  onConnect: (connection: SSHConnection) => void;
  onEdit: (connection: SSHConnection) => void;
  onDelete: (connection: SSHConnection) => void;
}

export function ConnectionList({
  connections,
  loading,
  error,
  onConnect,
  onEdit,
  onDelete,
}: ConnectionListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 text-center">
          <p>还没有创建任何连接</p>
          <p className="text-sm mt-2">点击右上角按钮创建新连接</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg">{connection.name}</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {connection.username}@{connection.host}:{connection.port}
                </p>
                {connection.last_used_at && (
                  <p className="text-gray-500 text-xs mt-2">
                    最后使用: {new Date(connection.last_used_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(connection)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => onDelete(connection)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                >
                  删除
                </button>
                <button
                  onClick={() => onConnect(connection)}
                  className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  连接
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
