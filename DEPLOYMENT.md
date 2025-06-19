# Docker Deployment Guide for Ubuntu Server

## Prerequisites

### System Requirements
- Ubuntu 20.04+ server
- Docker Engine 20.10+
- Docker Compose v2
- Portainer CE
- Minimum 8GB RAM, 4 CPU cores
- 100GB+ storage for recordings

### Installation Commands

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install Portainer
docker volume create portainer_data
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Deployment Steps

### 1. Prepare Server Directories
```bash
sudo mkdir -p /opt/streaming/{recordings,media,uploads}
sudo chown -R $USER:$USER /opt/streaming
chmod 755 /opt/streaming/{recordings,media,uploads}
```

### 2. Build Docker Image
```bash
# Clone/copy your application files to the server
git clone <your-repo> /opt/streaming-app
cd /opt/streaming-app

# Build the Docker image
docker build -t streaming-platform:latest .
```

### 3. Deploy via Portainer

#### Option A: Using Portainer Web UI
1. Access Portainer at `https://your-server-ip:9443`
2. Go to **Stacks** → **Add Stack**
3. Name: `streaming-platform`
4. Copy contents of `portainer-stack.yml`
5. Set environment variables:
   - `POSTGRES_PASSWORD=your_secure_password`
6. Deploy the stack

#### Option B: Using Docker Compose
```bash
# Set environment variable
export POSTGRES_PASSWORD=your_secure_password

# Deploy with Docker Compose
docker-compose up -d
```

### 4. Initial Database Setup
```bash
# Wait for containers to start
sleep 30

# Run database migration
docker exec streaming-platform npm run db:push
```

## Configuration

### Environment Variables
Set these in Portainer or your `.env` file:

```env
NODE_ENV=production
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://streaming_user:your_secure_password@postgres:5432/streaming_db
```

### Port Configuration
- **5000**: Web interface (HTTP)
- **1935**: RTMP input streams
- **8000**: HLS output streams
- **5432**: PostgreSQL (internal)

### Volume Mounts
- `/opt/streaming/recordings`: Recorded video files
- `/opt/streaming/media`: Temporary media files
- `/opt/streaming/uploads`: User uploads

## Monitoring and Maintenance

### Health Checks
```bash
# Check container status
docker ps

# View logs
docker logs streaming-platform
docker logs streaming-postgres

# Check application health
curl http://localhost:5000/api/streams
```

### Backup Procedures
```bash
# Backup database
docker exec streaming-postgres pg_dump -U streaming_user streaming_db > backup_$(date +%Y%m%d).sql

# Backup recordings
rsync -av /opt/streaming/recordings/ /backup/recordings/
```

### Performance Optimization
```bash
# Optimize Docker daemon for streaming
echo '{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "name": "nofile",
      "hard": 65536,
      "soft": 65536
    }
  }
}' | sudo tee /etc/docker/daemon.json

sudo systemctl restart docker
```

## Firewall Configuration
```bash
# Allow required ports
sudo ufw allow 5000/tcp  # Web interface
sudo ufw allow 1935/tcp  # RTMP
sudo ufw allow 8000/tcp  # HLS
sudo ufw allow 9443/tcp  # Portainer
sudo ufw enable
```

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
docker logs streaming-platform
# Check for port conflicts or permission issues
```

**Database connection failed:**
```bash
docker exec -it streaming-postgres psql -U streaming_user -d streaming_db
# Verify database is accessible
```

**Recording permission denied:**
```bash
sudo chown -R 1000:1000 /opt/streaming/recordings
# Ensure container user has write access
```

**High CPU usage:**
- Enable hardware acceleration in FFmpeg settings
- Reduce stream quality/framerate
- Monitor with: `docker stats`

### Scaling Considerations

**For multiple concurrent streams:**
- Increase container CPU/memory limits
- Use dedicated storage for recordings
- Consider load balancing for web interface

**Resource limits in Portainer:**
- CPU: 4 cores for single 1080p stream
- Memory: 8GB minimum
- Storage: 1GB per hour of recording at 1080p