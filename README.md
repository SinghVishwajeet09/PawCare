# 🐾 PawCare

A comprehensive full-stack application designed to help pet owners care for their animals, connect with rescue organizations, and manage animal welfare. PawCare combines modern web technologies with AI-powered features to create an engaging platform for animal care and rescue.

## ✨ Features

### 🐶 Pet Management
- **Animal Profiles**: Create and manage detailed profiles for your pets
- **Health Tracking**: Log feeding schedules, medications, and health records
- **Medical History**: Keep comprehensive records of vaccinations and treatments

### 🆘 Rescue Alerts
- **Real-time Notifications**: Get alerted about animals in need of rescue
- **Location-based Services**: Find rescue operations and NGOs near you using interactive maps
- **Community Support**: Connect with local rescue organizations

### 🤖 AI Chatbot
- **Intelligent Assistant**: Powered by Google Generative AI (Gemini)
- **Pet Care Guidance**: Get instant answers to pet care questions
- **Emergency Support**: Quick access to emergency information

### 🏥 NGO Integration
- **Organization Directory**: Browse registered NGOs and rescue centers
- **Direct Contact**: Connect with animal welfare organizations
- **Partnership Network**: Collaborate with verified rescue centers

### 🗺️ Interactive Maps
- **Location Discovery**: Find nearby rescue centers and veterinary clinics
- **Geolocation Support**: Leverages Leaflet for interactive mapping

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT + Firebase Admin
- **AI Integration**: Google Generative AI
- **Email**: Nodemailer
- **Password Security**: bcryptjs

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **State Management**: Zustand
- **Maps**: Leaflet + React Leaflet
- **UI Components**: Lucide React icons
- **Backend**: Firebase

## 📋 Project Structure

```
PawCare/
├── backend/                 # Express.js server
│   ├── config/             # Database & Firebase config
│   ├── models/             # MongoDB schemas
│   │   ├── Animal.js       # Pet profiles
│   │   ├── FeedLog.js      # Feeding records
│   │   ├── RescueAlert.js  # Rescue notifications
│   │   └── User.js         # User accounts
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth & custom middleware
│   ├── services/           # Business logic
│   ├── utils/              # Helper functions
│   └── index.js            # Server entry point
│
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   ├── store/          # Zustand state
│   │   └── App.jsx         # Main app component
│   ├── public/             # Static assets
│   └── index.html          # HTML entry point
│
└── ngos.csv               # NGO directory data
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB instance (local or cloud)
- Firebase project with admin credentials
- Google Cloud API key for Generative AI

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your JWT secret key
   - `FIREBASE_SERVICE_ACCOUNT_KEY`: Path to Firebase admin credentials
   - `GOOGLE_API_KEY`: Google Generative AI API key
   - `EMAIL_USER`: Email for Nodemailer
   - `EMAIL_PASSWORD`: Email app password
   - `PORT`: Server port (default: 5000)

3. **Start the backend**
   ```bash
   npm start
   ```
   Server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with:
   - `VITE_API_URL`: Backend API URL
   - `VITE_FIREBASE_CONFIG`: Firebase configuration object

3. **Start development server**
   ```bash
   npm run dev
   ```
   Application will open on `http://localhost:5173`

4. **Build for production**
   ```bash
   npm run build
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Animals
- `GET /api/animals` - Get user's pets
- `POST /api/animals` - Create new pet
- `PUT /api/animals/:id` - Update pet
- `DELETE /api/animals/:id` - Delete pet

### Feed Logs
- `GET /api/feed/:animalId` - Get feeding history
- `POST /api/feed` - Log feeding activity
- `DELETE /api/feed/:id` - Remove feed log

### Rescue Alerts
- `GET /api/rescues` - Get rescue alerts
- `POST /api/rescues` - Create rescue alert
- `PUT /api/rescues/:id` - Update alert status

### NGOs
- `GET /api/ngos` - Get NGO directory
- `POST /api/ngos` - Add NGO (admin)

### Chatbot
- `POST /api/chatbot/ask` - Get AI-powered response

## 🔐 Authentication

PawCare uses JWT (JSON Web Tokens) for secure authentication:
- Passwords are hashed using bcryptjs
- JWT tokens are issued on login
- Firebase Admin SDK validates tokens
- Protected routes require valid authorization

## 📦 Dependencies Highlights

| Package | Purpose |
|---------|---------|
| `express` | Web server framework |
| `mongoose` | MongoDB object mapping |
| `jsonwebtoken` | JWT authentication |
| `bcryptjs` | Password hashing |
| `firebase-admin` | Firebase backend integration |
| `@google/generative-ai` | AI chatbot features |
| `nodemailer` | Email notifications |
| `react-router-dom` | Client-side routing |
| `zustand` | State management |
| `react-leaflet` | Interactive maps |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 📧 Support

For support, please contact:
- Open an issue on GitHub
- Email: support@pawcare.com

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Real-time notifications via WebSocket
- [ ] Video call integration for vet consultations
- [ ] Machine learning for pet health predictions
- [ ] Social features for pet owners
- [ ] Adoption platform integration
- [ ] Multi-language support

## 🙏 Acknowledgments

- Google Generative AI for powering our chatbot
- Leaflet for interactive mapping
- React ecosystem for amazing tools
- All contributors and supporters

---

**Made with ❤️ for pet lovers and animal welfare advocates**
