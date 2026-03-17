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
