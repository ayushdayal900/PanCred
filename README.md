<div align="center">
  
 
  
  # MicroFin 
  
  *Enterprise-Grade Web3 Microfinance Platform*
  
  [**Explore the Docs**](#) · [**Report Bug**](#) · [**Request Feature**](#)
  
  ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
  ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
  ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
  ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
  ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
</div>

---

## 📖 About The Project

**MicroFin** is a fully functional, production-grade microfinance web application. It is designed to connect verified borrowers and lenders through a secure, scalable, and decentralized infrastructure. 

### Why MicroFin?
- **Enterprise-Grade Architecture**: Built with a scalable microservices approach.
- **Premium UI/UX**: Features a highly polished, responsive, and dynamic interface powered by Tailwind CSS v4 and Framer Motion.
- **Web3 Ready**: Prepared for Smart Contract integration (Ethers.js/Hardhat).
- **AI-Powered**: Architecture ready to consume robust FastAPI python microservices for credit scoring.
- **Robust DevOps**: Automated AWS deployments configured via GitHub Actions.

## 🏗️ Technical Architecture

This repository uses a structured workspace, separating concerns into individual components:

* `frontend/`: React Vite application (UI Layer)
* `backend/`: Node.js + Express API (Core Business Logic)
* `.github/`: CI/CD Workflows for AWS S3 and EC2 deployments

---

## 🚀 Getting Started Locally

Follow these instructions to get a copy of the project up and running on your local machine for development and testing.

### Prerequisites

Ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [MongoDB Community Server](https://www.mongodb.com/try/download/community) (or an Atlas API Key)
* [Redis](https://redis.io/download/) (running locally, or use a managed service)
* npm (comes with Node.js)

### 1. Clone the repository

```sh
git clone https://github.com/ayushdayal900/aamba.git
cd aamba
```

### 2. Start the Backend API

Open a new terminal window and navigate to the backend directory:

```sh
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/microfin
REDIS_URL=redis://localhost:6379
```

Start the backend server:
```sh
npm run dev
# OR: npx nodemon index.js
```
*The backend should now be running on `http://localhost:5000`*

### 3. Start the Frontend React App

Open *another* terminal window and navigate to the frontend directory:

```sh
cd frontend
npm install
```

Start the Vite development server:
```sh
npm run dev
```
*The frontend should now be running, typically on `http://localhost:5173`. Open this URL in your browser to see the application!*

---

## 🛣️ Roadmap

- [x] Phase 1: Frontend & Backend Foundations
- [ ] Phase 2: AWS Infrastructure Deployment
- [ ] Phase 3: Smart Contracts & Blockchain Integration
- [ ] Phase 4: ML Credit Scoring Service
- [ ] Phase 5: Production Launch & Audits

## 🛡️ Security
This project uses `helmet` for HTTP header security and implements best practices for CORS and environments.

## 📄 License
Copyright © 2026. All Rights Reserved.
