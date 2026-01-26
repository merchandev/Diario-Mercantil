# Deployment Guide - Diario Mercantil

## Prerequisites on Server
- Docker and Docker Compose v2 installed
- Git repository cloned or files copied to `/docker/diario-mercantil`

---

## Deployment Steps

### Step 1: Navigate to Project Directory
```bash
cd /docker/diario-mercantil
```

### Step 2: Stop Existing Containers (if any)
```bash
docker compose down
```

### Step 3: Remove Old Volumes (CAUTION: This will delete data)
```bash
docker volume rm diario-mercantil_db_data
```

### Step 4: Build Images
```bash
docker compose build --no-cache
```

**Expected**: This will take 3-5 minutes. Both frontend and backend should build successfully.

### Step 5: Start Services
```bash
docker compose up -d
```

### Step 6: Wait for MySQL to be Ready
```bash
# Check logs until you see "ready for connections"
docker logs diario-mercantil-db-1 -f
# Press Ctrl+C when you see the message
```

### Step 7: Initialize Database
```bash
chmod +x init_database.sh
./init_database.sh
```

**Expected Output**:
```
✅ MySQL is ready
✅ Database initialized successfully
Superadmins: 1
Users: 2
Tables: 15
```

### Step 8: Health Check
```bash
chmod +x healthcheck.sh
./healthcheck.sh
```

**Expected**: All 6 tests should pass.

---

## Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://YOUR_IP/ | - |
| Superadmin | http://YOUR_IP/lotus/ | merchandev / G0ku*1896 |
| Admin Login | http://YOUR_IP/login | V12345678 / Admin#2025! |
| Solicitante Login | http://YOUR_IP/login | J000111222 / Test#2025! |
| phpMyAdmin | http://YOUR_IP:8080 | root / root_secure_password_2025 |

---

## Verification

### Test Superadmin Login
1. Go to `http://YOUR_IP/lotus/`
2. Enter: `merchandev` / `G0ku*1896`
3. Should redirect to dashboard

### Test Normal Login
1. Go to `http://YOUR_IP/login`
2. Enter: `V12345678` / `Admin#2025!`
3. Should redirect to admin panel

---

## Troubleshooting

### Build Fails
```bash
# Check Docker logs
docker compose logs backend
docker compose logs frontend

# Try rebuilding one service at a time
docker compose build backend
docker compose build frontend
```

### Database Connection Fails
```bash
# Check if DB is healthy
docker ps
# Should show "healthy" for db container

# Check backend can connect
docker exec diario-mercantil-backend-1 php -r "require 'src/Database.php'; Database::pdo(); echo 'OK';"
```

### Login Returns 401
```bash
# Verify password hash
docker exec diario-mercantil-backend-1 php -r "
require 'src/Database.php';
\$pdo = Database::pdo();
\$hash = \$pdo->query('SELECT password_hash FROM superadmins')->fetchColumn();
echo password_verify('G0ku*1896', \$hash) ? 'VALID' : 'INVALID';
"
```

Should print `VALID`.

---

## Complete Reset

If something goes wrong, start fresh:

```bash
# Stop everything
docker compose down -v

# Remove all related containers and images
docker rm -f $(docker ps -a | grep diario-mercantil | awk '{print $1}')
docker rmi $(docker images | grep diario-mercantil | awk '{print $3}')

# Start from Step 4 again
```
