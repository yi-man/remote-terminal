import { useNavigate } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';
import { useSSHConnections } from '../hooks/useSSHConnections';
import { ConnectionForm } from '../components/ConnectionForm';
import type { CreateSSHConnection, UpdateSSHConnection } from '../types';

export function ConnectionCreatePage() {
  const userId = useUserId()!;
  const navigate = useNavigate();
  const { createConnection } = useSSHConnections(userId);

  const handleSubmit = async (data: CreateSSHConnection | UpdateSSHConnection) => {
    await createConnection({ ...data, user_id: userId } as CreateSSHConnection);
    navigate('/');
  };

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
      <ConnectionForm onSubmit={handleSubmit} onCancel={() => navigate('/')} />
    </div>
  );
}
