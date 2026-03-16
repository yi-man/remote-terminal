import { useState, useEffect, useCallback } from 'react';
import { getAPIClient } from '../api/client';
import type { SSHConnection, CreateSSHConnection, UpdateSSHConnection } from '../types';

export function useSSHConnections(userId: string) {
  const [connections, setConnections] = useState<SSHConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = getAPIClient(userId);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await client.getSSHConnections();
      setConnections(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [client]);

  const createConnection = useCallback(
    async (connection: CreateSSHConnection): Promise<SSHConnection> => {
      const created = await client.createSSHConnection(connection);
      setConnections((prev) => [...prev, created]);
      return created;
    },
    [client]
  );

  const updateConnection = useCallback(
    async (id: string, updates: UpdateSSHConnection): Promise<SSHConnection> => {
      const updated = await client.updateSSHConnection(id, updates);
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? updated : c))
      );
      return updated;
    },
    [client]
  );

  const deleteConnection = useCallback(
    async (id: string): Promise<void> => {
      await client.deleteSSHConnection(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    },
    [client]
  );

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return {
    connections,
    loading,
    error,
    fetchConnections,
    createConnection,
    updateConnection,
    deleteConnection,
  };
}
