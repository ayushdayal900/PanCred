# AWS Deployment Guide: Frontend on Amplify & Backend on EC2

This guide outlines the complete step-by-step process to deploy your application to AWS, with the Vite/React frontend hosted on AWS Amplify and the Node.js/Express backend hosted on an EC2 instance.

## Part 1: Frontend Deployment on AWS Amplify

AWS Amplify provides a seamless, fully-managed hosting service for frontend applications. Since your frontend is in a subdirectory (`frontend/`), we'll configure Amplify to build from that specific folder.

### 1. Push Code to GitHub
Ensure all your code (including the newly created `amplify.yml` file) is pushed to your GitHub repository. The `amplify.yml` file in the root tells Amplify how to build your frontend.

### 2. Connect to AWS Amplify
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Search for **AWS Amplify** in the search bar and select it.
3. Click on **New app** -> **Host web app**.
4. Choose **GitHub** as the source and click **Continue**.
5. Authenticate with GitHub and authorize AWS Amplify to access your repositories.
6. Select your repository and the branch (e.g., `main`).
7. **Important**: Because your app is in a monorepo structure, checking "Connecting a monorepo" is optional since the custom `amplify.yml` provided in the root handles the `appRoot: frontend` logic automatically.
8. Click **Next** -> **Save and deploy**.

Amplify will now automatically provision, build, and deploy your frontend. Once completed, you will receive a public URL (e.g., `https://main.xxxxxxxx.amplifyapp.com`).

---

## Part 2: Backend Deployment on AWS EC2

Your backend represents the core API and needs to be hosted on a virtual server (EC2) and managed by PM2.

### 1. Launch an EC2 Instance
1. Go to the **EC2 Dashboard** in AWS.
2. Click **Launch Instance**.
3. **Name**: `aamba-backend-server`
4. **OS API**: Select **Amazon Linux 2023 AMI** (Default eligible for free tier).
5. **Instance Type**: `t2.micro` or `t3.micro`.
6. **Key Pair**: Create a new key pair (e.g., `aamba-key.pem`) and download it. **Keep this safe!**
7. **Network Settings**:
   - Check **Allow SSH traffic** (from anywhere or your IP).
   - Check **Allow HTTP traffic from the internet**.
   - Check **Allow HTTPS traffic from the internet**.
8. **Storage**: 8 GB gp3 is sufficient.
9. Click **Launch Instance**.

### 2. Configure Custom TCP Port (Important)
Since your backend runs on a specific port (e.g., `3000` or `5000`):
1. In the EC2 console, select your instance and go to the **Security** tab.
2. Click on the attached Security Group.
3. Click **Edit inbound rules** -> **Add rule**.
4. Type: **Custom TCP**, Port range: `3000` (or whatever your actual backend port is), Source: `Anywhere-IPv4` (`0.0.0.0/0`).
5. Save rules.

### 3. Connect to EC2 and Setup Environment
Open your terminal and SSH into your instance using the downloaded key:

```bash
# Change permissions of your key file to be read-only (Important for security)
chmod 400 aamba-key.pem

# Connect to the Amazon Linux EC2 instance 
# (Replace IP with your instance's Public IPv4 address)
ssh -i "aamba-key.pem" ec2-user@<YOUR_EC2_PUBLIC_IP>
```

Run the following commands on the server to install necessary dependencies using Amazon Linux (`dnf`):

```bash
# Update packages
sudo dnf update -y

# Install Git
sudo dnf install git -y

# Install Node.js (v20 via NodeSource)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### 4. Clone Repository and Start Backend
```bash
# Clone your repository
git clone https://github.com/ayushdayal900/aamba.git
cd aamba/backend

# Install backend dependencies
npm install

# Create environment variables file
nano .env
# -> Paste your backend variables here (MongoDB URI, JWT secret, etc.)
# -> Save and exit (Ctrl+O, Enter, Ctrl+X)

# Start the application with PM2
pm2 start index.js --name "aamba-backend"
pm2 save
pm2 startup
# -> Run the generated startup command shown in the terminal (copy+paste and hit enter)
```

### 5. Finalize Configuration
1. **Frontend API URL**: Go back to your frontend code, locate `.env` or configuration file, and set the API URL to your EC2 instance's IP address: `http://<EC2_PUBLIC_IP>:3000`. (Commit and push this change so Amplify redeploys).
2. **Reverse Proxy (Optional but Recommended)**: To allow HTTPS on your backend, install Nginx and Certbot on your EC2 instance to proxy traffic from port 80/443 to your backend port. Let me know if you need instructions for this!

---

## Part 3: Automated Backend Deployment (CI/CD)

I have updated `.github/workflows/deploy.yml` to automatically deploy updates to your EC2 instance whenever you push to the `backend/` directory on the `main` branch.

**To make this work, add the following secrets to your GitHub Repository (Settings -> Secrets and variables -> Actions -> New repository secret):**
- `EC2_HOST`: The Public IP of your EC2 instance.
- `EC2_USERNAME`: `ec2-user`
- `EC2_SSH_KEY`: The entire content of your `aamba-key.pem` file.
