# Admin Dashboard

A comprehensive, full-stack admin dashboard application built with modern web technologies. This project includes customer management, user authentication, data visualization, and WhatsApp API integration capabilities.

## ✨ Features

### 🎯 Core Features
- � **Authentication System**: JWT-based login/logout with protected routes
- 👥 **Customer Management**: Complete CRUD operations for customer data
- 📊 **Data Visualization**: Interactive charts and analytics using ApexCharts
- 📅 **Calendar Management**: Full-featured calendar with FullCalendar
- �️ **Advanced Tables**: Dynamic tables with sorting, filtering, and pagination
- 📱 **Responsive Design**: Mobile-first responsive design with Tailwind CSS

### � Advanced Features
- 🌙 **Dark/Light Mode**: Built-in theme switching
- 📄 **File Upload**: Drag & drop file upload with react-dropzone
- 🗺️ **Interactive Maps**: Vector maps integration
- 📞 **WhatsApp Integration**: Send messages to customers via WhatsApp API
- 💾 **MongoDB Integration**: Persistent data storage with MongoDB Atlas
- 🔒 **Security**: Password hashing, input validation, and rate limiting

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **React Router** for navigation
- **ApexCharts** for data visualization
- **FullCalendar** for calendar functionality

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** and security middleware

### Additional Tools
- **WhatsApp Business API** / **Twilio** for messaging
- **React Hook Form** for form handling
- **React JVectorMap** for maps
- **ESLint** for code quality

## 🚀 Quick Start

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- MongoDB Atlas account (for database)
- WhatsApp Business API credentials (optional)

### 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd admin_dashboard
   ```

2. **Install dependencies:**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Environment Setup:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your environment variables:
   # - MONGODB_URI: Your MongoDB connection string
   # - JWT_SECRET: Secret key for JWT tokens
   # - WHATSAPP_TOKEN: WhatsApp API token (optional)
   ```

4. **Start the application:**
   
   **Option A - Quick Start (Recommended):**
   ```bash
   # Windows
   start.bat
   
   # Or manually run both services
   ```
   
   **Option B - Manual Start:**
   ```bash
   # Terminal 1: Start Backend (Port 3001)
   cd backend
   npm start
   
   # Terminal 2: Start Frontend (Port 5173)
   npm run dev
   ```

5. **Access the application:**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`

### 🔑 Default Login Credentials

**Development Mode (No Backend):**
- Email: `admin@admin.com`
- Password: `admin`

**Full Backend Mode:**
- Email: `admin@example.com`
- Password: `admin123`

### 📋 Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start with nodemon (development)

**Utility Scripts:**
- `start.bat` - Start both frontend and backend (Windows)
- `close-ports.bat` - Kill processes on ports 3001 and 5173
- `verify-setup.mjs` - Verify project setup and dependencies

## 📁 Project Structure

```
admin_dashboard/
├── 📂 src/                     # Frontend source code
│   ├── 📂 components/          # Reusable UI components
│   │   ├── auth/              # Authentication components
│   │   ├── charts/            # Chart components
│   │   ├── common/            # Common components
│   │   ├── ecommerce/         # E-commerce components
│   │   ├── form/              # Form components
│   │   ├── header/            # Header components
│   │   ├── tables/            # Table components
│   │   └── ProtectedRoute.tsx # Route protection
│   ├── 📂 context/            # React context providers
│   ├── 📂 data/               # Data management & API calls
│   ├── 📂 hooks/              # Custom React hooks
│   ├── 📂 icons/              # SVG icon components
│   ├── 📂 layout/             # Layout components
│   ├── 📂 models/             # TypeScript interfaces/types
│   ├── 📂 pages/              # Page components
│   ├── 📂 services/           # API services & business logic
│   ├── 📂 utils/              # Utility functions
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # App entry point
│   └── index.css              # Global styles
├── 📂 backend/                 # Backend API server
│   ├── 📂 models/             # MongoDB models
│   │   ├── Admin.js           # Admin user model
│   │   └── Customer.js        # Customer model
│   ├── 📂 routes/             # API route handlers
│   │   ├── admin.js           # Admin routes
│   │   ├── auth.js            # Authentication routes
│   │   └── customers.js       # Customer CRUD routes
│   ├── server.js              # Express server setup
│   └── package.json           # Backend dependencies
├── 📂 public/                  # Static assets
├── 📄 Documentation Files
│   ├── STARTUP_GUIDE.md       # Quick start instructions
│   ├── MONGODB_SETUP.md       # Database setup guide
│   ├── WHATSAPP_SETUP.md      # WhatsApp API integration
│   └── INTEGRATION_STATUS.md  # Feature status report
└── 📄 Configuration Files
    ├── package.json           # Frontend dependencies
    ├── vite.config.ts         # Vite configuration
    ├── tailwind.config.cjs    # Tailwind CSS config
    ├── tsconfig.json          # TypeScript config
    └── eslint.config.js       # ESLint configuration
```

## 🔧 Configuration

### MongoDB Setup
1. Create a MongoDB Atlas account
2. Create a new cluster and database
3. Get your connection string
4. Update the `MONGODB_URI` in your `.env` file

### WhatsApp API Setup (Optional)
- Follow the detailed guide in `WHATSAPP_SETUP.md`
- Supports both Direct Facebook API and Twilio integration
- Configure your API credentials in environment variables

### Environment Variables
Create a `.env` file in the root directory:
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key

# WhatsApp API (Optional)
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_ID=your_phone_number_id

# Twilio (Alternative to WhatsApp API)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

## 🚨 Troubleshooting

### Common Issues

1. **"Failed to fetch - login" Error**
   - Ensure backend is running on port 3001
   - Check MongoDB connection
   - Verify environment variables

2. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
   - Check TypeScript errors: `npm run build`

3. **Port Already in Use**
   - Use the provided scripts: `close-ports.bat` (Windows)
   - Or manually kill processes on ports 3001 and 5173

4. **MongoDB Connection Issues**
   - Check your connection string format
   - Ensure your IP is whitelisted in MongoDB Atlas
   - Verify database credentials

For detailed troubleshooting, see `MONGODB_TROUBLESHOOTING.md`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed
4. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
5. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines
- Use TypeScript for type safety
- Follow the existing component structure
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation for new features

## 📋 Roadmap

### Planned Features
- [ ] Real-time notifications
- [ ] Advanced reporting dashboard
- [ ] Email integration
- [ ] Multi-language support
- [ ] Advanced user roles and permissions
- [ ] Data export functionality
- [ ] Mobile app companion

### Recently Added
- ✅ MongoDB Atlas integration
- ✅ WhatsApp API messaging
- ✅ JWT authentication
- ✅ Customer management system
- ✅ Responsive design improvements

## 📄 Documentation

- 📖 **[Startup Guide](STARTUP_GUIDE.md)** - Quick setup instructions
- 🗄️ **[MongoDB Setup](MONGODB_SETUP.md)** - Database configuration
- 📞 **[WhatsApp Setup](WHATSAPP_SETUP.md)** - Messaging integration
- 🔄 **[Integration Status](INTEGRATION_STATUS.md)** - Current feature status
- 🔧 **[Troubleshooting](MONGODB_TROUBLESHOOTING.md)** - Common issues and solutions

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting guides in the documentation
2. Search existing issues in the repository
3. Create a new issue with detailed information
4. Join our community discussions


## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts powered by [ApexCharts](https://apexcharts.com/)
- Backend powered by [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/)
- Database managed with [MongoDB](https://www.mongodb.com/) and [Mongoose](https://mongoosejs.com/)

---

Made with ❤️ by [Parzival1x](https://github.com/Parzival1x)
