# Call Lifecycle Service - Backend

Este microservicio en Node.js + Express + MongoDB gestiona eventos de llamadas, estados, y comunicación en tiempo real mediante Socket.IO.

---

## Características

- Registro de eventos: `call_initiated`, `call_answered`, `call_ended`.
- Persistencia de datos en MongoDB.
- Actualización de estado de llamadas automáticamente.
- WebSocket (Socket.IO) para interacción en tiempo real.
- Integración con frontend vía REST + WebSockets.
- Pruebas unitarias e integración (Jest + Supertest).

---

## Requisitos

- Node.js 18+
- MongoDB
- `.env` file

## Instalación

npm install
npm run dev


## Endpoints REST

POST /api/events → Registrar eventos de llamada.
GET  /api/events → Listar eventos de llamada.
GET /api/calls → Listar llamadas.
GET /api/calls/:call_id/events → Ver historial de eventos de una llamada.

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/call_service
API_KEY=supersecreta123


