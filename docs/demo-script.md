# Script de démo — soutenance

Déroulé d'environ 15 minutes, joué sur la stack Docker. Chaque étape
indique ce qu'on montre à l'écran et ce qu'il faut dire.

## Préparation (avant la soutenance)

```bash
docker compose up -d --wait rabbitmq user-db question-db assessment-db submission-db grading-db notification-db
docker compose up -d --build
docker compose exec user-service npm run seed
docker compose exec question-service node src/scripts/seed.js
```

Ouvrir à l'avance :

- l'interface : <http://localhost:5173>, dans deux fenêtres (une
  enseignant, une étudiant en navigation privée) ;
- RabbitMQ : <http://localhost:15672> (`guest` / `guest`), onglet
  *Exchanges* → `evaluations.events` ;
- un terminal avec les logs de la Saga :
  `docker compose logs -f grading-service submission-service notification-service`.

Comptes de démonstration :

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | `admin@evaluations.local` | `admin123` |
| Enseignant | `enseignant@evaluations.local` | `enseignant123` |
| Étudiant | `etudiant@evaluations.local` | `etudiant123` |

## 1. Architecture (2 min)

Montrer le diagramme de `docs/architecture.md` :

- 6 microservices, une base MongoDB par service, l'`api-gateway`
  comme point d'entrée unique (JWT vérifié une fois, identité
  transmise par `X-User-Id` / `X-User-Role`) ;
- REST pour le frontend, gRPC entre `assessment-service` et
  `question-service`, RabbitMQ (exchange topic `evaluations.events`)
  pour les événements ;
- CQRS + Event Sourcing sur `assessment-service`, Saga chorégraphiée
  Soumission → Correction → Notification.

## 2. Parcours nominal (5 min)

1. **Enseignant** : se connecter, créer une évaluation en choisissant
   des questions dans la banque (QCM, Vrai/Faux, question courte, une
   question ouverte), puis la publier (ou planifier la publication).
   → Dire : `AssessmentPublished` est publié ; `submission-service`
   met à jour sa liste locale des évaluations ouvertes, sans appel
   synchrone, et `notification-service` prévient les étudiants.
2. **Étudiant** : se connecter, ouvrir l'évaluation, répondre (les
   réponses sont enregistrées automatiquement), déposer un fichier,
   soumettre.
   → Dans les logs : `submission.completed` → correction automatique
   par `grading-service` → notification « Copie soumise ».
3. **Enseignant** : page de correction, la copie est en
   `CORRECTION_AUTO_PARTIELLE` (questions fermées déjà notées). Noter la
   question ouverte, valider.
   → `grading.completed` puis `result.published` ; le Read Model
   d'`assessment-service` met à jour les statistiques.
4. **Étudiant** : page des résultats, la note est visible et la
   notification « Résultat disponible » est arrivée.

## 3. Scénarios d'échec et compensation (5 min)

### Correction automatique impossible

1. Arrêter un service distant : `docker compose stop question-service`.
2. **Étudiant** : soumettre une copie sur une évaluation publiée.
3. Logs : `grading-service` garde la copie `EN_ATTENTE` et la relance
   toutes les 30 s (`tentative n/5`).
   → Dire : la soumission n'est pas perdue et l'étudiant n'est pas
   bloqué, c'est la Saga qui absorbe la panne.
4. Après 5 échecs (≈ 2 min 30), la copie passe en `ECHEC_CORRECTION` et
   `grading.failed` est publié : `submission-service` signale l'incident
   sur la copie (`incidentCorrection`) et `notification-service` prévient
   l'étudiant et l'enseignant. C'est la transaction de compensation.
   Pour gagner du temps, enchaîner sur la suite pendant l'attente.
5. Redémarrer le service : `docker compose start question-service`.
6. **Enseignant** : dans la page de correction, relancer la correction
   (`POST /gradings/:id/retry`). Elle aboutit et `grading.completed`
   efface l'incident côté `submission-service`.

### Soumission hors délai

Avec une évaluation dont la date de fin est passée, l'étudiant tente de
soumettre : refus (409), copie `REFUSEE_HORS_DELAI`,
`submission.rejected` publié, aucune correction n'est déclenchée et
l'étudiant est notifié.

### Resoumission autorisée (règle métier 3)

**Enseignant** : sur la copie refusée, autoriser la resoumission (avec
une date limite propre à la copie si l'évaluation est terminée). La copie
repasse `EN_COURS`, `submission.reopened` est publié, `grading-service`
abandonne la correction non validée et l'étudiant est prévenu. Une copie
dont le résultat est déjà publié ne peut plus être rouverte.

## 4. Sécurité (1 min)

- Un étudiant n'accède pas aux corrections (403 renvoyé par la gateway).
- Un autre enseignant ne peut pas corriger la copie (403 renvoyé par
  `grading-service`, qui fait le contrôle fin).
- Les en-têtes `X-User-*` envoyés par le client sont supprimés par la
  gateway, ce qui empêche l'usurpation d'identité.

## 5. Tests (1 min)

Montrer `e2e/scenarios/` : parcours complet, échec de correction, hors
délai, resoumission, sécurité et planification. Ils se lancent avec
`cd e2e && npm test` (voir `e2e/README.md`).

## Plan B

Si l'interface ou Docker pose problème le jour J, la suite e2e rejoue
les mêmes scénarios via la gateway et montre les mêmes transitions
d'état dans la console.
