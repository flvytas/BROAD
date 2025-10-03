# BROAD Streaming Platform - GUI Installation Guide

Complete guide for installing BROAD using **Portainer** or **Docker Desktop** with graphical interfaces (no command line required for deployment).

---

## Table of Contents
- [Option 1: Install with Portainer](#option-1-install-with-portainer)
- [Option 2: Install with Docker Desktop](#option-2-install-with-docker-desktop)
- [Post-Installation Steps](#post-installation-steps)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- Ubuntu, Ubuntu Mint, or similar Linux distribution
- Internet connection
- Sudo/administrator privileges
- At least 8GB RAM (16GB recommended for streaming)

---

# Option 1: Install with Portainer

Portainer provides a web-based GUI for managing Docker containers and stacks.

## Step 1: Install Portainer

### 1.1 Open Terminal and Install Portainer

```bash
# Install Portainer (one command)
docker run -d -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

### 1.2 Access Portainer Web Interface

1. Open your web browser
2. Navigate to: `https://localhost:9443` or `https://your-server-ip:9443`
3. **First time setup**:
   - Create an **admin username** (e.g., `admin`)
   - Create a **strong password** (minimum 12 characters)
   - Click **Create user**
4. Select **Get Started** to connect to your local Docker environment

---

## Step 2: Download BROAD Files

You need the `docker-compose.yml` file from the BROAD repository.

### Option A: Download Manually
1. Visit: https://github.com/flvytas/BROAD
2. Click on `docker-compose.yml`
3. Click **Raw** button
4. Right-click → **Save Page As** → Save to your computer

### Option B: Clone Repository (Terminal)
```bash
git clone https://github.com/flvytas/BROAD.git
cd BROAD
# Now you have all files including docker-compose.yml
```

---

## Step 3: Deploy BROAD Stack in Portainer

### 3.1 Create New Stack

1. In Portainer, click **Stacks** in the left sidebar
2. Click **+ Add stack** button
3. Enter stack name: `broad-streaming-platform`

### 3.2 Add Docker Compose Configuration

**Choose Method A (easier) or Method B:**

#### Method A: Web Editor (Copy & Paste)

1. Select **Web editor** tab (default)
2. Open your downloaded `docker-compose.yml` file in a text editor
3. **Copy all contents** from the file
4. **Paste** into the Portainer web editor

#### Method B: Upload File

1. Select **Upload** tab
2. Click **Select file**
3. Browse to your `docker-compose.yml` file
4. Click **Open**

### 3.3 Configure Environment Variables

Scroll down to the **Environment variables** section:

1. Click **Add environment variable** for each:

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `POSTGRES_PASSWORD` | `YourSecurePassword123` (choose strong password) |
| `DATABASE_URL` | `postgresql://streaming_user:YourSecurePassword123@postgres:5432/streaming_db` |

**Important**: Replace `YourSecurePassword123` with your actual password in **both** variables.

### 3.4 Deploy the Stack

1. Scroll down
2. Click **Deploy the stack** button
3. Wait 30-60 seconds for containers to start
4. You should see "✓ Success - Stack successfully deployed"

---

## Step 4: Initialize Database

After deployment, you need to create the database tables.

### 4.1 Access Container Console in Portainer

1. Click **Containers** in the left sidebar
2. Find container named `broad-streaming-platform-streaming-app-1` or similar
3. Click on the container name
4. Click **Console** (terminal icon)
5. Select **Command**: `/bin/sh` or `/bin/bash`
6. Click **Connect**

### 4.2 Run Database Migration

In the container console, type:
```bash
npm run db:push
```

Press Enter and wait for "Database schema updated successfully" message.

### 4.3 Exit Console
Click the **X** or close the console tab.

---

## Step 5: Access BROAD Application

1. In Portainer, go to **Containers**
2. Find your `streaming-app` container
3. Check the **Published Ports** column - you should see `0.0.0.0:5000→5000/tcp`
4. Open browser and go to: **http://localhost:5000** or **http://your-server-ip:5000**

**You should see the BROAD streaming platform interface!**

---

# Option 2: Install with Docker Desktop

Docker Desktop provides a native desktop application with GUI for container management.

## Step 1: Install Docker Desktop on Ubuntu

### 1.1 Download Docker Desktop

```bash
# Download latest version
wget https://desktop.docker.com/linux/main/amd64/docker-desktop-latest-amd64.deb
```

### 1.2 Install Docker Desktop

```bash
# Install required dependencies
sudo apt-get update
sudo apt-get install gnome-terminal

# Install Docker Desktop
sudo apt-get install ./docker-desktop-latest-amd64.deb
```

### 1.3 Launch Docker Desktop

1. Open your applications menu
2. Search for "Docker Desktop"
3. Click to launch
4. Accept the **Docker Subscription Service Agreement**
5. Wait for Docker Desktop to start (you'll see a whale icon in the system tray)

---

## Step 2: Download BROAD Repository

### Using Git (Recommended)

1. Open Terminal
2. Run:
```bash
cd ~
git clone https://github.com/flvytas/BROAD.git
cd BROAD
```

### Manual Download

1. Visit: https://github.com/flvytas/BROAD
2. Click the green **Code** button
3. Select **Download ZIP**
4. Extract the ZIP file to a folder (e.g., `/home/yourusername/BROAD`)

---

## Step 3: Configure Environment Variables

### 3.1 Create .env File

In the BROAD folder, create a file named `.env`:

**Using Text Editor:**
1. Open text editor (gedit, nano, or any editor)
2. Create new file
3. Add these lines:

```env
NODE_ENV=production
POSTGRES_PASSWORD=YourSecurePassword123
DATABASE_URL=postgresql://streaming_user:YourSecurePassword123@postgres:5432/streaming_db
```

4. Save as `.env` in the BROAD folder
5. **Important**: Replace `YourSecurePassword123` with your strong password

**Using Terminal:**
```bash
cd ~/BROAD
cat > .env << EOF
NODE_ENV=production
POSTGRES_PASSWORD=YourSecurePassword123
DATABASE_URL=postgresql://streaming_user:YourSecurePassword123@postgres:5432/streaming_db
EOF
```

---

## Step 4: Deploy with Docker Desktop

### 4.1 Open Docker Desktop Dashboard

1. Click the Docker Desktop icon in system tray
2. Click **Dashboard** to open the main window

### 4.2 Deploy Using Terminal

Open terminal in the BROAD folder and run:

```bash
# Build the application
docker compose build

# Start all containers in background
docker compose up -d
```

### 4.3 Monitor in Docker Desktop

1. In Docker Desktop Dashboard, you should see a new container group: **broad**
2. Click to expand and see all containers:
   - `streaming-app` (main application)
   - `postgres` (database)
3. Check that all containers show **Running** status (green icon)

---

## Step 5: Initialize Database in Docker Desktop

### 5.1 Access Container Terminal

1. In Docker Desktop, find the **streaming-app** container
2. Click on the container name
3. Click the **Terminal** tab (or **Exec** tab)

### 5.2 Run Database Migration

In the terminal, type:
```bash
npm run db:push
```

Wait for success message.

---

## Step 6: Access BROAD Application

1. In Docker Desktop, click on the **streaming-app** container
2. Look for **Port Mapping**: `5000:5000`
3. Click the port link, or open browser to: **http://localhost:5000**

**Your BROAD streaming platform is now running!**

---

# Post-Installation Steps

After successful installation using either method:

## 1. Test Stream Input

- **RTMP Input URL**: `rtmp://localhost:1935/live/YOUR_STREAM_KEY`
- Use OBS Studio or similar software to test streaming

## 2. Configure Outputs

1. Log in to BROAD web interface
2. Create a stream
3. Add outputs (RTMP, SRT, or Blackmagic Decklink SDI)

## 3. Check System Health

In the web interface:
- Monitor stream health (bitrate, resolution)
- Check audio levels
- Verify output connections

---

# Managing Your Installation

## With Portainer

### Start Stack
1. Go to **Stacks** → Select `broad-streaming-platform`
2. Click **Start** button

### Stop Stack
1. Go to **Stacks** → Select `broad-streaming-platform`
2. Click **Stop** button

### View Logs
1. Go to **Containers**
2. Click on container name
3. Click **Logs**

### Update Application
1. Download new `docker-compose.yml` from GitHub
2. Go to **Stacks** → Select your stack
3. Click **Editor**
4. Paste new configuration
5. Click **Update the stack**

### Remove Stack
1. Go to **Stacks** → Select `broad-streaming-platform`
2. Click **Delete this stack**
3. Confirm deletion

## With Docker Desktop

### Start Containers
1. Open Docker Desktop Dashboard
2. Find **broad** project
3. Click **Start** button

### Stop Containers
1. Find **broad** project
2. Click **Stop** button

### View Logs
1. Click on container name
2. View logs in real-time

### Update Application
```bash
cd ~/BROAD
git pull origin main
docker compose build
docker compose up -d
```

### Remove Containers
1. Click **broad** project
2. Click **Delete** (trash icon)
3. Or in terminal: `docker compose down`

---

# Troubleshooting

## Port Already in Use

**Error**: "Port 5000 is already allocated"

**Solution**:
1. Find what's using port 5000: `sudo lsof -i :5000`
2. Stop that service or change BROAD port in `docker-compose.yml`:
```yaml
ports:
  - "8080:5000"  # Change 5000 to 8080
```

## Containers Won't Start

**Check Docker is running:**
```bash
sudo systemctl status docker
```

**Start Docker:**
```bash
sudo systemctl start docker
```

## Database Connection Errors

1. Ensure `POSTGRES_PASSWORD` matches in both environment variables
2. Wait 30 seconds after starting containers
3. Run `npm run db:push` again in container console

## Can't Access Web Interface

1. Check container is running (green status)
2. Verify port mapping: should be `5000:5000`
3. Try `http://127.0.0.1:5000` instead of `localhost`
4. Check firewall: `sudo ufw allow 5000`

## Portainer: Stack Deploy Failed

1. Check YAML syntax in web editor (no extra spaces/tabs)
2. Ensure all environment variables are set
3. Check Docker is running: `docker ps`

---

# Additional Resources

- **BROAD GitHub**: https://github.com/flvytas/BROAD
- **Full Deployment Guide**: See `DEPLOYMENT.md` in repository
- **Portainer Documentation**: https://docs.portainer.io
- **Docker Desktop Documentation**: https://docs.docker.com/desktop/

---

# Need Help?

If you encounter issues:
1. Check container logs in Portainer or Docker Desktop
2. Review environment variables configuration
3. Ensure all ports are available (5000, 1935, 8000)
4. Verify system meets minimum requirements (8GB RAM)

---

**Congratulations!** You've successfully installed BROAD using a GUI-based approach. No command-line expertise required for daily operation.
