# TagLink API Backend

API FastAPI avec base de données Neo4j pour gérer des utilisateurs, tags, URLs et fichiers avec différents types de relations.

## 🎯 Architecture

Le système utilise **4 types de nœuds** dans Neo4j :

1. **User** : Propriétaire de ressources
2. **Tag** : Étiquettes pour catégoriser
3. **URL** : Liens web
4. **File** : Fichiers

### Relations

```
(User)-[:OWNS]->(URL)
(User)-[:OWNS]->(File)
(URL)-[:HAS_TAG]->(Tag)
(File)-[:HAS_TAG]->(Tag)
(Tag)-[:PARENT_OF]->(Tag)
(Tag)-[:COMPOSED_OF]->(Tag)
(Tag)-[:RELATED_TO]->(Tag)
```

## 📁 Structure du Projet

```
back/
├── src/
│   ├── database.py            # Connexion Neo4j
│   ├── models/                # Modèles Pydantic
│   │   ├── tag.py            # Tag model
│   │   ├── user.py           # User model
│   │   ├── url.py            # URL model
│   │   └── file.py           # File model
│   ├── repositories/          # Couche d'accès aux données
│   │   ├── tag_repository.py
│   │   ├── user_repository.py
│   │   ├── url_repository.py
│   │   └── file_repository.py
│   └── controllers/           # Routes FastAPI
│       ├── tag_controller.py
│       ├── user_controller.py
│       ├── url_controller.py
│       └── file_controller.py
├── tests/                     # Tests unitaires
├── main.py                    # Point d'entrée
├── demo.py                    # Script de démonstration
├── run_tests.sh              # Script de test
├── requirements.txt           # Dépendances
├── requirements-dev.txt       # Dépendances dev
├── .env                       # Variables d'environnement
└── README.md
```

## 📊 Modèle de Données

### 👤 User (Utilisateur)

**Propriétés:**

- `id` : UUID unique
- `username` : Nom d'utilisateur (unique)
- `email` : Email
- `full_name` : Nom complet
- `is_active` : État du compte
- `created_at`, `updated_at` : Dates

**Relations sortantes:**

- `(User)-[:OWNS]->(URL)` : Possède des URLs
- `(User)-[:OWNS]->(File)` : Possède des fichiers

### 🔗 URL

**Propriétés:**

- `id` : UUID unique
- `url` : URL complète
- `title` : Titre
- `description` : Description
- `user_id` : ID du propriétaire
- `created_at`, `updated_at` : Dates

**Relations sortantes:**

- `(URL)-[:HAS_TAG]->(Tag)` : A des tags

### 📄 File (Fichier)

**Propriétés:**

- `id` : UUID unique
- `filename` : Nom du fichier
- `file_path` : Chemin complet
- `file_type` : Type MIME
- `file_size` : Taille en bytes
- `description` : Description
- `user_id` : ID du propriétaire
- `created_at`, `updated_at` : Dates

**Relations sortantes:**

- `(File)-[:HAS_TAG]->(Tag)` : A des tags

### 📌 Tag

**Propriétés:**

- `id` : UUID unique
- `name` : Nom du tag
- `description` : Description
- `color` : Couleur hex
- `created_at`, `updated_at` : Dates

**Relations sortantes (entre tags):**

- `(Tag)-[:PARENT_OF]->(Tag)` : Hiérarchie parent-enfant
- `(Tag)-[:COMPOSED_OF]->(Tag)` : Composition (tout/partie)
- `(Tag)-[:RELATED_TO]->(Tag)` : Association libre

## Installation

### Prérequis

- Python 3.8+
- Neo4j 4.0+ (installé localement ou via Docker)

### Configuration Neo4j avec Docker

```bash
docker run \
    --name neo4j \
    -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/password \
    -e NEO4J_PLUGINS='["apoc"]' \
    neo4j:latest
```

Accédez à Neo4j Browser: http://localhost:7474

### Installation du projet

1. Créer un environnement virtuel:

```bash
cd back
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
```

2. Installer les dépendances:

```bash
pip install -r requirements.txt
```

3. Configurer les variables d'environnement:

```bash
cp .env.example .env
# Éditer .env avec vos paramètres Neo4j
```

