import React, { useEffect, useState } from 'react';
import { checkHealth, HealthStatus } from '../lib/api';

export default function HealthStatusWidget() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    checkHealth()
      .then(res => {
        setStatus(res);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Health check failed');
        setStatus(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-2 text-sm text-gray-500">Checking backend health...</div>;
  if (error) return <div className="p-2 text-sm text-red-600">Health error: {error}</div>;
  if (!status) return <div className="p-2 text-sm text-red-600">No health data.</div>;

  return (
    <div className="p-2 border rounded text-sm" style={{ maxWidth: 320 }}>
      <div><strong>Backend Health</strong></div>
      <div>Status: <span className={status.status === 'ok' ? 'text-green-600' : 'text-yellow-600'}>{status.status}</span></div>
      <div>DB: <span className={status.db?.connected ? 'text-green-600' : 'text-red-600'}>{status.db?.connected ? 'Connected' : 'Disconnected'}</span></div>
      {status.db?.latencyMs !== undefined && (
        <div>DB Latency: {status.db.latencyMs} ms</div>
      )}
      <div>Checked: {new Date(status.timestamp).toLocaleString()}</div>
      {status.db?.error && <div className="text-red-600">Error: {status.db.error}</div>}
    </div>
  );
}
