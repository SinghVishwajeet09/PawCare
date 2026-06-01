import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, ClipboardList, Crosshair, MapPin, Send, Utensils } from 'lucide-react';
import { apiFetch } from '../api';
import MapComponent from '../components/MapComponent';

const initialReport = {
  animalType: '',
  status: 'Hungry',
  urgency: 'Medium',
  assistanceType: 'Food',
  description: '',
  address: '',
  district: '',
  state: '',
  latitude: '',
  longitude: '',
  photoUrl: ''
};

const Home = () => {
  const [animals, setAnimals] = useState([]);
  const [activeFeeders, setActiveFeeders] = useState(0);
  const [nearbyNgos, setNearbyNgos] = useState([]);
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notificationSummary, setNotificationSummary] = useState(null);

  const loadAnimals = async () => {
    const data = await apiFetch('/animals');
    setAnimals(data);
  };

  const loadActiveFeeders = async () => {
    const data = await apiFetch('/feed/active');
    setActiveFeeders(data.count || 0);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAnimals().catch((err) => setError(err.message));
    loadActiveFeeders().catch(() => {});
  }, []);

  useEffect(() => {
    const loadNgos = async () => {
      const query = new URLSearchParams();
      if (report.state) query.set('state', report.state);
      if (report.district) query.set('district', report.district);
      query.set('limit', '8');

      const data = await apiFetch(`/ngos?${query.toString()}`);
      setNearbyNgos(data.items || []);
    };

    const debounce = setTimeout(() => {
      loadNgos().catch(() => setNearbyNgos([]));
    }, 350);

    return () => clearTimeout(debounce);
  }, [report.state, report.district]);

  const stats = useMemo(() => ({
    total: animals.length,
    urgent: animals.filter((animal) => ['Injured', 'Needs Rescue'].includes(animal.status)).length,
    hungry: animals.filter((animal) => animal.status === 'Hungry').length
  }), [animals]);

  const updateReport = (field) => (event) => setReport((current) => ({
    ...current,
    [field]: event.target.value
  }));

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReport((current) => ({ ...current, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const useCurrentLocation = () => {
    setLocationLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setLocationLoading(false);
      setError('Browser location is not available.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReport((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setLocationLoading(false);
      },
      () => {
        setError('Location permission was not granted.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setNotificationSummary(null);

    try {
      const payload = {
        animalType: report.animalType,
        description: report.description,
        status: report.status,
        urgency: report.urgency,
        assistanceType: report.assistanceType,
        photoUrl: report.photoUrl || undefined,
        address: report.address,
        district: report.district,
        state: report.state
      };

      if (report.longitude && report.latitude) {
        const longitude = Number(report.longitude);
        const latitude = Number(report.latitude);
        if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
          payload.coordinates = [longitude, latitude];
        } else {
          throw new Error('Please enter valid numerical values for latitude and longitude.');
        }
      }

      const data = await apiFetch('/animals', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setReport(initialReport);
      setNearbyNgos(data.nearbyNgos || []);
      setNotificationSummary(data.notifications || null);
      setMessage(data.rescueAlert ? 'Report submitted and rescue alert created.' : 'Report submitted.');
      await loadAnimals();
      await loadActiveFeeders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFedMarked = async (animalId) => {
    setError('');
    setMessage('');

    try {
      await apiFetch('/feed', {
        method: 'POST',
        body: JSON.stringify({ animalId })
      });
      setMessage('Feeding entry saved.');
      await loadAnimals();
      await loadActiveFeeders();
    } catch (err) {
      setError(err.message);
    }
  };

  const sentCount = notificationSummary?.attempts?.filter((attempt) => attempt.status === 'sent').length || 0;

  return (
    <main className="page-grid">
      <section className="workbench">
        <div className="page-title">
          <div>
            <span className="eyebrow">PawCare dashboard</span>
            <h1>Animal help reports</h1>
          </div>
          <div className="metric-row">
            <div className="metric">
              <strong>{stats.total}</strong>
              <span>Reports</span>
            </div>
            <div className="metric danger">
              <strong>{stats.urgent}</strong>
              <span>Urgent</span>
            </div>
            <div className="metric food">
              <strong>{activeFeeders}</strong>
              <span>Feeders</span>
            </div>
          </div>
        </div>

        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        <MapComponent animals={animals} onFedMarked={handleFedMarked} />

        <div className="recent-panel">
          <div className="section-heading">
            <ClipboardList size={20} />
            <h2>Recent reports</h2>
          </div>
          <div className="report-list">
            {animals.slice(0, 5).map((animal) => (
              <article className="report-item" key={animal._id}>
                <span className={`status-dot ${animal.status.toLowerCase().replace(/\s+/g, '-')}`} />
                <div>
                  <strong>{animal.animalType}</strong>
                  <p>{animal.description}</p>
                </div>
                <span>{animal.locationDetails?.district || 'Location saved'}</span>
              </article>
            ))}
            {!animals.length && <p className="empty-text">No animal reports yet.</p>}
          </div>
        </div>
      </section>

      <aside className="side-panel">
        <div className="section-heading">
          <AlertTriangle size={20} />
          <h2>Share animal data</h2>
        </div>

        <form className="form-stack" onSubmit={submitReport}>
          <div className="form-grid">
            <label>
              <span>Animal</span>
              <input value={report.animalType} onChange={updateReport('animalType')} placeholder="Dog, cat, cow..." required />
            </label>
            <label>
              <span>Status</span>
              <select value={report.status} onChange={updateReport('status')}>
                <option>Hungry</option>
                <option>Injured</option>
                <option>Needs Rescue</option>
                <option>Healthy</option>
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Need</span>
              <select value={report.assistanceType} onChange={updateReport('assistanceType')}>
                <option>Food</option>
                <option>Medical</option>
                <option>Rescue</option>
                <option>Shelter</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              <span>Urgency</span>
              <select value={report.urgency} onChange={updateReport('urgency')}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Emergency</option>
              </select>
            </label>
          </div>

          <label>
            <span>Details</span>
            <textarea value={report.description} onChange={updateReport('description')} rows="4" placeholder="Condition, visible injuries, landmark..." required />
          </label>

          <label>
            <span>Upload Photo</span>
            {report.photoUrl && <img src={report.photoUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', marginBottom: '8px', borderRadius: '4px' }} />}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          </label>

          <label>
            <span>Address or landmark</span>
            <input value={report.address} onChange={updateReport('address')} placeholder="Street, area, landmark" />
          </label>

          <div className="form-grid">
            <label>
              <span>District</span>
              <input value={report.district} onChange={updateReport('district')} placeholder="District" required />
            </label>
            <label>
              <span>State</span>
              <input value={report.state} onChange={updateReport('state')} placeholder="State" required />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Latitude</span>
              <input value={report.latitude} onChange={updateReport('latitude')} placeholder="28.613900" />
            </label>
            <label>
              <span>Longitude</span>
              <input value={report.longitude} onChange={updateReport('longitude')} placeholder="77.209000" />
            </label>
          </div>

          <button className="btn btn-secondary" type="button" onClick={useCurrentLocation} disabled={locationLoading}>
            <Crosshair size={18} />
            {locationLoading ? 'Getting location...' : 'Use current location'}
          </button>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            <Send size={18} />
            {loading ? 'Submitting...' : 'Submit report'}
          </button>
        </form>

        <div className="ngo-preview">
          <div className="section-heading">
            <MapPin size={20} />
            <h2>Matching NGOs</h2>
          </div>
          {nearbyNgos.slice(0, 4).map((ngo) => (
            <div className="mini-ngo" key={ngo.sourceId}>
              <strong>{ngo.name}</strong>
              <span>{ngo.district}, {ngo.state}</span>
            </div>
          ))}
          {!nearbyNgos.length && <p className="empty-text">Add district and state to match CSV contacts.</p>}
        </div>

        {notificationSummary && (
          <div className="notification-box">
            <Bell size={20} />
            <div>
              <strong>{sentCount} notification attempts sent</strong>
              <span>{notificationSummary.totalNgosAttempted} NGO contacts attempted from CSV matches.</span>
            </div>
          </div>
        )}

        <div className="feed-note">
          <Utensils size={18} />
          <span>{stats.hungry} hungry animal reports need feeding attention.</span>
        </div>
      </aside>
    </main>
  );
};

export default Home;
