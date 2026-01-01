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
