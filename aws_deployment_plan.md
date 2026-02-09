# AWS Deployment Plan - My Voice Strategic Engine

This plan outlines the steps to deploy the application to the AWS EC2 instance at `100.52.241.136` using the provided PEM key.

## 1. Prerequisites (on the EC2 Instance)
- **Node.js**: Install Node.js 20.x or higher.
- **Docker & Docker Compose**: To run the PostgreSQL database.
- **Nginx**: As a reverse proxy to serve the frontend and route API calls.
- **PM2**: To keep the Node.js backend running in the background.
- **Git**: To pull the latest code.

## 2. Server Preparation
1. **Security Groups**: Ensure ports `80` (HTTP), `443` (HTTPS, optional), and `22` (SSH) are open in the AWS Console for the instance.
2. **Environment Variables**: Prepare the `.env` file for the backend on the server.

## 3. Database Deployment
1. Use `docker-compose up -d` to start the PostgreSQL container.
2. Ensure the `DATABASE_URL` in the backend `.env` points to the local container.

## 4. Backend Deployment
1. Navigate to `/server`.
2. `npm install`.
3. `npx prisma generate`.
4. `npm run build`.
5. Start the server with PM2: `pm2 start dist/index.js --name myvoice-api`.

## 5. Frontend Deployment
1. Build the production bundle: `npm install` and `npm run build`.
2. Configure Nginx to serve the `dist/` folder.
3. Update the frontend BASE_URL to point to `/api` or the server's public IP.

## 6. Reverse Proxy Configuration (Nginx)
Configure `/etc/nginx/sites-available/default`:
- Serve the frontend `dist/` on `/`.
- Proxy requests on `/api` to `http://localhost:3001`.

---

### Step-by-Step Execution Guide

#### A. Initial Connection
```bash
ssh -i "/Users/buentipo/Downloads/myvoice.pem" ubuntu@100.52.241.136
```

#### B. Install Dependencies (Example for Ubuntu)
```bash
sudo apt update
sudo apt install -y docker.io docker-compose nginx git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

#### C. Code Transfer & Setup
```bash
git clone <repository_url>
cd my-voice
# Setup .env files
# Run Docker
sudo docker-compose up -d
```
