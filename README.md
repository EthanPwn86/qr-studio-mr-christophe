# QR Studio — by Mr Christophe

Application de génération de QR codes, gratuite, sans compte ni publicité. React, TypeScript et Vite. Toutes les créations et tous les logos sont traités dans le navigateur, sans API QR ni redirection intermédiaire. La fréquentation et les actions sont mesurées par des statistiques agrégées ; aucun contenu de QR n'est transmis aux compteurs.

**Application publique : https://qrtof.pages.dev/**

**Dépôt du code : https://github.com/EthanPwn86/qr-studio-mr-christophe**

Publié le 16 octobre 2026 sur Cloudflare Pages, par chargement direct. L'adresse principale utilise le projet distinct `qrtof`. HTTPS et sous-domaine fournis gratuitement. Aucun abonnement ni achat n'a été souscrit pour ce projet.

L'adresse initiale https://qr-studio-mr-christophe.pages.dev/ reste disponible et son déploiement est conservé. Le design, les fonctionnalités, le logo officiel et la signature sont identiques sur les deux adresses. Les données locales et l'installation PWA appartiennent à chaque origine : l'historique existant reste accessible sur l'adresse initiale ; pour utiliser la nouvelle adresse en PWA, l'installer depuis https://qrtof.pages.dev/.

## Utilisation

1. Coller une URL complète en `https://` ou `http://`.
2. Choisir les couleurs, les modules et les coins. Ajouter son propre logo si souhaité.
3. Télécharger le PNG (768, 1 536 ou 3 072 px) ou le SVG vectoriel, qui inclut le logo.
4. Tester le fichier avec l'appareil photo d'un téléphone avant impression.

Les QR sont statiques : ils n'expirent pas du fait de cette application, mais la page de destination doit rester accessible. Modifier un QR dans l'historique ne modifie pas les fichiers précédemment distribués.

L'historique IndexedDB conserve les 50 dernières créations sur l'appareil. Chaque création active est mise à jour après une courte pause. « Nouveau QR » démarre une nouvelle création. Aucun compte n'est nécessaire. La suppression des données du navigateur efface aussi l'historique.

## Installation de la PWA

- **iPhone/iPad** : ouvrir le site HTTPS dans Safari → Partager → Sur l'écran d'accueil.
- **Android** : ouvrir dans Chrome → menu ⋮ → Installer l'application ou Ajouter à l'écran d'accueil.
- **PC/Mac** : Chrome ou Edge → icône Installer dans la barre d'adresse.

Attendre la mention « Prêt hors connexion » au premier chargement. Les ressources, y compris les deux lecteurs de vérification, sont mises en cache localement. La création, l'import d'images, les exports et l'historique restent utilisables hors connexion. Les liens de destination peuvent nécessiter Internet. Le système peut supprimer les caches si l'espace disque manque.

## Développement

