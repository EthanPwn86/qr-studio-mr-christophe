# Vérifications de QR Studio

Version 1.0.0 — 16 octobre 2026.

## Tests automatisés réellement exécutés

Compilation de production TypeScript + Vite réussie. Suite Playwright exécutée dans Microsoft Edge installé, sans interface : **8 scénarios réussis, 0 échec en local (39,0 s)**, puis **8 scénarios réussis, 0 échec sur l'adresse publique initiale HTTPS (39,7 s)** après correction des problèmes constatés. Après publication à la nouvelle adresse **https://qrtof.pages.dev/**, les huit scénarios ont été exécutés de nouveau : **8 réussis, 0 échec (45,1 s)**.

Application vérifiée à la nouvelle adresse : **https://qrtof.pages.dev/**. Le document HTTPS répond HTTP 200 et fournit la politique CSP attendue. Les tests locaux appliquent aussi cette politique à la première page afin de reproduire les restrictions de l'hébergement.

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
- La version initiale ne contenait ni appel à une API QR, ni police distante, ni script de suivi. La mesure agrégée ajoutée ensuite est décrite ci-dessous ; les données des QR restent locales.

## Limites honnêtes

La vérification de lecture est logicielle (jsQR et ZXing). **Aucun smartphone physique n'a été piloté** pendant cette session. Un scan réel avec l'appareil photo Android/iPhone reste à faire, idéalement sur le support d'impression final.

L'installabilité est vérifiée par le manifest, les icônes et le service worker ; **aucune installation réelle sur un iPhone ou Android n'a été effectuée**. Les instructions d'installation sont dans l'application et le README.

## Publication

La nouvelle adresse **https://qrtof.pages.dev/** a été réservée et publiée sur le projet Cloudflare Pages distinct `qrtof`, le 16 octobre 2026. La même archive de production de 14 fichiers a été utilisée, sans changement du design ni des fonctionnalités. Le document HTML, le manifest PWA, le service worker et le logo officiel ont été comparés par SHA-256 : ils sont identiques à ceux de la version initiale. Tous les scénarios du tableau ci-dessus ont réussi sur cette nouvelle adresse, y compris la génération et les exports hors connexion.

L'adresse initiale **https://qr-studio-mr-christophe.pages.dev/** répond toujours HTTP 200, sans redirection. Son projet et son déploiement n'ont pas été modifiés. L'historique et l'installation PWA étant propres à chaque origine, l'ancien historique reste sur l'adresse initiale ; la PWA de la nouvelle adresse s'installe depuis `qrtof.pages.dev`.

Publication réalisée sur Cloudflare Pages, projet distinct `qr-studio-mr-christophe`, le 16 octobre 2026. Les 14 fichiers statiques de production ont été téléversés par chargement direct. Cloudflare a confirmé le déploiement ; l'adresse publique a ensuite passé les huit scénarios ci-dessus, y compris le mode hors connexion.

La vérification sur l'hébergement réel a permis de corriger deux problèmes spécifiques : une conversion inutile des logos par XHR bloquée par la CSP, et la réponse de secours hors connexion qui devait utiliser l'URL canonique `/` plutôt que `/index.html` redirigée par Pages.

Le dépôt GitHub distinct a été créé après rétablissement de la connexion : https://github.com/EthanPwn86/qr-studio-mr-christophe. Le code complet, les dépendances verrouillées, la documentation et les tests sont également livrés localement et dans une archive source.

## Ajout des statistiques — 16 octobre 2026

- Offre **Workers Free à 0 $** vérifiée dans le tableau de bord. Base D1 `qrtof-usage` créée en région WEUR, avec uniquement une table de totaux par jour et au total.
- **8 tests du collecteur réussis** : agrégats, absence de lecture publique, origines, DNT/GPC, rejet des contenus de QR/propriétés supplémentaires, limite de taille, panne de base et délégation des ressources statiques.
- **10 tests navigateur réussis localement (49,3 s), puis sur https://qrtof.pages.dev/ (53,2 s)**. Deux nouveaux scénarios contrôlent les seuls événements transmis (sans lien, logo, cookie ni référent), l'absence de doublons lors des changements de style et le respect de DNT. Les tests interceptent les compteurs réels pour ne pas gonfler les totaux.
- Manifest, service worker, rechargement, import du logo et exports PNG/SVG **hors connexion** vérifiés sur le site public. La copie HTML réservée au cache hors connexion retire le beacon externe injecté par Cloudflare ; aucune ressource externe n'est demandée lors de cette vérification.
- Vérification distincte réellement connectée au collecteur : création d'un QR vers l'adresse publique et exports PNG/SVG. Les trois événements ont répondu **HTTP 204** ; seuls leurs noms ont été envoyés. Le script Cloudflare a répondu **200** et le beacon de fréquentation **204**. Ce test initial ajoute 1 QR, 1 PNG et 1 SVG aux totaux.
- Déploiement confirmé : https://cd26b885.qrtof.pages.dev/ (production https://qrtof.pages.dev/). La confidentialité a été mise à jour. Le CSS, le design, les icônes et le logo officiel n'ont pas été changés. L'ancienne adresse conserve son déploiement.

## Identité bleue approuvée ensuite

Après accord explicite de publication, l'interface adopte le bleu marine et le bleu azur, sur fond bleu très clair. Le bouton d'installation utilise une flèche et le libellé « Installer », également visible à 320 px. Le manifest et les icônes PWA reprennent la palette ; le PNG officiel Mr Christophe reste intact.

Les **10 scénarios navigateur passent sur la compilation finale locale (49,9 s)**, dont le libellé Installer visible sur mobile, les exports scannables, l'historique, les compteurs et la PWA hors connexion. La couleur QR par défaut devient le bleu marine ; les anciennes créations gardent leurs couleurs enregistrées.

La version finale publique **https://529a7cb5.qrtof.pages.dev/**, disponible à **https://qrtof.pages.dev/**, passe également les **10 scénarios (51,2 s)**. Le cache PWA est `b77efd80ffce1e19`. Le logo officiel garde le SHA-256 `F7F728538C7926138C6FC7BFA58DD732E97A5C291FD02218E98F8086D5A4131A`. Le tableau de compteurs propose aussi une vue privée en lecture seule, `tableau_de_bord`, avec des colonnes courtes QR/PNG/SVG/Exports.
