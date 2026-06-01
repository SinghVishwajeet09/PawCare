import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RescueBoard from './pages/RescueBoard';
import NgoNetwork from './pages/NgoNetwork';
import Auth from './pages/Auth';
import PawBot from './components/PawBot';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <Navbar />
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/rescues" element={<PrivateRoute><RescueBoard /></PrivateRoute>} />
          <Route path="/network" element={<PrivateRoute><NgoNetwork /></PrivateRoute>} />
        </Routes>
      </div>
      <PawBot />
    </Router>
  );
}

export default App;
