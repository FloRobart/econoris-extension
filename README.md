# Econoris – extension navigateur

Extension Chrome / Firefox (Manifest V3) pour ajouter une dépense ou un revenu dans [Econoris](https://econoris.fr) en quelques secondes, par exemple juste après un achat en ligne.

## Fonctionnement

### Connexion

L'authentification passe par [FlorAccess](https://github.com/FloRobart/FlorAccess_server), comme l'application Econoris :

1. `POST /users/login/request` avec l'email : FlorAccess envoie un code par email et renvoie un `token`.
2. `POST /users/login/confirm` avec `email`, `token` et le code (`secret`) : FlorAccess renvoie le JWT.

La demande en cours (email + `token`) est conservée dans `storage.session` : on peut fermer la popup pour aller lire ses emails, puis la rouvrir sur l'écran de saisie du code.

**Reprise de la session du site** : si vous êtes connecté sur `app.econoris.fr`, le content script `src/content/econoris-sync.ts` lit le JWT de l'application web (`localStorage["flutter.jwt"]`) et le transmet à l'extension. Ce n'est fait que si l'extension n'a pas déjà une session valide, et jamais avec une session antérieure à une déconnexion volontaire de l'extension.

### Stockage du JWT

| Donnée | Emplacement | Pourquoi |
| --- | --- | --- |
| JWT | `storage.local` de l'extension | Inaccessible aux pages web et aux autres extensions. Supprimé à l'expiration, sur une réponse 401 et à la déconnexion. |
| Connexion en cours | `storage.session` | En mémoire uniquement, effacée à la fermeture du navigateur, inaccessible aux content scripts. |
| Catégories | `storage.local` | Identiques pour tous les utilisateurs. Rechargées une fois par jour. |
| 5 dernières catégories choisies | `storage.local` | Suggérées en premier. Supprimées à la déconnexion. |

Les permissions sont limitées aux trois domaines Econoris / FlorAccess, et la CSP des pages de l'extension n'autorise les requêtes que vers les deux API.

Le bouton « Se déconnecter » déconnecte uniquement l'extension. `POST /users/logout` n'est pas appelé, car il déconnecte l'utilisateur de tous ses appareils.

### Ajout d'une opération

`POST /operations` sur l'API Econoris, avec le même format que l'application : `levy_date`, `label`, `amount` (négatif pour une dépense), `category_id`, `is_validate` (vrai si la date est aujourd'hui ou passée).

### Catégories

Les catégories viennent de `GET /categories` : un arbre de catégories principales et de sous-catégories, chacune avec ses mots-clés de recherche. Elles sont gardées en cache un jour dans `storage.local`, et ce cache sert encore si l'API ne répond pas.

Le champ « Catégorie » est un champ de recherche (motif ARIA *combobox*) : il liste les catégories correspondantes pendant la saisie, sans tenir compte des majuscules ni des accents, et trouve aussi une catégorie par ses mots-clés (« essence » → Carburant). Si rien ne correspond, il tolère les fautes de frappe avec une distance de Damerau-Levenshtein (« esence », « lyoer ») : aucune faute dans un mot de moins de 4 lettres, une jusqu'à 7 lettres, deux au-delà. Sans recherche, il propose les 5 dernières catégories choisies, puis toutes les catégories groupées par catégorie principale. Les flèches parcourent la liste, Entrée choisit, Échap ferme. Les règles de recherche sont les mêmes que dans l'application.

## Développement

Prérequis : Node.js ≥ 20.19 ou ≥ 22.12 (exigé par Vite 8).

```bash
npm install
npm run dev      # build en continu dans dist/
npm run build    # vérification TypeScript + build de production
```

Charger l'extension :

- **Chrome** : `chrome://extensions` → activer le *mode développeur* → *Charger l'extension non empaquetée* → choisir `dist/`.
- **Firefox** (≥ 140) : `about:debugging#/runtime/this-firefox` → *Charger un module complémentaire temporaire* → choisir `dist/manifest.json`.

## Publier une nouvelle version

1. Sur une branche, incrémentez la version. Le manifest est mis à jour automatiquement :
   ```bash
   npm version patch   # ou minor / major
   ```
2. Ouvrez une PR vers `main`. Le workflow `check-version-on-pr` vérifie la version (différente du dernier tag, identique dans `package.json` et `manifest.json`), compile et lance `web-ext lint`.
3. Après le merge, le workflow `release` :
   - compile et empaquette l'extension ;
   - crée la release GitHub `vX.Y.Z` avec `econoris-extension-X.Y.Z.zip` (l'extension) et `econoris-extension-X.Y.Z-source.zip` (les sources) ;
   - publie sur les stores si c'est activé (voir ci-dessous).

   Si le tag de la version existe déjà, le workflow ne fait rien.

### Publication automatique sur les stores (optionnelle)

Sur le Chrome Web Store, la **première** publication doit être faite à la main (fiche, captures d'écran, politique de confidentialité). Les mises à jour suivantes peuvent ensuite être automatisées. Sur addons.mozilla.org, la première soumission peut être automatique grâce à `amo-metadata.json`.

Les images des fiches des stores (captures d'écran et visuels promotionnels) sont dans `store-assets/`. Elles ne vont pas dans `public/` : tout ce dossier est copié dans `dist/`, donc dans l'extension installée chez chaque utilisateur.

Dans *Settings → Secrets and variables → Actions* du dépôt :

| Store | Variables | Secrets |
| --- | --- | --- |
| Chrome Web Store | `PUBLISH_CHROME=true`, `CWS_EXTENSION_ID`, `CWS_PUBLISHER_ID` | `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` ([guide](https://github.com/fregante/chrome-webstore-upload-keys)) |
| addons.mozilla.org | `PUBLISH_FIREFOX=true` | `AMO_API_KEY`, `AMO_API_SECRET` ([clés API AMO](https://addons.mozilla.org/developers/addon/api/key/)) |

Pour Firefox, la version est soumise sur le canal `listed` avec les sources, comme l'exige AMO pour du code minifié. `amo-metadata.json` n'est utilisé que pour la première soumission.
