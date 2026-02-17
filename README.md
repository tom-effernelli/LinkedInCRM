# LinkedIn Profile Notes

Extension navigateur (Manifest V3) qui ajoute un bloc **“Private notes”** sur les pages de profil LinkedIn et synchronise les notes via le stockage du navigateur.

## Fonctionnalités

- Ajout d’une carte “Private notes” sur les profils (`/in/...`)
- Sauvegarde et synchronisation des notes via `storage.sync`
- Boutons **Save** / **Clear**

## Installation (mode développeur)

### Chromium (Chrome, Edge, Brave…)

1. Ouvrir `chrome://extensions`
2. Activer **Mode développeur**
3. **Charger l’extension non empaquetée**
4. Sélectionner le dossier `LinkedInCRM/`

### Firefox

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. **Charger un module temporaire**
3. Sélectionner `LinkedInCRM/manifest.json`

## Permissions

- `storage` : enregistrer/synchroniser les notes
- `*://*.linkedin.com/*` : injecter l’UI sur les pages LinkedIn

## Développement

- Code principal : `LinkedInCRM/content.js`
- Manifest : `LinkedInCRM/manifest.json`

## Licence

Distribué sous licence **GNU GPLv3** (voir le fichier `LICENSE`).

