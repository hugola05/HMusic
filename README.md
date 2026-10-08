# HMusic V7 — cliquer le titre pour lire + surbrillance + glisser-déposer

Cette version reprend **HMusic V4** (importation MP3 PC/iPhone, stockage local, favoris, lecture) et conserve le **tri manuel persistant** des musiques. La musique sélectionnée est maintenant **surlignée en vert** dans la bibliothèque, avec un mini-égaliseur animé lorsqu’elle joue et « EN PAUSE » si elle est arrêtée temporairement. La surbrillance suit les boutons précédent/suivant et le changement automatique de piste.

## Lire une musique depuis son titre

Cliquez ou touchez le **titre (ou le nom de l’artiste)** d’un morceau pour le lancer immédiatement. Si le morceau est déjà en pause, le même geste reprend la lecture. Accessible aussi au clavier avec Entrée ou Espace.

## Déplacer une musique

1. Ouvrez l’onglet **Tout** et effacez la recherche si nécessaire.
2. À droite du morceau, **maintenez la poignée ☰ appuyée** environ un quart de seconde.
3. Sans relâcher, **glissez le morceau au-dessus ou au-dessous d’un autre**.
4. Relâchez : le nouvel ordre est enregistré sur cet appareil, y compris après fermeture de HMusic.

La poignée fonctionne avec la souris sur PC et avec le doigt sur iPhone. Pour éviter des surprises, le déplacement est désactivé pendant une recherche et sur l’onglet Favoris.

## Mettre à jour GitHub Pages

1. Décompressez le ZIP.
2. Remplacez les 6 fichiers à la **racine du dépôt** GitHub : `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.json`, `README.md`.
3. Cliquez sur **Commit changes**, puis attendez la mise à jour de GitHub Pages.
4. Rechargez le site ou fermez et rouvrez l’application installée sur iPhone.

Ne supprimez pas les données du site : elles contiennent vos musiques. Vos MP3 ne sont jamais envoyés sur GitHub. L’ordre sur PC et celui sur iPhone sont enregistrés séparément.
