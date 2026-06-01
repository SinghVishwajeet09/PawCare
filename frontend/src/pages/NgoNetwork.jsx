import { useEffect, useState } from 'react';
import { Mail, Phone, Search, ShieldCheck, Users } from 'lucide-react';
import { apiFetch } from '../api';

const NgoNetwork = () => {
  const [filters, setFilters] = useState({ state: '', district: '' });
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNgos = async (nextFilters = filters) => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams();
      if (nextFilters.state) query.set('state', nextFilters.state);
      if (nextFilters.district) query.set('district', nextFilters.district);
      query.set('limit', '30');

      const data = await apiFetch(`/ngos?${query.toString()}`);
      setNgos(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNgos({ state: '', district: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = (field) => (event) => setFilters((current) => ({
    ...current,
    [field]: event.target.value
  }));

  const submitSearch = (event) => {
    event.preventDefault();
    loadNgos();
  };

  return (
    <main className="directory-page">
      <section className="page-title compact">
        <div>
          <span className="eyebrow">CSV directory</span>
          <h1><Users size={30} /> NGO network</h1>
        </div>
        <form className="directory-search" onSubmit={submitSearch}>
          <input value={filters.district} onChange={updateFilter('district')} placeholder="District" />
          <input value={filters.state} onChange={updateFilter('state')} placeholder="State" />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <Search size={18} />
            Search
          </button>
        </form>
      </section>

      {error && <div className="notice error">{error}</div>}

      <section className="directory-grid">
        {ngos.map((ngo) => (
          <article className="ngo-card" key={`${ngo.sourceId}-${ngo.email}-${ngo.contactNumber}`}>
            <div>
              <div className="card-title">
                <h2>{ngo.name}</h2>
                <span>{ngo.matchScore >= 100 ? 'District match' : 'CSV record'}</span>
              </div>
              <p>{ngo.district}, {ngo.state}</p>
              {ngo.validUpTo && (
                <div className="verified-line">
                  <ShieldCheck size={16} />
                  <span>Valid up to {ngo.validUpTo}</span>
                </div>
              )}
            </div>

            <div className="contact-actions">
              {ngo.contactNumber && (
                <a className="btn btn-secondary" href={`tel:${ngo.contactNumber}`}>
                  <Phone size={17} />
                  {ngo.contactNumber}
                </a>
              )}
              {ngo.email && (
                <a className="btn btn-secondary" href={`mailto:${ngo.email}`}>
                  <Mail size={17} />
                  Email
                </a>
              )}
            </div>
          </article>
        ))}
      </section>

      {!loading && !ngos.length && (
        <div className="empty-state">
          <Users size={32} />
          <p>No NGO contacts matched this district/state in `ngos.csv`.</p>
        </div>
      )}
    </main>
  );
};

export default NgoNetwork;
