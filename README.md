# GreenGrid - AI-Powered Renewable Energy Management Platform

![GreenGrid Energy Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-20+-green) ![React](https://img.shields.io/badge/React-18+-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

GreenGrid is a full-stack web application that helps households and communities optimize their renewable energy usage through AI-powered forecasting and smart device scheduling recommendations. The platform predicts solar energy generation using weather data, provides intelligent appliance scheduling suggestions, and tracks cost savings and environmental impact.

## 🌟 Features

- **Real-time Energy Monitoring**: Live appliance power consumption tracking with WebSocket streaming
- **AI-Powered Analytics**: Smart energy usage predictions and anomaly detection
- **Solar & Battery Management**: Comprehensive solar generation and battery storage monitoring
- **Device Scheduling**: Intelligent recommendations for optimal appliance usage
- **Community Features**: Energy efficiency leaderboards and community engagement
- **Modern UI**: Dark/light mode support with responsive design
- **Robust Backend**: Express.js API with PostgreSQL database and real-time data processing

## 🚀 One-Click Deployment Options

### Deploy to Render.com [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**Quick Deploy:**
1. Click the "Deploy to Render" button above
2. Connect your GitHub repository
3. Render will automatically detect the `render.yml` configuration
4. Set your environment variables (see below)
5. Deploy!

**Manual Render Setup:**
1. Fork this repository to your GitHub account
2. Create a new Web Service on [Render.com](https://render.com)
3. Connect your GitHub repository
4. Use these settings:
   - **Runtime**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/communities`

### Deploy to Railway [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy)

1. Click "Deploy on Railway"
2. Connect GitHub and select this repository
3. Add environment variables (see below)
4. Deploy automatically

### Deploy to Vercel [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/greengrid)

1. Click "Deploy with Vercel"
2. Import the repository
3. Configure environment variables
4. Deploy with zero configuration

## 🛠️ Environment Variables

### Required Variables:
```bash
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
```

### Optional Variables:
```bash
OPENAI_API_KEY=your-openai-api-key-here  # For AI features (has fallbacks)
PORT=5000                                 # Default: 5000
```

## 📋 Prerequisites

- Node.js 20+ 
- PostgreSQL database
- (Optional) OpenAI API key for enhanced AI features

## 🔧 Local Development

### Quick Start:
```bash
# 1. Clone the repository
git clone https://github.com/yourusername/greengrid.git
cd greengrid

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# 4. Push database schema
npm run db:push

# 5. Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

### Development Scripts:
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Start production server
npm run db:push  # Push database schema changes
npm run check    # TypeScript type checking
```

## 🏗️ Architecture

### Tech Stack:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + Node.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket streaming for live data
- **AI**: OpenAI GPT-5 with intelligent fallbacks
- **UI Components**: Radix UI + Shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Authentication**: JWT-based with bcrypt password hashing

### Key Components:
- **Real-time Data Engine**: 1-second interval data generation and streaming
- **AI Data Generator**: Sophisticated Indian appliance usage modeling
- **Solar & Battery Services**: Realistic energy generation and storage simulation  
- **Anomaly Detection**: Pattern recognition for energy usage irregularities
- **Scheduler Service**: Background jobs for weather updates and recommendations

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User authentication and profiles
- `appliances` - Device registration and specifications
- `appliance_logs` - Real-time power consumption data
- `battery_logs` - Battery status and performance metrics
- `anomaly_logs` - Detected energy usage anomalies
- `communities` - Community features and leaderboards

## 🔒 Security Features

- JWT-based authentication with secure token handling
- Bcrypt password hashing
- Request validation with Zod schemas
- CORS configuration for cross-origin requests
- Environment-based configuration management

## 🌐 API Endpoints

### Authentication:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Energy Management:
- `GET /api/appliances` - List all appliances
- `POST /api/appliances` - Register new appliance
- `GET /api/appliance-logs` - Get power consumption data
- `GET /api/battery-logs` - Get battery performance data
- `GET /api/anomaly-logs` - Get anomaly detection results

### Real-time:
- `WS /ws/realtime` - WebSocket for live data streaming

## 📱 Features in Detail

### Real-time Monitoring
- Live appliance power consumption tracking
- Battery state-of-charge and health monitoring
- Solar generation performance metrics
- WebSocket-based data streaming

### AI-Powered Intelligence
- Smart energy usage predictions
- Anomaly detection for unusual consumption patterns
- Optimized appliance scheduling recommendations
- Weather-based solar generation forecasting

### Community Features
- Energy efficiency leaderboards
- Household energy usage comparisons
- Community challenges and achievements
- Social sharing of energy savings

## 🔧 Configuration

### Database Configuration:
The app supports multiple database providers:
- **Neon**: Serverless PostgreSQL (recommended for production)
- **Local PostgreSQL**: For development
- **Replit Database**: Automatic configuration in Replit environment

### AI Configuration:
- OpenAI integration with graceful fallbacks
- Rate limiting (20 calls/minute) to prevent quota issues
- Sophisticated Indian appliance modeling for offline operation
- Realistic data generation for battery, solar, and appliance systems

## 🐛 Troubleshooting

### Common Issues:

**Database Connection Errors:**
- Verify `DATABASE_URL` is correctly set
- Ensure database is accessible from your deployment environment
- Check that database schema is up to date (`npm run db:push`)

**OpenAI API Errors:**
- The app works without OpenAI API key (uses advanced fallbacks)
- Check API key validity if AI features aren't working optimally
- Monitor rate limits in application logs

**Frontend Build Issues:**
- Clear node_modules and reinstall dependencies
- Verify all environment variables are set
- Check that build process completes successfully

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request

## 💬 Support

For support and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the application logs for error details

---

**GreenGrid** - Empowering households with intelligent renewable energy management.