import { useNavigate } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import { useSSHConnections } from '../hooks/useSSHConnections';
import { ConnectionList } from '../components/ConnectionList';
import type { SSHConnection } from '../types';

export function ConnectionListPage() {
  const userId = useUserId()!;
  const navigate = useNavigate();
  const { connections, loading, error, deleteConnection } =
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
        <button
          onClick={() => navigate('/create')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + 新连接
        </button>
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
