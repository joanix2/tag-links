# 🏷️ Tag Link

Application web de gestion de liens avec système de tags et visualisation en graphe.

![Tag Link Logo](front/public/taglink_logo.svg)

## 🌟 Fonctionnalités

- 📌 Gestion de liens avec tags
- 🔍 Recherche avancée avec algorithme de Levenshtein
- 📊 Visualisation graphique des relations tags-liens
- 📤 Import/Export CSV avec dates personnalisées
- 🎨 Interface moderne et responsive
- 🔐 Authentification sécurisée
- 🌓 Mode sombre/clair (à venir)

## 🚀 Déploiement

### Déploiement automatique avec GitHub Actions

Le projet inclut un workflow GitHub Actions pour déployer automatiquement sur un VPS Hostinger.

📖 **[Guide de déploiement complet](.github/DEPLOYMENT.md)**

📖 **[Guide rapide Hostinger](QUICK_START_HOSTINGER.md)**

#### Configuration rapide

1. **Configurez les secrets GitHub** :

   - `VPS_HOST` : IP de votre VPS
   - `VPS_USERNAME` : Utilisateur SSH
   - `VPS_SSH_KEY` : Clé privée SSH
   - `VPS_PROJECT_PATH` : Chemin du projet sur le VPS

2. **Préparez votre VPS** :

   ```bash
   # Copiez le script sur votre VPS
   scp vps-setup.sh user@vps-ip:~/

   # Connectez-vous et exécutez
   ssh user@vps-ip
   sudo ./vps-setup.sh
   ```

3. **Déployez** :

   ```bash
   # Automatique : push sur main
   git push origin main

   # Manuel : utilisez le script
   source .env.vps && ./deploy-vps.sh
   ```

## 💻 Développement Local

### Prérequis

- Python 3.11+
- Node.js 20+
- Neo4j 5.15+

### Backend

```bash
cd back

# Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Lancer Neo4j avec Docker
docker-compose -f docker-compose.neo4j.yml up -d

# Lancer le serveur
uvicorn main:app --reload
```

Le backend sera accessible sur `http://localhost:8000`
Documentation API : `http://localhost:8000/docs`

### Frontend

```bash
cd front

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## 📚 Documentation

- [Guide de déploiement](.github/DEPLOYMENT.md)
- [Guide rapide Hostinger](QUICK_START_HOSTINGER.md)
- [Backend README](back/README.md)
- [Frontend README](front/README.md)

## 🏗️ Architecture

### Backend

- **FastAPI** : Framework web Python moderne
- **Neo4j** : Base de données graphe
- **Pydantic** : Validation des données
- **JWT** : Authentification

### Frontend

- **React 18** : Framework UI
- **TypeScript** : Typage statique
- **Vite** : Build tool
- **Tailwind CSS** : Framework CSS
- **shadcn/ui** : Composants UI
- **D3.js** : Visualisation graphique

## 📦 Structure du Projet

```
tag-link/
├── back/                   # Backend FastAPI
│   ├── src/
│   │   ├── controllers/   # Routes API
│   │   ├── models/        # Modèles Pydantic
│   │   ├── repositories/  # Accès données Neo4j
│   │   └── services/      # Logique métier
│   ├── tests/             # Tests unitaires
│   └── main.py           # Point d'entrée
├── front/                 # Frontend React
│   ├── src/
│   │   ├── components/   # Composants React
│   │   ├── pages/        # Pages
│   │   ├── hooks/        # Hooks personnalisés
│   │   └── lib/          # Utilitaires
│   └── public/           # Assets statiques
└── .github/              # CI/CD
    └── workflows/        # GitHub Actions
```

## 🧪 Tests

### Backend

```bash
cd back
pytest
# ou
./run_tests.sh
```

### Frontend

```bash
cd front
npm test
```

## 📄 Licence

MIT

## 👥 Auteurs

- Votre Nom

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📞 Support

Pour toute question ou problème :

- 📧 Email : votre-email@example.com
- 🐛 Issues : [GitHub Issues](https://github.com/votre-username/tag-link/issues)

## 🎯 Roadmap

- [ ] Mode sombre/clair
- [x] Import/Export CSV avec dates
- [ ] Partage de collections de liens
- [ ] Extension navigateur
- [ ] Application mobile
- [ ] API publique
- [x] Déploiement automatisé

---

Made with ❤️ using FastAPI, React, and Neo4j
