# Mise en ligne sur GitHub Pages

Pas besoin de git ni de ligne de commande pour la première mise en ligne — tout se fait depuis le navigateur.

## 1. Créer le dépôt

1. Va sur [github.com/new](https://github.com/new)
2. Nom du dépôt : par exemple `brankes` (peu importe, ça n'apparaît pas forcément dans l'URL finale)
3. Coche **Public**
4. Ne coche PAS "Add a README" (on a déjà le nôtre)
5. Clique **Create repository**

## 2. Envoyer les fichiers

1. Sur la page du dépôt fraîchement créé, clique **uploading an existing file** (ou **Add file → Upload files**)
2. Glisse-dépose tout le contenu de ce dossier : `index.html`, `vintagestory.html`, `style.css`, `script.js`, ce `README.md`, et le dossier `images/` (avec sa photo dedans si tu en as une)
3. En bas, clique **Commit changes**

## 3. Activer GitHub Pages

1. Dans le dépôt, va dans **Settings** (en haut) → **Pages** (menu de gauche)
2. Sous "Build and deployment" → "Source", choisis **Deploy from a branch**
3. Branch : **main**, dossier : **/ (root)** → **Save**
4. Attends 1-2 minutes, rafraîchis la page : l'URL de ton site apparaît en haut (du genre `https://tonpseudo.github.io/brankes/`)

## Pour la suite (mise à jour)

Pour modifier un fichier plus tard sans tout re-uploader : ouvre le fichier dans GitHub, clique l'icône crayon (✏️) en haut à droite, modifie, puis **Commit changes**. Le site se met à jour automatiquement en une minute ou deux.

Une fois que tu as git sur une machine, `git clone` / `git push` fait la même chose en plus rapide, mais ce n'est pas nécessaire pour commencer.

## Quand l'ESP32 sera prêt

Ouvre `script.js`, remplace :

```js
esp32Url: null,
```

par l'adresse réelle, par exemple :

```js
esp32Url: "http://brankes.duckdns.org:8080",
```

**Important** : le sketch de l'ESP32 devra répondre avec un header `Access-Control-Allow-Origin: *` sur ses routes `/wake` et `/status`, sinon le navigateur bloquera la requête (règle CORS, le site étant sur un domaine `github.io` différent de celui de l'ESP32). On ajoutera ça au sketch le moment venu.
