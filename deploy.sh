#!/bin/bash

# Tag-Link Deployment Script

set -e

echo "🚀 Tag-Link Deployment Script"
echo "================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before deploying"
    exit 1
fi

# Parse command line arguments
ENVIRONMENT=${1:-dev}
ACTION=${2:-up}

case $ENVIRONMENT in
    dev|development)
        echo "📦 Deploying in DEVELOPMENT mode..."
        COMPOSE_FILE="docker-compose.yml"
        ;;
    prod|production)
        echo "🏭 Deploying in PRODUCTION mode..."
        COMPOSE_FILE="docker-compose.prod.yml"
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [dev|prod] [up|down|restart|logs|build]"
        exit 1
        ;;
esac

case $ACTION in
    up)
        echo "⬆️  Starting services..."
        docker-compose -f $COMPOSE_FILE up -d --build
        echo "✅ Services started!"
        echo ""
        echo "🌐 Access points:"
        if [ "$ENVIRONMENT" = "dev" ]; then
            echo "  Frontend:    http://localhost:3000"
            echo "  Backend API: http://localhost:8000/api"
            echo "  API Docs:    http://localhost:8000/api/docs"
            echo "  Neo4j:       http://localhost:7474"
        else
            echo "  Application: http://your-domain.com"
            echo "  API:         http://your-domain.com/api"
        fi
        ;;
    down)
        echo "⬇️  Stopping services..."
        docker-compose -f $COMPOSE_FILE down
        echo "✅ Services stopped!"
        ;;
    restart)
        echo "🔄 Restarting services..."
        docker-compose -f $COMPOSE_FILE restart
        echo "✅ Services restarted!"
        ;;
    logs)
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    build)
        echo "🔨 Building services..."
        docker-compose -f $COMPOSE_FILE build --no-cache
        echo "✅ Build complete!"
        ;;
    ps|status)
        docker-compose -f $COMPOSE_FILE ps
        ;;
    *)
        echo "❌ Invalid action: $ACTION"
        echo "Usage: $0 [dev|prod] [up|down|restart|logs|build|status]"
        exit 1
        ;;
esac
