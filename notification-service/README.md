# notification-service

Microservice de notifications asynchrones de la plateforme d'évaluations. Il fonctionne comme un travailleur événementiel (Worker Daemon) réagissant aux événements métier publiés sur le broker RabbitMQ.

---

## 1. Responsabilités

- **Consommation d'événements** : écoute les 5 événements clés du cycle de vie des évaluations et de la Saga.
- **Génération de notifications ciblées** : produit des messages adaptés selon le rôle (`ETUDIANT`, `ENSEIGNANT`) ou l'identifiant individuel de l'utilisateur.
- **Journalisation et persistance** : enregistre l'historique de chaque notification dans une base MongoDB dédiée et simule l'expédition (email / push) dans les flux de logs standard.
- **Résilience** : acquittement manuel des messages (`channel.ack` / `channel.nack`) pour garantir qu'aucune notification n'est perdue en cas d'erreur transitoire.

---

## 2. Dépendances

### Infrastructure requise
- **Node.js** : version >= 20.x
- **MongoDB** : instance dédiée (base `notification_service`).
- **RabbitMQ** : broker AMQP (exchange topic `evaluations.events`).

### Dépendances npm principales
- `amqplib` (^0.10.4) : connexion AMQP, déclaration de queue et consommation.
- `mongoose` (^8.5.0) : stockage des notifications générées.
- `dotenv` (^16.4.5) : configuration via variables d'environnement.

---

## 3. Ports et Variables d'environnement

### Nature du service
Ce service ne comporte **pas d'API HTTP REST exposée** ; il fonctionne exclusivement comme un récepteur AMQP piloté par les événements.

### Fichier `.env`
Créer un fichier `.env` à la racine de `notification-service` à partir de `.env.example` :

```env
MONGO_URI=mongodb://127.0.0.1:27017/notification_service
RABBITMQ_URL=amqp://localhost:5672
```

| Variable | Description | Valeur par défaut |
|---|---|---|
| `MONGO_URI` | Chaîne de connexion MongoDB propre au service | `mongodb://127.0.0.1:27017/notification_service` |
| `RABBITMQ_URL` | URL de connexion au broker RabbitMQ | `amqp://localhost:5672` |

---

## 4. Événements Consommés et Gabarits de Notification

Le service s'abonne à la queue durable `notification-service.all-events` liée à l'exchange `evaluations.events` pour les clés de routage suivantes :

| Clé de routage (Routing Key) | Service Émetteur | Destinataire(s) | Contenu du message généré |
|---|---|---|---|
| `assessment.published` | `assessment-service` | Tous les étudiants (`role: ETUDIANT`) | *« Nouvelle évaluation disponible : <titre>. Clôture le <dateFin>. »* |
| `assessment.closing_soon` | `assessment-service` | Tous les étudiants (`role: ETUDIANT`) | *« Rappel : l'évaluation <titre> se termine dans moins d'une heure. »* |
| `submission.completed` | `submission-service` | L'enseignant responsable | *« Nouvelle soumission reçue pour l'évaluation <titre>. »* |
| `grading.completed` | `grading-service` | L'enseignant responsable | *« Correction automatique terminée (copies en attente de validation). »* |
| `result.published` | `grading-service` | L'étudiant concerné (`userId: etudiantId`) | *« Vos résultats pour l'évaluation <titre> sont disponibles. Note : <note>/<bareme>. »* |

---

## 5. Modèle de Données (`Notification`)

Chaque notification persistée dans MongoDB contient :

```json
{
  "_id": "660c3a...",
  "userId": "660c0... (ou null si notification de rôle)",
  "role": "ETUDIANT",
  "titre": "Résultats disponibles",
  "message": "Votre note pour l'examen de Systèmes Distribués est 16/20.",
  "lu": false,
  "metadata": {
    "assessmentId": "660c1...",
    "submissionId": "660c2..."
  },
  "createdAt": "2026-11-01T12:00:00.000Z"
}
```

---

## 6. Installation et Démarrage

### Installation des dépendances
```bash
cd notification-service
npm install
```

### Lancement du service
```bash
npm start
```
Sortie attendue :
```
[notification-service] Connecté à MongoDB
[notification-service] Connecté à RabbitMQ (exchange: evaluations.events)
[notification-service] Abonné à assessment.published, assessment.closing_soon, submission.completed, grading.completed, result.published sur "evaluations.events"
```

Lorsqu'un événement est reçu sur le broker, le service journalise immédiatement l'action :
```
[notification-service] → tous les ETUDIANT : Nouvelle évaluation — Examen Partiel
[notification-service] → 660c0... : Résultats disponibles — Note : 16/20
```
