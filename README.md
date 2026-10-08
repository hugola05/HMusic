# HMusic V9 — File d’attente musicale

Nouvelle version construite sur HMusic V8. Compatible avec une publication statique GitHub Pages.

## Nouveautés

- **Glisser vers la droite** sur une chanson dans « Tout » ou « Favoris » : ajoute le morceau dans la **file d’attente**.
- Ouvre l’onglet **☷ File d’attente** pour voir l’ordre des morceaux à suivre, retirer un titre ou vider la liste.
- Le bouton **Suivant** et la fin automatique d’une chanson consomment **d’abord la file d’attente**, puis reprennent l’ordre habituel (ou la lecture aléatoire si activée).
- La file est sauvegardée **localement** sur cet appareil, sans compte.
- Le sous-titre « Artiste inconnu » est masqué, y compris pour les MP3 déjà importés.
- La réorganisation verticale reste possible via la poignée **☰** après appui long dans « Tout ».
- Le bouton externe noTube, les favoris et la surbrillance du morceau actif sont conservés.

## Publication GitHub Pages

1. Décompresser le ZIP.
2. Remplacer **index.html**, **style.css**, **app.js**, **sw.js**, **manifest.json** et **README.md** à la racine du dépôt.
3. Valider **Commit changes**.
4. Attendre le déploiement GitHub Pages et recharger HMusic (fermer/rouvrir l’app sur iPhone).

**Important :** les MP3 sont stockés localement dans IndexedDB. N’efface pas les données du site dans Safari ou dans ton navigateur : cela pourrait supprimer ta bibliothèque. La file d’attente est propre à chaque appareil.

## Gestes

- Balayage à droite sur le titre / la vignette : ajouter à la file.
- Maintenir la poignée ☰ puis monter / descendre : modifier l’ordre de la bibliothèque.
- Toucher le titre : lire la musique.

**Nota :** Safari peut limiter certaines fonctions de lecture en arrière-plan. Les MP3 ne sont pas envoyés sur GitHub.
