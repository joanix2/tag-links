✅ quand je click sur tag-link revnir à la page d'acceuil

✅ créer une popup
✅ je veux pouvoir créer des tags (créer un lien avec le user dans la base)
✅ afficher la liste des tags liée au user
✅ les supprimer
✅ les modifier
✅ recherche de tag par leur nom en utilisant la distance de levenstein (créer un service pour levenshtein)

# Mercredi

✅ je veux pouvoir créer les liens
✅ les supprimer
✅ les modifier

✅ Rajoute un filtre pour afficher les liens en fonction des tags selectionné (fonction ou entre les liens, sort en fonction du nombre de match)

✅ recherche de liens par leur nom en utilisant la distance de levenshtein

# Deploiment

✅ changer le logo de l'app
✅ créer le dockerfile, docker compose, docker ingnore

# Vendredi

✅ visualisation sous la forme d'un graphe
✅ tris par date
✅ récupérer les liens sans tags (bouton "Untagged Links" dans la sidebar)
✅ quand je clique sur le tag d'un lien, je veux le séléctionner
✅ merge de tags (quand je merge les arrêtes avec entre les liens et les tags source ne pas reproduits avec le tags cible)
✅ upload from csv (améliorer le style)
✅ style

# TODO

✅ Import des descriptions
✅ ajout des favoris
✅ ajout du partage
✅ API (tokens + documentation)
✅ type de document (csv type du document, règle ontologique disjointe)

✅ merge l'hors de l'import
✅ import du type via csv
✅ meilleurs erreurs lors de l'import du csv

✅ suppression de masse (dans le profile) : dans la page profile de l'utilisateur, peut tu rajouter un bouton pour qu'il supprime toute ses données personnels ?

Augmenter la limite des liens : pour la récupération des tags et des url, la limite est fixé à 10000 mais ce n'est pas une bonne pratique, il faut plutot mettre en place un scoll infinit avec un traitement par batch. ainsi plus de logique doit être déplacé coté serveur
-> est ce que le scroll inifinit se fait dans les deux sens, on décharge les premiers éléments une fois arrivé à la fin ?
-> supprimer les bar
-> recherche par tags
-> recherche via la bar de recherche
-> liste des tags associé aux urls reste complète

✅ corriger la suppression des token api + lien avec le user

fix merge : lors du merge de deux tags et de la création d'un nouveau tag, des données sont perdu, seul un des tags et remplacer

lors de la d'urls par tags, il faut rajouter si on utilise un opérateur ET ou OU recherche ET / OU (pour moi c'est un OU avec un tris par distance mais certains utilisateurs préfère le ET)

ajoute un mode non éditable pour les tags

bouton de recherche favoris et et partage et type

export csv

Logo arbre
Photo de profile
espace entre les tags
choix d'un theme de couleur dans le profile

géréer le proxy (NPM)
créer une CD
responsive
reset password
téléchargement des données en csv
chargement de tous les tags dans le front (bof bof)
