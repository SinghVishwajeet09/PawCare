import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, MapPin, RadioTower } from 'lucide-react';
import { apiFetch } from '../api';

const RescueBoard = () => {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadAlerts = async () => {
    const data = await apiFetch('/rescues');
    setAlerts(data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAlerts().catch((err) => setError(err.message));
  }, []);

  const updateAlert = async (id, status) => {
    setError('');
    setMessage('');

    try {
      await apiFetch(`/rescues/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setMessage(status === 'Resolved' ? 'Rescue marked resolved.' : 'Rescue accepted.');
      await loadAlerts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="rescue-page">
      <section className="page-title compact">
        <div>
          <span className="eyebrow">Live response</span>
          <h1><AlertCircle size={30} /> Rescue board</h1>
        </div>
      </section>

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <section className="alert-grid">
        {alerts.map((alert) => {
          const animal = alert.animalId;
          const attempts = alert.notificationAttempts || [];
          const sent = attempts.filter((attempt) => attempt.status === 'sent').length;

          return (
            <article className="alert-card" key={alert._id}>
              <div className="alert-topline">
                <span className={`badge ${alert.status === 'Reported' ? 'badge-injured' : 'badge-rescue'}`}>
                  {alert.status}
                </span>
                <span><Clock size={15} /> {new Date(alert.createdAt).toLocaleString()}</span>
              </div>

              <h2>{animal?.animalType || 'Animal report'}</h2>
              <p>{animal?.description || 'Details unavailable'}</p>

              <div className="alert-meta">
                <span><MapPin size={16} /> {animal?.locationDetails?.district || 'District not saved'}, {animal?.locationDetails?.state || 'State not saved'}</span>
                <span><RadioTower size={16} /> {sent}/{attempts.length} notifications sent</span>
              </div>

              {!!alert.nearbyNgos?.length && (
                <div className="mini-stack">
                  {alert.nearbyNgos.slice(0, 3).map((ngo) => (
                    <span key={`${alert._id}-${ngo.sourceId}`}>{ngo.name}</span>
                  ))}
                </div>
              )}

              <div className="button-row">
                {alert.status === 'Reported' && (
                  <button className="btn btn-primary" onClick={() => updateAlert(alert._id, 'In Progress')}>
                    Accept rescue
                  </button>
                )}
                {alert.status === 'In Progress' && (
                  <button className="btn btn-secondary" onClick={() => updateAlert(alert._id, 'Resolved')}>
                    <CheckCircle size={18} />
                    Mark resolved
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {!alerts.length && (
        <div className="empty-state">
          <AlertCircle size={32} />
          <p>No rescue alerts yet.</p>
        </div>
      )}
    </main>
  );
};

export default RescueBoard;