Node.js **24 ou supérieur** et npm.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview -- --port 4173
npm test
```

Les tests utilisent Microsoft Edge installé (`channel: msedge`). Pour une autre machine, installer un navigateur Playwright ou adapter `playwright.config.ts`. Le serveur de prévisualisation doit être actif avant `npm test`. La PWA s'active sur la compilation de production, pas en mode développement.

## Publication gratuite sur Cloudflare Pages

La génération et l'export utilisent des fichiers statiques. Un endpoint Pages Function et une base D1 de l'offre **Workers Free à 0 $** conservent uniquement les compteurs d'usage. Aucun abonnement ni domaine payant requis. Ne pas passer à Workers Paid : à l'épuisement des quotas gratuits, les statistiques deviennent incomplètes mais la création et l'export restent disponibles sans limite de nombre.

Après `npm run build`, déployer avec Wrangler et le fichier `wrangler.jsonc`, qui conserve la liaison D1. Le téléversement manuel dans le tableau de bord ne prend pas en charge les Pages Functions. L'adresse gratuite `*.pages.dev` fournit HTTPS.

Autre possibilité, avec Wrangler connecté au compte :

```sh
npx wrangler login
npm run deploy
```

Le fichier `public/_headers` configure la politique de sécurité, l'absence de cache sur le service worker et le cache long des fichiers dont le nom est versionné. La CSP autorise uniquement les ressources locales et le script/collecteur Cloudflare Web Analytics. Les iframes restent interdites.

Pour chaque mise à jour : reconstruire, lancer `npm run deploy` dans le **même projet Pages**, et vérifier le site. Le cache de la PWA change selon le contenu de la compilation. Fermer les anciens onglets de QR Studio puis rouvrir l'application pour activer la nouvelle version ; cette attente préserve la cohérence des ressources utilisées hors connexion.

## Statistiques privées

- Fréquentation : https://dash.cloudflare.com/8c97000d3a8b667f9abd2f40c50ffa41/web-analytics/overview?siteTag~in=1b776b5fcff2453ea2ce4a277af2bde7
- Compteurs : https://dash.cloudflare.com/8c97000d3a8b667f9abd2f40c50ffa41/workers/d1/databases/f99cfb23-7cda-4a6e-b927-e39767ecf84b/studio — ouvrir la table `statistiques`. Seul le compte Cloudflare authentifié peut lire la base. Le guide simple est dans [STATISTIQUES.md](STATISTIQUES.md).
- Une ligne `TOTAL` et une ligne par jour UTC : `qr_generes`, `telechargements_png`, `telechargements_svg`, `telechargements_total`.
- Une création = un nouveau lien validé et stable pendant 1,2 seconde, ou exporté avant ce délai. Les changements de couleur/style et la réouverture depuis l'historique ne créent pas de nouveau comptage. Un retour à un autre lien peut compter une nouvelle création. Les téléchargements répétés sont comptés séparément.
- Le client envoie seulement `{ "event": "qr_generated" }`, `download_png` ou `download_svg`, sans cookie, référent, identifiant, URL, image ou contenu du QR. Le serveur rejette les propriétés supplémentaires et ne conserve que la date et les totaux.
- Les compteurs respectent DNT et Global Privacy Control, ne s'exécutent pas hors connexion et ne rattrapent pas ces actions ensuite. Aucun identifiant n'est stocké pour les statistiques. Leur blocage n'affecte pas le générateur.
- Ces mesures sont indicatives : bloqueurs, absence de réseau, anciennes versions en cache et quotas peuvent réduire les totaux ; les soumissions automatisées peuvent les gonfler. Elles ne comptent pas les scans ultérieurs des QR statiques.
- Création du schéma : `npx wrangler d1 execute qrtof-usage --remote --file analytics/schema.sql` (initialisation non destructive).
- Vérifications du collecteur : `npm run test:usage`. Les tests navigateur interceptent les événements pour ne pas fausser les statistiques publiques.

Documentation de gratuité : https://developers.cloudflare.com/pages/functions/pricing/ (les fichiers statiques bénéficient de requêtes gratuites et illimitées). Les limites d'infrastructure de l'hébergeur restent applicables ; la génération de QR ne contacte pas l'hébergeur.

## Fiabilité et limites

- Correction d'erreur **H**, marge silencieuse d'au moins quatre modules.
- Vérification de lecture par jsQR avec plusieurs échelles, puis ZXing en secours.
- Avertissement et export bloqué en cas de contraste insuffisant, de fond sombre ou d'échec de lecture automatique.
- URL normalisée par l'API URL du navigateur : les accents, emojis et domaines internationaux sont encodés correctement.
- 1 200 octets maximum pour le lien normalisé, limite technique compatible avec la correction élevée. Aucune limite du nombre de générations.
- Logos PNG, JPEG et WebP : signature du fichier vérifiée, 5 Mo maximum, moins de 25 mégapixels. Image redimensionnée à 512 px maximum pour le stockage ; original de l'utilisateur non téléversé.
- La vérification automatique ne remplace pas un scan sur le téléphone et le support final, surtout pour les liens longs, logos et impressions réduites.
- L'absence d'API caméra est volontaire : la vérification ne demande aucune permission et reste locale.

## Identité et licences

Le fichier `public/brand/mr-christophe.png` est une copie exacte du logo officiel fourni. Il apparaît uniquement dans le pied de page ; il n'est jamais ajouté automatiquement aux QR des visiteurs. Les icônes de la PWA appartiennent à l'identité distincte QR Studio.

Les licences des dépendances de production et leurs textes figurent dans `public/THIRD-PARTY-NOTICES.txt`, également servi publiquement. Bibliothèques principales :

| Bibliothèque | Licence | Rôle |
| --- | --- | --- |
| React, React DOM | MIT | Interface |
| QR Code Styling | MIT | QR personnalisés et exports |
| qrcode-generator | MIT | Mesure de la matrice et marge de lecture |
| jsQR | Apache-2.0 | Vérification locale |
| ZXing JS | Apache-2.0 | Vérification de secours |
| Lucide React | ISC | Icônes d'interface |

Les droits sur le logo Mr Christophe restent ceux de son titulaire.
