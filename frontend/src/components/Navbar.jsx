import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, Map, PawPrint, Users } from 'lucide-react';
import { clearSession, getStoredUser } from '../api';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <nav className="top-nav">
      <Link className="nav-brand" to={token ? '/home' : '/'}>
        <PawPrint size={30} />
        <span>PawCare</span>
      </Link>

      {token && (
        <div className="nav-links">
          <NavLink to="/home">
            <Map size={18} />
            Reports
          </NavLink>
          <NavLink to="/rescues">
            <AlertTriangle size={18} />
            Rescues
          </NavLink>
          <NavLink to="/network">
            <Users size={18} />
            NGOs
          </NavLink>
        </div>
      )}

      <div className="nav-actions">
        {token ? (
          <>
            <span className="user-chip">{user?.name || user?.email || 'Account'}</span>
            <button className="icon-btn" onClick={handleLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate('/')}>Sign in</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
