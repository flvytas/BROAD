# Professional Streaming Platform

A comprehensive live streaming platform designed for high-quality video broadcasting with advanced input support, optional recording functionality, and professional streaming workflows.

## Features

### Core Streaming Capabilities
- **Multiple Input Sources**: Blackmagic Decklink, RTMP, Webcam support
- **Advanced Output Management**: RTMP restreaming, SRT, Decklink SDI outputs
- **Real-time Health Monitoring**: Live statistics including bitrate, resolution, audio tracks
- **Professional Stream Controls**: Start/stop, health monitoring, thumbnail generation

### Optional Recording System
- **Performance-Conscious Design**: Optional recording to prevent hardware overcrowding
- **Flexible Quality Settings**: 480p/720p/1080p recording options
- **Multiple Formats**: MP4 and MKV support
- **Integrated Gallery**: Browse, download, and manage recorded content
- **Automatic File Management**: Organized storage with metadata

### Technical Architecture
- **Node.js Backend**: Express server with WebSocket support
- **React Frontend**: Modern UI with shadcn/ui components
- **PostgreSQL Database**: Reliable data persistence
- **FFmpeg Integration**: Professional video processing
- **Docker Support**: Complete containerization for deployment

## Hardware Requirements

### For 1080p/25fps Streaming + Recording
- **CPU**: Intel i5-12600K or AMD Ryzen 5 5600X (minimum)
- **RAM**: 16GB DDR4-3200 (32GB recommended)
- **Storage**: 1TB NVMe SSD + dedicated recording storage
- **Network**: Gigabit Ethernet
- **GPU**: RTX 4060 or Intel Arc A380 (for hardware acceleration)

### For 1080p/50fps Streaming + Recording
- **CPU**: Intel i7-12700K or AMD Ryzen 7 5800X (minimum)
- **RAM**: 32GB DDR4-3200 (64GB recommended)
- **Storage**: 2TB NVMe SSD + high-speed recording array
- **Network**: 2.5G+ Ethernet recommended
- **GPU**: RTX 4070 or better (strongly recommended)

## Quick Start

> **🖱️ Prefer GUI Installation?** Check out **[PORTAINER_DOCKER_DESKTOP_GUIDE.md](./PORTAINER_DOCKER_DESKTOP_GUIDE.md)** for visual step-by-step instructions using Portainer or Docker Desktop.

### Docker Deployment (Command Line)

1. **Clone the BROAD repository**
   ```bash
   git clone https://github.com/flvytas/BROAD.git
   cd BROAD
   ```

2. **Configure environment**
   ```bash
   # Create environment file
   cat > .env << EOF
   NODE_ENV=production
   POSTGRES_PASSWORD=your_secure_password_here
   DATABASE_URL=postgresql://streaming_user:your_secure_password_here@postgres:5432/streaming_db
   EOF
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker compose build
   docker compose up -d
   
   # Initialize database
   sleep 30
   docker compose exec streaming-app npm run db:push
   ```

4. **Access the platform**
   - Web Interface: `http://your-server:5000`
   - RTMP Input: `rtmp://your-server:1935/live/YOUR_STREAM_KEY`
   - HLS Output: `http://your-server:8000/live/YOUR_STREAM_KEY/index.m3u8`

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up database**
   ```bash
   npm run db:push
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Input Sources │    │  Streaming Core │    │     Outputs     │
│                 │    │                 │    │                 │
│ • Blackmagic    │────│ • FFmpeg        │────│ • RTMP Services │
│ • RTMP Stream   │    │ • Node Media    │    │ • SRT Protocol  │
│ • Webcam        │    │ • WebSockets    │    │ • SDI Hardware  │
│ • File Upload   │    │ • Health Monitor│    │ • HLS Streams   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Recording     │
                       │                 │
                       │ • Optional      │
                       │ • Multi-quality │
                       │ • Gallery UI    │
                       │ • Download API  │
                       └─────────────────┘
```

## API Endpoints

### Streams Management
- `GET /api/streams` - List all streams
- `POST /api/streams` - Create new stream
- `GET /api/streams/:id` - Get stream details
- `DELETE /api/streams/:id` - Delete stream
- `POST /api/streams/:id/start` - Start stream
- `POST /api/streams/:id/stop` - Stop stream

### Recording Management
- `POST /api/streams/:id/recording-settings` - Configure recording
- `POST /api/streams/:id/recordings/start` - Start recording
- `GET /api/recordings` - List recordings
- `GET /api/recordings/:id/download` - Download recording
- `DELETE /api/recordings/:id` - Delete recording

### Stream Outputs
- `GET /api/streams/:id/outputs` - List stream outputs
- `POST /api/streams/:id/outputs` - Create output
- `PUT /api/outputs/:id` - Update output
- `DELETE /api/outputs/:id` - Delete output

## Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
PGHOST=localhost
PGPORT=5432
PGUSER=streaming_user
PGPASSWORD=secure_password
PGDATABASE=streaming_db

# Application
NODE_ENV=production
PORT=5000
RTMP_PORT=1935
HLS_PORT=8000

# Performance
MAX_CONCURRENT_STREAMS=5
FFMPEG_THREADS=4
ENABLE_HARDWARE_ACCELERATION=false
```

### Recording Settings
- **Quality Options**: 480p, 720p, 1080p
- **Format Options**: MP4, MKV
- **Storage Path**: Configurable via environment
- **Performance Impact**: ~20-30% additional CPU load

## Deployment Options

### Production Deployment
- **Docker Compose**: Complete stack with PostgreSQL
- **Portainer Support**: Container management interface
- **Hardware Acceleration**: NVIDIA NVENC, Intel QuickSync
- **Monitoring**: Health checks and logging
- **Backup**: Automated database and recording backups

### Cloud Deployment Costs
- **AWS**: $1,200-1,700/month (not recommended for continuous streaming)
- **Hetzner**: $150-200/month (good value option)
- **On-Premise**: $150-250/month (recommended for 24/7 operation)

## Performance Optimization

### Software Optimizations
- Hardware-accelerated encoding (GPU)
- Efficient buffer management
- Optimized FFmpeg settings
- Database connection pooling

### System Tuning
- CPU governor performance mode
- Network buffer optimization
- Storage I/O optimization
- Memory management tuning

## Security Considerations

- PostgreSQL with secure credentials
- Environment variable configuration
- Container isolation
- Firewall configuration
- HTTPS support (with reverse proxy)

## Monitoring and Maintenance

### Health Monitoring
- Real-time stream statistics
- Container health checks
- Database connection monitoring
- Storage usage tracking

### Backup Procedures
- Automated database backups
- Recording file synchronization
- Configuration backup
- Disaster recovery planning

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the deployment documentation
- Review the troubleshooting guide

## Roadmap

- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] Cloud storage integration
- [ ] Advanced scheduling features
- [ ] Load balancing for multiple servers
- [ ] Machine learning-based quality optimization