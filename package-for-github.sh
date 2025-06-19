#!/bin/bash

# Package streaming platform for GitHub upload
echo "📦 Packaging streaming platform for GitHub..."

# Create package directory
mkdir -p github-package

# Copy essential files
cp -r client github-package/
cp -r server github-package/
cp -r shared github-package/
cp package.json github-package/
cp package-lock.json github-package/
cp tsconfig.json github-package/
cp vite.config.ts github-package/
cp tailwind.config.ts github-package/
cp postcss.config.js github-package/
cp drizzle.config.ts github-package/
cp theme.json github-package/

# Copy Docker and deployment files
cp Dockerfile github-package/
cp docker-compose.yml github-package/
cp portainer-stack.yml github-package/
cp deploy.sh github-package/
cp .dockerignore github-package/
cp .env.example github-package/

# Copy documentation
cp README.md github-package/
cp DEPLOYMENT.md github-package/

# Create .gitignore
cat > github-package/.gitignore << 'EOF'
node_modules
dist
.env
.env.local
.env.production
npm-debug.log
yarn-error.log
recordings/*
media/*
uploads/*
.replit
replit.nix
package-lock.json
EOF

# Create archive
tar -czf streaming-platform.tar.gz github-package/

echo "✅ Package created: streaming-platform.tar.gz"
echo "📋 Files included:"
ls -la github-package/

echo ""
echo "🚀 Next steps:"
echo "1. Download streaming-platform.tar.gz"
echo "2. Extract on your local machine"
echo "3. Upload to GitHub repository"
echo "4. Or use git commands to push to GitHub"