# Mise à jour des couches de Loumbila

La carte publique charge les données partagées dans updates/couches.json depuis la branche main. Les fichiers de données QGIS d’origine restent la base initiale ; la sauvegarde partagée les remplace au chargement.

## Accès réservé au propriétaire

1. Cliquez sur « Mise à jour » dans la barre de la carte.
2. Dans GitHub, créez un jeton personnel à accès fin, limité au dépôt ouedkarim-crypto/WEBMAP_LOUMBILA, avec Contents en lecture et écriture.
3. Saisissez le jeton dans la fenêtre de connexion de la carte. Ne le communiquez pas dans une discussion.
4. Le compte doit être ouedkarim-crypto. Le jeton reste en mémoire et est effacé à la déconnexion.

Les permissions GitHub protègent l’écriture en ligne. Pour réserver cette écriture à vous seul, ne donnez pas de droits d’écriture à d’autres comptes sur ce dépôt. Un contrôle d’interface dans un site statique ne remplace pas ces permissions.

## Modifier les données

Choisissez une couche. Ajoutez des champs texte, nombre ou booléen, ou supprimez un champ après confirmation. Sélectionnez une ligne pour modifier ses attributs. Une valeur vide est enregistrée comme null.

Pour l’édition spatiale, sélectionnez une entité puis « Modifier la géométrie sélectionnée ». Déplacez les sommets ; Alt + clic supprime un sommet. « Dessiner sur la carte » crée une entité du type de la couche. Double-cliquez pour terminer une ligne ou un polygone. Échap annule le dessin. Revenez à l’éditeur pour saisir les attributs.

« Annuler la dernière modification » restaure jusqu’à vingt états pendant la session. « Exporter GeoJSON » télécharge la couche active en WGS 84.

## Enregistrer et partager

Cliquez sur « Enregistrer en ligne ». Cette opération crée un commit sur main contenant les données et les schémas des couches. Les nouvelles consultations chargent cette version. GitHub Pages redéploie automatiquement le site.

Un contrôle du SHA refuse l’enregistrement si une autre session a enregistré entre-temps. Exportez alors votre travail, puis rechargez la page pour partir de la version la plus récente.

Les données d’un dépôt public sont publiques, y compris les champs ajoutés. Le jeton n’est jamais ajouté aux fichiers, aux URL ou au stockage du navigateur. Le dossier updates doit rester présent dans le dépôt. L’enregistrement nécessite Internet.
