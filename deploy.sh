#!/bin/bash

# Streaming Platform Deployment Script for Ubuntu Server
# Usage: ./deploy.sh

set -e

echo "🚀 Starting Streaming Platform Deployment..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root. Please run as regular user."
   exit 1
fi

# Variables
INSTALL_DIR="/opt/streaming-platform"
DATA_DIR="/opt/streaming"
POSTGRES_PASSWORD=""

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker not found. Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        echo "✅ Docker installed. Please log out and back in, then run this script again."
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose not found. Installing..."
        sudo apt update
        sudo apt install -y docker-compose-plugin
    fi
    
    # Check if user is in docker group
    if ! groups $USER | grep -q docker; then
        echo "❌ User not in docker group. Adding..."
        sudo usermod -aG docker $USER
        echo "✅ Added to docker group. Please log out and back in, then run this script again."
        exit 1
    fi
    
    echo "✅ Prerequisites check complete"
}

# Function to create directories
create_directories() {
    echo "📁 Creating directory structure..."
    
    sudo mkdir -p $DATA_DIR/{recordings,media,uploads}
    sudo mkdir -p $INSTALL_DIR
    
    # Set proper ownership
    sudo chown -R $USER:$USER $DATA_DIR
    sudo chown -R $USER:$USER $INSTALL_DIR
    
    # Set permissions
    chmod 755 $DATA_DIR/{recordings,media,uploads}
    
    echo "✅ Directories created"
}

# Function to generate environment file
create_env_file() {
    echo "🔐 Creating environment configuration..."
    
    if [[ -z "$POSTGRES_PASSWORD" ]]; then
        POSTGRES_PASSWORD=$(generate_password)
    fi
    
    cat > $INSTALL_DIR/.env <<EOF
# Database Configuration
DATABASE_URL=postgresql://streaming_user:${POSTGRES_PASSWORD}@postgres:5432/streaming_db
PGHOST=postgres
PGPORT=5432
PGUSER=streaming_user
PGPASSWORD=${POSTGRES_PASSWORD}
PGDATABASE=streaming_db

# Application Configuration
NODE_ENV=production
PORT=5000

# RTMP Server Configuration
RTMP_PORT=1935
HLS_PORT=8000

# Recording Configuration
RECORDINGS_PATH=/app/recordings
MEDIA_PATH=/app/media
UPLOADS_PATH=/app/uploads
EOF
    
    echo "✅ Environment file created"
    echo "📝 Database password: $POSTGRES_PASSWORD"
}

# Function to copy application files
copy_application() {
    echo "📦 Copying application files..."
    
    # Copy all necessary files to install directory
    cp -r . $INSTALL_DIR/
    
    # Remove development files
    rm -rf $INSTALL_DIR/node_modules
    rm -f $INSTALL_DIR/.env.local
    
    echo "✅ Application files copied"
}

# Function to build Docker image
build_image() {
    echo "🔨 Building Docker image..."
    
    cd $INSTALL_DIR
    docker build -t streaming-platform:latest .
    
    echo "✅ Docker image built"
}

# Function to deploy with Docker Compose
deploy_containers() {
    echo "🚀 Deploying containers..."
    
    cd $INSTALL_DIR
    
    # Update docker-compose.yml with correct paths
    sed -i "s|./recordings|$DATA_DIR/recordings|g" docker-compose.yml
    sed -i "s|./media|$DATA_DIR/media|g" docker-compose.yml
    sed -i "s|./uploads|$DATA_DIR/uploads|g" docker-compose.yml
    
    # Deploy with Docker Compose
    docker compose --env-file .env up -d
    
    echo "✅ Containers deployed"
}

# Function to setup database
setup_database() {
    echo "🗄️ Setting up database..."
    
    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for database to be ready..."
    sleep 30
    
    # Run database migrations
    docker exec streaming-platform npm run db:push
    
    echo "✅ Database setup complete"
}

# Function to configure firewall
configure_firewall() {
    echo "🔥 Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow 5000/tcp  # Web interface
        sudo ufw allow 1935/tcp  # RTMP
        sudo ufw allow 8000/tcp  # HLS
        
        # Ask about Portainer
        read -p "Do you want to install Portainer? (y/n): " install_portainer
        if [[ $install_portainer == "y" ]]; then
            sudo ufw allow 9443/tcp  # Portainer
            install_portainer_container
        fi
        
        echo "✅ Firewall configured"
    else
        echo "⚠️ UFW not found. Please configure firewall manually:"
        echo "   - Port 5000: Web interface"
        echo "   - Port 1935: RTMP input"
        echo "   - Port 8000: HLS output"
    fi
}

# Function to install Portainer
install_portainer_container() {
    echo "🎛️ Installing Portainer..."
    
    docker volume create portainer_data
    docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v portainer_data:/data \
      portainer/portainer-ce:latest
    
    echo "✅ Portainer installed at https://$(hostname -I | awk '{print $1}'):9443"
}

# Function to display final information
show_completion_info() {
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "===================="
    echo ""
    echo "📱 Web Interface: http://$SERVER_IP:5000"
    echo "📡 RTMP Input: rtmp://$SERVER_IP:1935/live/YOUR_STREAM_KEY"
    echo "📺 HLS Output: http://$SERVER_IP:8000/live/YOUR_STREAM_KEY/index.m3u8"
    echo ""
    echo "🗄️ Database Password: $POSTGRES_PASSWORD"
    echo ""
    echo "📁 Data Directories:"
    echo "   - Recordings: $DATA_DIR/recordings"
    echo "   - Media: $DATA_DIR/media"
    echo "   - Uploads: $DATA_DIR/uploads"
    echo ""
    echo "🔧 Management Commands:"
    echo "   - View logs: docker logs streaming-platform"
    echo "   - Restart app: docker restart streaming-platform"
    echo "   - Update app: cd $INSTALL_DIR && docker compose pull && docker compose up -d"
    echo ""
    echo "⚠️ Important: Save the database password in a secure location!"
}

# Main execution
main() {
    check_prerequisites
    create_directories
    create_env_file
    copy_application
    build_image
    deploy_containers
    setup_database
    configure_firewall
    show_completion_info
}

# Run main function
main "$@"