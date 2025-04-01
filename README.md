# Technical Challenge

## 🎯 Objective

Develop a **microservice** to manage the lifecycle of voice/video calls via real-time events, following call center business rules (e.g., medical interpreter-patient workflows). Focus on code quality, scalability, and integration.

---

## ⚙️ Technologies

| Area         | Stack                                                         |
| ------------ | ------------------------------------------------------------- |
| **Frontend** | Next.js + TypeScript, Socket.io Client                        |
| **Backend**  | Express.js/NestJS + TypeScript, PostgreSQL/MongoDB, Socket.io |
| **Testing**  | Jest (unit), Cypress/Supertest (integration)                  |

---

## 📞 Call Lifecycle & Events

### Call Flow

`Initiated → Routed → Answered → [Hold/Transfer] → Ended`

### Key Events (Implement at least 4)

| Event                | Trigger                             | Sample Data                                                            | Business Rules                                                             |
| -------------------- | ----------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **`call_initiated`** | Call starts (voice/video).          | `{ "call_id": "123", "type": "video", "queue_id": "medical_spanish" }` | - Validate `queue_id` exists.<br>- Start SLA timer (30s max wait).         |
| **`call_routed`**    | Call assigned to agent/interpreter. | `{ "agent_id": "agent_55", "routing_time": 15 }`                       | - Re-route if agent doesn’t answer in 15s (`call_retransfer`).             |
| **`call_answered`**  | Agent accepts the call.             | `{ "wait_time": 25 }`                                                  | - Alert supervisor if `wait_time > 30s`.<br>- Update agent metrics.        |
| **`call_hold`**      | Call placed on hold.                | `{ "hold_duration": 45 }`                                              | - Max hold time: 60s.<br>- Notify supervisor if exceeded.                  |
| **`call_ended`**     | Call finishes (success/failure).    | `{ "end_reason": "completed", "duration": 300 }`                       | - Flag calls with `duration < 10s` for review.<br>- Send post-call survey. |

---

## 📋 Technical Requirements

### Backend (Express/NestJS)

1. **REST API**:

   - `POST /api/events`: Ingests events (authenticated via API Key header).
   - `GET /api/calls?status=active`: Lists calls with filters (status, queue).
   - **Validation**: Use Zod/Class-Validator for event schemas.

2. **WebSockets**:

   - Broadcast real-time updates via Socket.io.

3. **Database**:

   ```ts
   // Call Entity
   interface Call {
     id: string;
     status: "waiting" | "active" | "on_hold" | "ended";
     queue_id: string;
     start_time: Date;
     end_time?: Date;
   }

   // CallEvent Entity (Audit Log)
   interface CallEvent {
     id: string;
     call_id: string;
     type: string;
     timestamp: Date;
     metadata?: Record<string, any>;
   }
   ```

### Frontend (Next.js)

1. **Dashboard**:
   - Real-time table of active/ended calls.
   - Event history view per call.
   - Filters by status/queue.

---

## 🚀 How to Participate

1. **Fork** this repository.
2. Develop your solution in the fork.
3. Submit a **Pull Request** with:
   - Functional code in `frontend/` and `backend/`.
   - Clear setup instructions in the README.
   - Unit + integration tests.

---

## 🔍 Evaluation Criteria

- **Event Flow**: Correct state transitions (e.g., `call_initiated` → `call_ended`).
- **Code Quality**: Clean architecture (DTOs, services), error handling.
- **Real-Time**: Efficient WebSocket usage (no duplicates).
- **Testing**: 5+ unit tests, 1 integration test.

---

## 📈 Bonus (Optional)

- [ ] Retry failed events (3 attempts).
- [ ] Docker setup (`docker-compose.yml`).

---

**❗ Note:**  
Focus on **extensibility** (e.g., how this module would integrate with CRM/queuing systems). Good luck! 🚀

### Setup instructions

1. Git pull
2. cp `.env.example` `.env`
3. docker compose up -d
4. Ingest events via the `/api/events` endpoint

Sample request:

```
curl --location 'http://localhost/api/events' \
--header 'x-api-key: LX3ywoCRGd0f%z*9uH' \
--header 'Content-Type: application/json' \
--data '{
    "event_type": "call_initiated",
    "call_id": 123,
    "type": "video",
    "queue_id": "medical_spanish"
}'
```
