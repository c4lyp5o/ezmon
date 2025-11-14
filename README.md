# 🌐 ezmon

![Node.js](https://img.shields.io/badge/Bun-v1.3.1-blue?logo=node.js\&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-blue?logo=docker)
![PM2](https://img.shields.io/badge/PM2-runtime-green)
![React](https://img.shields.io/badge/React-frontend-blue?logo=react)

A **lightweight, high-performance site monitoring tool** built with Bun, React, Vite, and PM2. Keep track of your services and applications in **real-time** with minimal overhead.

---

## 🚀 Overview

`ezmon` is designed for **speed, simplicity, and reliability**. It monitors your applications, workers, and services, giving instant feedback on their status. Built with **Bun** and **PM2**, it’s optimized for both development and production environments.

---

## ✨ Features

* 🖥️ **Real-time Monitoring** – Instant service health updates.
* ⚡ **High Performance** – Powered by Bun for lightning-fast execution.
* 🧩 **Worker Management** – Background tasks handled with PM2.
* 🛠️ **Minimal & Lightweight** – Only what you need, no bloat.
* 🛡️ **Production-Ready** – Docker-ready, cluster mode, autorestart, environment support.
* 🧑‍💻 **Developer-Friendly** – Vite + React front-end, Bun dev tooling, concurrent workflows.

---

## 🛠️ Tech Stack

| Technology       | Purpose                                |
| ---------------- | -------------------------------------- |
| Bun              | Fast JavaScript runtime                |
| PM2              | Process manager for cluster/fork modes |
| React            | Dynamic, responsive frontend           |
| Vite             | Rapid frontend build & dev tooling     |
| MongoDB/Mongoose | Database layer                         |
| deadslog         | Structured logging                     |

---

## 📦 Installation

Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd ezmon
bun install
bun install:all   # Installs both server & client deps
```

---

## 🏗️ Development

Start development mode with live reloading:

```bash
bun dev
```

This concurrently runs:

* **Client:** React + Vite (`bun dev:client`)
* **Server:** Bun backend (`bun dev:server`)
* **Worker:** Background jobs (`bun dev:worker`)

---

## 🚀 Build & Production

### Build the frontend

```bash
bun build-client
```

### Run in production with PM2

```bash
bun start
```

PM2 manages all processes using the configuration in `ecosystem.config.js`.

Other PM2 commands:

```bash
bun stop      # Stop all apps
bun restart   # Restart all apps
bun logs      # Monitor logs in real-time
```

---

## 🐳 Docker

**Build the Docker image:**

```bash
docker build -t ezmon .
```

**Run the container:**

```bash
docker run -d -p 5000:5000 --env-file .env ezmon
```

* Frontend available at `/dist`
* Backend exposed on port `5000`
* PM2 manages all processes inside the container

---

## ⚙️ Configuration

* **Backend:** `.env` file for environment variables
* **PM2:** `ecosystem.config.js` for cluster/fork mode and environment-specific configs
* **Frontend:** `client/vite.config.js` for build and dev settings

---

## 📂 Project Structure

```
/ezmon
├─ /client       # React frontend
├─ /src          # Backend code (Bun + Elysia)
├─ package.json
├─ ecosystem.config.js  # PM2 config
├─ Dockerfile
├─ .env
```

---

## 💡 Tips

* Use `bun dev` during development for concurrent server, client, and worker processes.
* Use Docker in production for a lightweight, isolated deployment.
* PM2 cluster mode scales automatically to CPU cores.

---

## 🔗 Links

* [Bun](https://bun.sh)
* [PM2](https://pm2.keymetrics.io/)
* [React](https://reactjs.org/)
* [Vite](https://vitejs.dev/)
