# Docker Deployment Guide for Ubuntu Server

> **🖱️ Prefer GUI Installation?** See **[PORTAINER_DOCKER_DESKTOP_GUIDE.md](./PORTAINER_DOCKER_DESKTOP_GUIDE.md)** for step-by-step instructions using Portainer or Docker Desktop with graphical interfaces (no command line required).

---

## Prerequisites

### System Requirements
- Ubuntu 20.04+ server (Ubuntu Mint also supported)
- Docker Engine 20.10+
- Docker Compose v2
- Minimum 8GB RAM, 4 CPU cores
- 100GB+ storage for recordings
- Virtualization support (VT-x/AMD-V) enabled in BIOS

### Docker Installation Commands

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$UBUNTU_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index
sudo apt update

# Install Docker Engine
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

### Optional: Install Portainer (Web-based Docker Management)
```bash
# Create volume for Portainer data
docker volume create portainer_data

# Run Portainer container
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Deployment Steps

### 1. Clone BROAD Streaming Platform
```bash
# Clone the repository
git clone https://github.com/flvytas/BROAD.git /opt/streaming-app
cd /opt/streaming-app

# Create necessary directories
mkdir -p recordings media uploads
```

### 2. Configure Environment
```bash
# Create .env file with your settings
cat > .env << EOF
NODE_ENV=production
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://streaming_user:your_secure_password_here@postgres:5432/streaming_db
PGHOST=postgres
PGPORT=5432
PGUSER=streaming_user
PGPASSWORD=your_secure_password_here
PGDATABASE=streaming_db
EOF

# Set proper permissions
chmod 755 recordings media uploads
```

### 3. Build and Deploy
```bash
# Build the Docker image
docker compose build

# Start all services
docker compose up -d

# Wait for containers to start
sleep 30

# Initialize database (create tables)
docker compose exec streaming-app npm run db:push
```

### 4. Verify Installation
```bash
# Check container status
docker compose ps

# Check application logs
docker compose logs streaming-app

# Test web interface
curl http://localhost:5000/api/streams

# Access the application
echo "Open your browser and navigate to: http://your-server-ip:5000"
```

### Alternative: Deploy via Portainer Web UI
If you installed Portainer, you can also deploy using the web interface:

1. Access Portainer at `https://your-server-ip:9443`
2. Go to **Stacks** → **Add Stack**
3. Name: `broad-streaming-platform`
4. Copy contents of `docker-compose.yml` into the stack
5. Set environment variables in the stack configuration
6. Deploy the stack

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