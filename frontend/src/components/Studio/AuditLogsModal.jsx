import React, { useState, useEffect } from 'react';

export default function AuditLogsModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  async function fetchLogs() {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/email/logs?limit=50');
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.logs)) {
        setLogs(data.data.logs);
      } else {
        setLogs([]);
      }
    } catch (err) {
      setErrorMsg('Failed to load database logs: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.recipient && log.recipient.toLowerCase().includes(q)) ||
      (log.category && log.category.toLowerCase().includes(q)) ||
      (log.status && log.status.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card" style={{ maxWidth: '850px' }}>
        <div class="modal-header">
          <div class="modal-title">📋 MSSQL Outbound Delivery Logs</div>
          <button type="button" class="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div class="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <input
              type="text"
              class="form-control"
              style={{ maxWidth: '320px' }}
              placeholder="Search recipient, template or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onClick={fetchLogs}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--color-danger)', fontSize: '12px', marginBottom: '12px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            {isLoading && logs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-dim)' }}>
                Querying MSSQL EmailLog records...
              </p>
            ) : filteredLogs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-dim)' }}>
                No delivery logs found.
              </p>
            ) : (
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Recipient</th>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Message ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id || log.createdAt}>
                      <td style={{ color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.recipient}</td>
                      <td>
                        <span class="badge" style={{ fontSize: '10px' }}>
                          {log.category || 'CUSTOM'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          color: log.status === 'SENT' ? 'var(--color-success)' : 'var(--color-danger)',
                          fontWeight: 700,
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {log.deliveryDurationMs ? `${log.deliveryDurationMs}ms` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-dim)' }}>
                        {log.messageId ? log.messageId.slice(0, 16) + '...' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
