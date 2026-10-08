# HMusic V4 — import corrigé

Cette version corrige les fichiers MP3 grisés sur iPhone, le blocage de l'importation PC/iPhone et le cache des anciennes versions.

## Mettre à jour GitHub Pages

1. Décompressez cette archive.
2. Dans votre dépôt GitHub, à la racine, remplacez `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.json`, `README.md` par les fichiers fournis. Ne mettez **pas** le dossier parent dans le dépôt.
3. Validez avec « Commit changes ».
4. Quand GitHub Pages a publié la mise à jour, ouvrez le site dans Safari ou Chrome, puis rechargez deux fois. Si l'application est installée sur l'écran d'accueil, fermez-la complètement et rouvrez-la.
5. Touchez `+` et importez un MP3. Un message "✓ 1 morceau ajouté !" apparaît et le morceau est immédiatement listé.

IMPORTANT : ne supprimez pas les données du site pour forcer la mise à jour : cela risque d'effacer les musiques enregistrées localement.

Les MP3 sont enregistrés directement dans le stockage IndexedDB de l'appareil, sans transfert vers GitHub. Ils ne se synchronisent pas entre PC et iPhone.

L'importation est réservée aux fichiers audio locaux, par exemple MP3, M4A, WAV, FLAC et OGG. L'écoute hors connexion dépend du cache local; les commandes sur écran verrouillé dépendent de Safari/iOS.
