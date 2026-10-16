# QR Studio — by Mr Christophe

Application statique de génération de QR codes, gratuite, sans compte, sans publicité ni suivi. React, TypeScript et Vite. Toutes les créations et tous les logos sont traités dans le navigateur, sans API QR ni redirection intermédiaire.

**Application publique : https://qr-studio-mr-christophe.pages.dev/**

**Dépôt du code : https://github.com/EthanPwn86/qr-studio-mr-christophe**

Publié le 16 octobre 2026 sur le projet Cloudflare Pages distinct `qr-studio-mr-christophe`, par chargement direct. HTTPS et sous-domaine fournis gratuitement. Aucun abonnement ni achat n'a été souscrit pour ce projet.

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

Le projet utilise exclusivement des fichiers statiques : aucun Worker, aucune base serveur, aucune fonction facturable, aucun domaine payant requis.

Après `npm run build` : dans le tableau de bord Cloudflare → Workers et Pages → Créer une application → Pages → chargement direct. Créer un projet distinct `qr-studio-mr-christophe`, puis charger **le contenu de `dist`** ou une archive ZIP contenant directement `index.html`. L'adresse gratuite `*.pages.dev` fournit HTTPS.

Autre possibilité, avec Wrangler connecté au compte :

```sh
npx wrangler login
npx wrangler pages project create qr-studio-mr-christophe --production-branch main
npm run deploy
```

Le fichier `public/_headers` configure la politique de sécurité, l'absence de cache sur le service worker et le cache long des fichiers dont le nom est versionné. Les ressources externes et les iframes sont interdites par la politique CSP. Aucun outil d'analyse de fréquentation n'est intégré.

Pour chaque mise à jour : reconstruire, charger le nouveau `dist` dans le **même projet Pages**, et vérifier le site. Le cache de la PWA change selon le contenu de la compilation. Fermer les anciens onglets de QR Studio puis rouvrir l'application pour activer la nouvelle version ; cette attente préserve la cohérence des ressources utilisées hors connexion.

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
