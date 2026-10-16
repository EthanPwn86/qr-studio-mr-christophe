# Vérifications de QR Studio

Version 1.0.0 — 16 octobre 2026.

## Tests automatisés réellement exécutés

Compilation de production TypeScript + Vite réussie. Suite Playwright exécutée dans Microsoft Edge installé, sans interface : **8 scénarios réussis, 0 échec en local (39,0 s)**, puis **8 scénarios réussis, 0 échec sur l'adresse publique HTTPS (39,7 s)** après correction des problèmes constatés.

Application vérifiée : **https://qr-studio-mr-christophe.pages.dev/**. Le document HTTPS répond HTTP 200 et fournit la politique CSP attendue. Les tests locaux appliquent aussi cette politique à la première page afin de reproduire les restrictions de l'hébergement.

| Scénario | Vérification |
| --- | --- |
| Génération et PNG | Un vrai fichier QR décodé, URL exacte, tailles 768, 1 536 et 3 072 px, bordure silencieuse conservée. |
| Liens complexes | HTTP, HTTPS, accents, emoji, domaine international et URL de 1 069 caractères. Lecture des exports vérifiée. |
| Personnalisation | Les 12 combinaisons des quatre styles de modules et des trois coins passent la vérification de lecture. |
| Images et SVG | Import PNG/JPEG/WebP ; taille du logo réglable ; couleurs et logo intégrés aux exports PNG/SVG ; retrait et restauration des paramètres. Les deux formats exportés sont décodés. |
| Erreurs | Protocoles refusés, liens incomplets, espaces, identifiants intégrés, lien trop long, faux PNG, SVG refusé, image >5 Mo, couleurs sans contraste et fond sombre. |
| Historique | Persistance après rechargement, logo conservé, reprise et modification, téléchargement d'un ancien QR, suppression individuelle et complète, vérification après rechargement. |
| Responsive | Largeurs 390 et 320 px sans débordement horizontal ; captures ; bouton d'installation accessible et aide ; fermeture des dialogues. |
| PWA et confidentialité | Manifest sans erreur et icônes accessibles ; service worker installé ; rechargement en réseau coupé fourni par le service worker ; création, import de logo et exports PNG/SVG décodés hors connexion ; aucune requête vers une origine externe pendant ces opérations. |

Tous les scénarios vérifient aussi l'absence d'erreur JavaScript bloquante ou de message d'erreur dans la console.

Les captures et fichiers exportés sont dans `artifacts/`. Les résultats structurés de la dernière exécution sont dans `artifacts/test-results.json`.

## Autres contrôles

- `npm audit` après installation : zéro vulnérabilité connue signalée ; contrôle des dépendances de production également sans alerte.
- Licences de production inspectées et textes conservés dans `public/THIRD-PARTY-NOTICES.txt`.
- Logo officiel comparé à l'original par SHA-256 : copie identique (`F7F728538C7926138C6FC7BFA58DD732E97A5C291FD02218E98F8086D5A4131A`). Le logo n'est pas appliqué automatiquement aux QR.
- Le build ne contient ni appel à une API QR, ni police distante, ni script de suivi. La politique CSP limite les ressources à l'origine du site et aux images locales/data/blob.

## Limites honnêtes

La vérification de lecture est logicielle (jsQR et ZXing). **Aucun smartphone physique n'a été piloté** pendant cette session. Un scan réel avec l'appareil photo Android/iPhone reste à faire, idéalement sur le support d'impression final.

L'installabilité est vérifiée par le manifest, les icônes et le service worker ; **aucune installation réelle sur un iPhone ou Android n'a été effectuée**. Les instructions d'installation sont dans l'application et le README.

## Publication

Publication réalisée sur Cloudflare Pages, projet distinct `qr-studio-mr-christophe`, le 16 octobre 2026. Les 14 fichiers statiques de production ont été téléversés par chargement direct. Cloudflare a confirmé le déploiement ; l'adresse publique a ensuite passé les huit scénarios ci-dessus, y compris le mode hors connexion.

La vérification sur l'hébergement réel a permis de corriger deux problèmes spécifiques : une conversion inutile des logos par XHR bloquée par la CSP, et la réponse de secours hors connexion qui devait utiliser l'URL canonique `/` plutôt que `/index.html` redirigée par Pages.

Le dépôt GitHub distinct a été créé après rétablissement de la connexion : https://github.com/EthanPwn86/qr-studio-mr-christophe. Le code complet, les dépendances verrouillées, la documentation et les tests sont également livrés localement et dans une archive source.
