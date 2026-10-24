# EventSphere AI — FastAPI endpoint reference

**Base:** `http://localhost:5000/api`. **Interactive Swagger:** `http://localhost:5000/docs`.

JSON errors return `{"message": "..."}` (validation errors may also include an `errors` array). Protected endpoints use `Authorization: Bearer <JWT>`.

| Method | Path | Role | Payload / response |
|---|---|---|---|
| GET | `/health` | Public | `{status,app,backend}` |
| POST | `/auth/register` | Public | `{name,email,password,role}` → `{token,user}` |
| POST | `/auth/login` | Public | `{email,password}` → `{token,user}` |
| GET | `/auth/me` | Signed in | `{user}` |
| PATCH | `/auth/me/interests` | Signed in | `{interests:[...]}` → `{user}` |
| GET | `/events` | Public | query: `search`, `category`, `sort`, `lat`, `lng`, `radius` → `{events}` |
| GET | `/events/{id}` | Public | `{event}` |
| POST | `/events/duplicate-check` | Organizer | `{title,date,locality,venue}` → `{matches}` |
| POST | `/events` | Organizer | Event JSON → `{event,matches}` |
| POST | `/ocr/poster` | Organizer | multipart `poster` PNG/JPEG ≤4 MB → `{parsed,confidence,note}` |
| POST | `/events/{id}/register` | Student | `{registration}` |
| GET | `/me/tickets` | Student | `{tickets}` |
| GET | `/organizer/overview` | Organizer | `{events}` with registrations/checkins |
| POST | `/checkins/verify` | Organizer | `{ticketToken}` → `{message,attendee,event,checkedInAt}` |

## Example event create

```json
{
  "title": "Modern Web Workshop",
  "description": "Build and deploy a real React FastAPI application.",
  "category": "Workshop",
  "date": "2026-11-05T12:00:00.000Z",
  "time": "11:00 AM",
  "venue": "Innovation Room",
  "locality": "Pune",
  "location": {"lat":18.5204,"lng":73.8567},
  "capacity": 120,
  "source": "manual"
}
```

## Example check-in

```json
{"ticketToken":"your_ticket_token_from_student_registration"}
```

Token length is 48 hex characters. Only the **event-owning organizer** may check it in; a second scan is rejected with 409.

### Personalization explanation

Recommendation scores are deterministic: 35 base points, +32 when category matches user interests, +20 if event is ≤12 km from supplied location, and +13 when event is within the next seven days. The maximum 100 points is *not* an accuracy percentage. Duplicate confidence uses title-token overlap with bonuses for matching day and locality.

**Common statuses:** 400 invalid input, 401 login required, 403 role or ownership denied, 404 not found, 409 duplicate/full/already checked in, 413 oversized poster, 503 unavailable OCR or database.
