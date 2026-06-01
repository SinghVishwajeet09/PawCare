import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons based on status
const healthyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const injuredIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hungryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


const MapComponent = ({ animals = [], onFedMarked }) => {
  const defaultCenter = [28.6139, 77.2090]; // Default New Delhi

  return (
    <div className="map-container">
      <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {animals.filter((animal) => Array.isArray(animal.location?.coordinates) && animal.location.coordinates.length === 2).map(animal => {
          let icon = healthyIcon;
          if (animal.status === 'Injured' || animal.status === 'Needs Rescue') icon = injuredIcon;
          if (animal.status === 'Hungry') icon = hungryIcon;

          return (
            <Marker 
              key={animal._id} 
              position={[animal.location.coordinates[1], animal.location.coordinates[0]]} 
              icon={icon}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{animal.animalType || 'Animal Info'}</h3>
                  <p>{animal.description}</p>
                  <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className={`badge badge-${animal.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {animal.status}
                    </span>
                  </div>
                  {animal.lastFed && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Last Fed: {new Date(animal.lastFed).toLocaleString()}
                    </p>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.25rem' }}
                    onClick={() => onFedMarked?.(animal._id)}
                  >
                    Mark "Fed Today"
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
