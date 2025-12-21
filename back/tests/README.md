# Tests

Ce dossier contient tous les tests pour l'API TagLink.

## Structure

```
tests/
├── __init__.py
├── conftest.py           # Configuration pytest et fixtures
├── test_main.py          # Tests des endpoints principaux
├── test_tags.py          # Tests CRUD et relations des tags
├── test_models.py        # Tests des modèles Pydantic
└── test_repository.py    # Tests de la couche repository
```

## Exécution des tests

### Avec le script bash (recommandé)

```bash
# Lancer l'API et exécuter tous les tests
./run_tests.sh

# Lancer uniquement l'API (sans tests)
./run_tests.sh --api-only

# Lancer uniquement les tests (API doit être déjà lancée)
./run_tests.sh --tests-only
```

### Avec pytest directement

```bash
# Installer les dépendances de test
pip install -r requirements-dev.txt

# Lancer tous les tests
pytest

# Lancer avec verbosité
pytest -v

# Lancer un fichier de test spécifique
pytest tests/test_tags.py

# Lancer une classe de test spécifique
pytest tests/test_tags.py::TestTagCRUD

# Lancer un test spécifique
pytest tests/test_tags.py::TestTagCRUD::test_create_tag

# Lancer avec couverture de code
pytest --cov=src --cov-report=html
```

## Prérequis

- Neo4j doit être en cours d'exécution sur `localhost:7687`
- Les variables d'environnement doivent être configurées dans `.env`

### Lancer Neo4j avec Docker

```bash
docker run --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest
```

## Types de tests

### Tests unitaires (`test_models.py`)

- Validation des modèles Pydantic
- Pas de connexion à la base de données

### Tests d'intégration (`test_repository.py`)

- Tests de la couche repository
- Interaction directe avec Neo4j
- Base de données nettoyée avant/après chaque test

### Tests d'API (`test_main.py`, `test_tags.py`)

- Tests des endpoints HTTP
- Utilise TestClient de FastAPI
- Base de données nettoyée avant/après chaque test

## Fixtures

Les fixtures sont définies dans `conftest.py` :

- `test_db`: Connexion à la base de données de test
- `client`: Client de test FastAPI
- `clean_db`: Nettoie la base de données avant chaque test

## Couverture de code

Pour générer un rapport de couverture :

```bash
pytest --cov=src --cov-report=html
open htmlcov/index.html
```

## CI/CD

Ces tests peuvent être intégrés dans un pipeline CI/CD avec GitHub Actions, GitLab CI, etc.
