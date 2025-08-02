# React Admin Dashboard

A modern, feature-rich admin dashboard built with React, TypeScript, and Tailwind CSS.

## Features

- 📊 **Charts & Analytics**: Interactive charts using ApexCharts
- 📅 **Calendar**: Full-featured calendar with FullCalendar
- 📝 **Forms**: Complete form components with validation
- 🗂️ **Tables**: Advanced table components
- 🎨 **UI Components**: Comprehensive UI component library
- 🌙 **Dark Mode**: Built-in dark/light theme support
- 📱 **Responsive**: Mobile-first responsive design
- 🔐 **Authentication**: Sign in/Sign up pages
- 📄 **File Upload**: Drag & drop file upload with react-dropzone
- 🗺️ **Maps**: Interactive vector maps

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Charts**: ApexCharts, React ApexCharts
- **Calendar**: FullCalendar
- **Forms**: React Hook Form, Flatpickr
- **Routing**: React Router
- **Icons**: Custom SVG icons with SVGR
- **Maps**: React JVectorMap

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd admin-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── charts/         # Chart components
│   ├── common/         # Common components
│   ├── ecommerce/      # E-commerce specific components
│   ├── form/           # Form components
│   ├── tables/         # Table components
│   └── ui/             # Base UI components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── icons/              # SVG icons
├── layout/             # Layout components
├── pages/              # Page components
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
