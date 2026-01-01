# Realm Tracker

A fantastical board game health tracker with webcam portraits, animated damage/healing effects, and arcane shields.

## Features

- Track vitality and arcane shields for multiple players
- Webcam photo capture for player portraits
- Fantastical UI with animations for damage/healing
- Shields absorb damage before health
- Responsive design for desktop and mobile

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Important: Camera Access Requires HTTPS

Modern browsers require **HTTPS** (secure connection) to access the camera, except when running on `localhost`.

If you deploy this with Docker and access it via `http://your-server-ip`, the camera will not work. You have several options:

1. **Use HTTPS** - Set up SSL certificates (recommended for production)
2. **SSH Port Forwarding** - Forward the port to localhost for testing:
   ```bash
   ssh -L 8080:localhost:8080 your-server
   # Then access at http://localhost:8080
   ```
3. **Cloudflare Tunnel** or similar services that provide HTTPS automatically

## Docker Deployment

### Build the Docker image

```bash
docker build -t realm-tracker .
```

### Run the container

```bash
docker run -d -p 8080:80 --name realm-tracker realm-tracker
```

The app will be available at `http://your-server-ip:8080`

### Using a different port

To run on a different port (e.g., 3000):

```bash
docker run -d -p 3000:80 --name realm-tracker realm-tracker
```

### Stop and remove the container

```bash
docker stop realm-tracker
docker rm realm-tracker
```

### Update deployment

To deploy a new version:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker stop realm-tracker
docker rm realm-tracker
docker build -t realm-tracker .
docker run -d -p 8080:80 --name realm-tracker realm-tracker
```

## Docker Compose (optional)

Create a `docker-compose.yml` file:

```yaml
services:
  realm-tracker:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

Then run:

```bash
docker compose up -d
```
