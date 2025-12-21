#!/bin/bash

# Script pour lancer l'API et exécuter les tests
# Usage: ./run_tests.sh [--api-only|--tests-only]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_PORT=8000
API_HOST="0.0.0.0"
VENV_DIR="venv"
API_PID_FILE=".api.pid"

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_neo4j() {
    print_info "Vérification de la connexion Neo4j..."
    if ! command -v nc &> /dev/null; then
        print_warning "netcat n'est pas installé, impossible de vérifier Neo4j"
        return 0
    fi
    
    if nc -z localhost 7687 2>/dev/null; then
        print_success "Neo4j est accessible sur le port 7687"
        return 0
    else
        print_error "Neo4j n'est pas accessible sur le port 7687"
        print_info "Lancez Neo4j avec: docker run --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest"
        return 1
    fi
}

setup_venv() {
    if [ ! -d "$VENV_DIR" ]; then
        print_info "Création de l'environnement virtuel..."
        python3 -m venv "$VENV_DIR"
    fi
    
    print_info "Activation de l'environnement virtuel..."
    source "$VENV_DIR/bin/activate"
    
    print_info "Installation des dépendances..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    
    if [ -f "requirements-dev.txt" ]; then
        pip install -q -r requirements-dev.txt
    fi
    
    print_success "Environnement prêt"
}

start_api() {
    print_info "Démarrage de l'API sur http://${API_HOST}:${API_PORT}..."
    
    # Kill existing API if running
    if [ -f "$API_PID_FILE" ]; then
        OLD_PID=$(cat "$API_PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            print_warning "API déjà en cours d'exécution (PID: $OLD_PID), arrêt..."
            kill "$OLD_PID" 2>/dev/null || true
            sleep 2
        fi
        rm "$API_PID_FILE"
    fi
    
    # Start API in background
    uvicorn main:app --host "$API_HOST" --port "$API_PORT" > /dev/null 2>&1 &
    API_PID=$!
    echo $API_PID > "$API_PID_FILE"
    
    # Wait for API to be ready
    print_info "Attente du démarrage de l'API..."
    for i in {1..30}; do
        if curl -s "http://localhost:${API_PORT}/health" > /dev/null 2>&1; then
            print_success "API démarrée (PID: $API_PID)"
            return 0
        fi
        sleep 1
    done
    
    print_error "L'API n'a pas démarré dans les temps"
    return 1
}

stop_api() {
    if [ -f "$API_PID_FILE" ]; then
        API_PID=$(cat "$API_PID_FILE")
        if ps -p "$API_PID" > /dev/null 2>&1; then
            print_info "Arrêt de l'API (PID: $API_PID)..."
            kill "$API_PID" 2>/dev/null || true
            sleep 1
            
            # Force kill if still running
            if ps -p "$API_PID" > /dev/null 2>&1; then
                kill -9 "$API_PID" 2>/dev/null || true
            fi
            
            print_success "API arrêtée"
        fi
        rm "$API_PID_FILE"
    fi
}

run_tests() {
    print_info "Exécution des tests..."
    echo ""
    
    if pytest tests/ -v --tb=short; then
        echo ""
        print_success "Tous les tests sont passés ✓"
        return 0
    else
        echo ""
        print_error "Certains tests ont échoué ✗"
        return 1
    fi
}

cleanup() {
    print_info "Nettoyage..."
    stop_api
}

# Trap to ensure cleanup on exit
trap cleanup EXIT INT TERM

# Main script
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║    TagLink API - Test Runner          ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    # Parse arguments
    MODE="all"
    if [ "$1" == "--api-only" ]; then
        MODE="api"
    elif [ "$1" == "--tests-only" ]; then
        MODE="tests"
    fi
    
    # Check Neo4j connection
    if ! check_neo4j; then
        exit 1
    fi
    
    # Setup environment
    setup_venv
    
    # Execute based on mode
    if [ "$MODE" == "api" ]; then
        print_info "Mode: API seulement"
        start_api
        print_success "API en cours d'exécution. Appuyez sur Ctrl+C pour arrêter."
        wait $API_PID
    elif [ "$MODE" == "tests" ]; then
        print_info "Mode: Tests seulement"
        run_tests
    else
        print_info "Mode: API + Tests"
        start_api
        echo ""
        run_tests
        TEST_EXIT_CODE=$?
        echo ""
        stop_api
        exit $TEST_EXIT_CODE
    fi
}

# Run main script
main "$@"