## Lancement

```bash
# Mode développement avec rechargement automatique
python main.py

# Ou avec uvicorn directement
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

L'API sera accessible sur: http://localhost:8000

Documentation interactive: http://localhost:8000/docs

## Endpoints API

### Tags

- `POST /tags/` - Créer un tag
- `GET /tags/` - Liste tous les tags (avec pagination)
- `GET /tags/{tag_id}` - Obtenir un tag par ID
- `GET /tags/{tag_id}/relations` - Obtenir un tag avec toutes ses relations
- `PUT /tags/{tag_id}` - Mettre à jour un tag
- `DELETE /tags/{tag_id}` - Supprimer un tag

### Relations entre Tags

- `POST /tags/{parent_id}/parent-of/{child_id}` - Créer relation PARENT_OF
- `POST /tags/{whole_id}/composed-of/{part_id}` - Créer relation COMPOSED_OF
- `POST /tags/{tag1_id}/related-to/{tag2_id}` - Créer relation RELATED_TO
- `DELETE /tags/{from_id}/{relation_type}/{to_id}` - Supprimer une relation

### Tags et URLs

- `POST /tags/{tag_id}/link-url/{url_id}` - Lier un tag à une URL
- `DELETE /tags/{tag_id}/unlink-url/{url_id}` - Délier un tag d'une URL

### URLs

- `POST /urls/` - Créer une URL
- `GET /urls/` - Liste toutes les URLs (avec pagination)
- `GET /urls/{url_id}` - Obtenir une URL par ID
- `GET /urls/{url_id}/tags` - Obtenir une URL avec tous ses tags
- `PUT /urls/{url_id}` - Mettre à jour une URL
- `DELETE /urls/{url_id}` - Supprimer une URL
- `GET /urls/by-tag/{tag_id}` - Obtenir toutes les URLs d'un tag

### Santé

- `GET /health` - Vérifier l'état de l'API et de la connexion Neo4j

## Exemples d'utilisation

### Créer un tag

```bash
curl -X POST "http://localhost:8000/tags/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python",
    "description": "Langage de programmation",
    "color": "#3776ab"
  }'
```

### Créer un tag avec URL

```bash
curl -X POST "http://localhost:8000/tags/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Official",
    "url": "https://python.org",
    "url_title": "Python.org",
    "description": "Site officiel de Python",
    "color": "#3776ab"
  }'
```

### Créer une relation PARENT_OF

```bash
curl -X POST "http://localhost:8000/tags/{parent_id}/parent-of/{child_id}"
```

## 🧪 Tests

Le projet inclut une suite complète de tests pytest.

### Exécuter les tests avec le script bash

```bash
# Lancer l'API et exécuter tous les tests
./run_tests.sh

# Lancer uniquement l'API (mode développement)
./run_tests.sh --api-only

# Lancer uniquement les tests (API doit être déjà lancée)
./run_tests.sh --tests-only
```

### Exécuter les tests avec pytest directement

```bash
# Installer les dépendances de test
pip install -r requirements-dev.txt

# Lancer tous les tests
pytest

# Avec verbosité
pytest -v

# Un fichier spécifique
pytest tests/test_tags.py

# Une classe de test spécifique
pytest tests/test_tags.py::TestTagCRUD

# Avec couverture de code
pytest --cov=src --cov-report=html
```

### Types de tests

- **Tests unitaires** (`test_models.py`) - Validation des modèles Pydantic
- **Tests d'intégration** (`test_repository.py`) - Tests de la couche d'accès aux données
- **Tests d'API** (`test_main.py`, `test_tags.py`) - Tests des endpoints HTTP

Voir `tests/README.md` pour plus de détails.

## Architecture MVC

- **Models** (`src/models/`): Définitions des schémas Pydantic pour la validation des données
- **Repositories** (`src/repositories/`): Couche d'accès aux données, gère les requêtes Cypher vers Neo4j
- **Controllers** (`src/controllers/`): Routes FastAPI, validation des requêtes et orchestration

## Technologies Utilisées

- **FastAPI**: Framework web moderne et rapide
- **Neo4j**: Base de données orientée graphe
- **Pydantic**: Validation des données
- **Uvicorn**: Serveur ASGI
