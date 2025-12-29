# Scroll Infini pour les Tags

## Vue d'ensemble

Implémentation du scroll infini pour la liste des tags, suivant le même pattern que celui utilisé pour les URLs.

## Modifications Backend

### Tag Controller (`/back/src/controllers/tag_controller.py`)

- ✅ Déjà configuré avec pagination
- Endpoint GET `/tags/` retourne déjà `PaginatedTagResponse`
- Paramètres : `skip` (défaut: 0), `limit` (défaut: 50, max: 100)

### Tag Repository (`/back/src/repositories/tag_repository.py`)

- ✅ Méthode `count_by_user()` déjà implémentée
- ✅ Méthode `get_all_by_user()` avec support de pagination

## Modifications Frontend

### AppLayout (`/front/src/components/layouts/AppLayout.tsx`)

**Changements majeurs :**

1. Import du hook `useInfiniteScroll` et `useCallback`
2. Remplacement du state `tags` par le hook `useInfiniteScroll`
3. Fonction `fetchTags` avec pagination :
   ```typescript
   const fetchTags = useCallback(
     async (skip: number, limit: number) => {
       const response = await fetchApi(`/tags/?skip=${skip}&limit=${limit}`, { method: "GET" });
       return {
         items: response.items.map(...),
         total: response.total,
         has_more: response.has_more,
       };
     },
     [fetchApi]
   );
   ```
4. Utilisation du hook :
   ```typescript
   const {
     items: tags,
     loading: tagsLoading,
     hasMore: hasMoreTags,
     total: totalTags,
     reload: reloadTags,
     setItems: setTags,
     scrollContainerRef: tagsScrollContainerRef,
   } = useInfiniteScroll<Tag>({
     fetchData: fetchTags,
     limit: 50,
     enabled: true,
     threshold: 1000,
   });
   ```
5. Mise à jour du contexte avec les nouvelles props

### Context (`/front/src/hooks/useAppLayout.ts`)

**Nouvelles propriétés ajoutées :**

- `tagsLoading: boolean` - Indicateur de chargement
- `hasMoreTags: boolean` - Y a-t-il plus de tags à charger
- `totalTags: number` - Nombre total de tags
- `tagsScrollContainerRef: React.RefObject<HTMLDivElement>` - Référence au conteneur de scroll

### Sidebar (`/front/src/components/Sidebar.tsx`)

**Changements :**

1. Nouvelles props optionnelles :

   - `tagsLoading?: boolean`
   - `totalTags?: number`
   - `tagsScrollContainerRef?: React.RefObject<HTMLDivElement>`

2. Import de l'icône `Loader2` pour l'indicateur de chargement

3. Application de la ref au conteneur de scroll :

   ```tsx
   <div ref={tagsScrollContainerRef} className="flex-1 overflow-auto p-2 sm:p-3 custom-scrollbar scrollbar-hide">
   ```

4. Affichage du nombre total de tags :

   ```tsx
   <p className="text-xs text-muted-foreground px-1">
     {totalTags || tags.length} tag{(totalTags || tags.length) !== 1 ? "s" : ""}
   </p>
   ```

5. Indicateur de chargement :
   ```tsx
   {
     tagsLoading && !tagSearchTerm && (
       <div className="flex items-center justify-center py-2">
         <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
       </div>
     );
   }
   ```

### LinksView (`/front/src/components/LinksView.tsx`)

**Changements :**

- Nouvelles props ajoutées à l'interface :
  - `tagsLoading?: boolean`
  - `totalTags?: number`
  - `tagsScrollContainerRef?: React.RefObject<HTMLDivElement>`
- Transmission des props au composant `Sidebar`

### DashboardPage (`/front/src/pages/DashboardPage.tsx`)

**Changements :**

- Destructuration des nouvelles props du contexte :
  ```typescript
  const { tags, selectedTags, currentView, showUntagged, reloadTags, tagsLoading, hasMoreTags, totalTags, tagsScrollContainerRef } = useAppLayout();
  ```
- Transmission des props à `LinksView`

## Fonctionnalités

### Chargement Automatique

- **Threshold** : 1000px avant la fin de la liste
- **Limite** : 50 tags par requête
- Chargement automatique quand l'utilisateur scrolle près de la fin

### Indicateurs Visuels

- ✅ Spinner de chargement (`Loader2`) pendant le fetch
- ✅ Compteur total de tags toujours visible
- ✅ Scrollbar cachée mais fonctionnelle (classe `scrollbar-hide`)

### Comportement

- Même UX que pour les liens
- Pas de bouton "Load More" - chargement automatique
- Indicateur de chargement seulement quand pas de recherche active
- Réinitialisation possible via `reloadTags()`

## Configuration

```typescript
// AppLayout.tsx
useInfiniteScroll<Tag>({
  fetchData: fetchTags,
  limit: 50, // Tags par page
  enabled: true,
  threshold: 1000, // Pixels avant la fin pour déclencher le chargement
});
```

## Tests à effectuer

1. ✅ Créer plus de 50 tags pour tester le scroll infini
2. ✅ Vérifier que le chargement se déclenche automatiquement
3. ✅ Vérifier l'indicateur de chargement
4. ✅ Vérifier le compteur total de tags
5. ✅ Vérifier que la recherche fonctionne toujours
6. ✅ Vérifier la version mobile et desktop

## Notes

- La scrollbar est cachée avec la classe CSS `scrollbar-hide` (comme pour les liens)
- Le scroll fonctionne toujours même si la barre n'est pas visible
- La recherche locale désactive temporairement le scroll infini (affiche seulement les résultats filtrés)
- Compatible avec toutes les autres fonctionnalités (merge, création, édition, suppression)
