# HMusic

PWA de lecteur musical local.

## Utilisation
1. Héberger ce dossier sur un site HTTPS (GitHub Pages, Cloudflare Pages, Netlify, etc.).
2. Ouvrir le site avec Safari sur l'iPhone.
3. Ajouter des fichiers audio depuis Fichiers.
4. Ajouter HMusic à l'écran d'accueil via le menu de partage de Safari.

Les fichiers audio sont stockés dans IndexedDB sur l'appareil. Aucun serveur n'est utilisé pour les fichiers musicaux.

## Important
Une PWA iOS n'a pas les mêmes capacités qu'une app native. La lecture écran verrouillé/arrière-plan et les commandes multimédia dépendent des capacités de Safari/iOS. La Media Session API est incluse.
