import { useState } from 'react';
import { useUserId } from './hooks/useUserId';
import { useSSHConnections } from './hooks/useSSHConnections';
import { ConnectionList } from './components/ConnectionList';
import { ConnectionForm } from './components/ConnectionForm';
import { Terminal } from './components/Terminal';
import { SSHConnection } from './types';

type View = 'list' | 'create' | 'edit' | 'terminal';

function App() {
  const userId = useUserId();
  const { connections, loading, error, createConnection, updateConnection, deleteConnection } =
    useSSHConnections(userId);

  const [view, setView] = useState<View>('list');
  const [selectedConnection, setSelectedConnection] = useState<SSHConnection | null>(null);

  const handleConnect = (connection: SSHConnection) => {
    setSelectedConnection(connection);
    setView('terminal');
  };

  const handleCreate = () => {
    setSelectedConnection(null);
    setView('create');
  };

  const handleEdit = (connection: SSHConnection) => {
    setSelectedConnection(connection);
    setView('edit');
  };

  const handleSubmitCreate = async (data: any) => {
    await createConnection({ ...data, user_id: userId });
    setView('list');
  };

  const handleSubmitEdit = async (data: any) => {
    if (!selectedConnection) return;
    await updateConnection(selectedConnection.id, data);
    setView('list');
  };

  const handleDelete = async (connection: SSHConnection) => {
    if (confirm(`确定要删除连接 "${connection.name}" 吗？`)) {
      await deleteConnection(connection.id);
    }
  };

  const handleDisconnect = () => {
    setSelectedConnection(null);
    setView('list');
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900">
      {view === 'list' && (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 bg-gray-800 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">Remote Terminal</h1>
            <button
              onClick={handleCreate}
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
      )}

      {(view === 'create' || view === 'edit') && (
        <div className="h-full bg-gray-900 overflow-auto">
          <div className="sticky top-0 flex items-center px-4 py-4 bg-gray-800 border-b border-gray-700">
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors mr-4"
            >
              ← 返回
            </button>
          </div>
          <ConnectionForm
            connection={view === 'edit' ? selectedConnection! : undefined}
            onSubmit={view === 'edit' ? handleSubmitEdit : handleSubmitCreate}
            onCancel={() => setView('list')}
          />
        </div>
      )}

      {view === 'terminal' && selectedConnection && (
        <Terminal
          connectionId={selectedConnection.id}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}

export default App;
