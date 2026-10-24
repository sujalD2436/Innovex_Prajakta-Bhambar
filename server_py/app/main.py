"""EventSphere AI API — FastAPI + MongoDB. API shapes match the React client."""
import io
import json
import os
import re
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from time import time

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / '.env')

from bson import ObjectId
from fastapi import Body, Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from pymongo.errors import DuplicateKeyError, PyMongoError
from PIL import Image, UnidentifiedImageError

from .database import db, client, create_indexes, utcnow, serialize, as_id
from .intelligence import CATEGORIES, recommendation, duplicate_confidence, parse_date, parse_poster_text
from .security import attendee, organizer, require_user, optional_user, hash_password, verify_password, public_user, token_for, JWT_SECRET


@asynccontextmanager
async def lifespan(_app):
    if len(JWT_SECRET) < 32:
        raise RuntimeError('Set JWT_SECRET (at least 32 characters) in server_py/.env')
    try:
        client.admin.command('ping')
        create_indexes()
        print('EventSphere AI FastAPI connected to MongoDB.')
    except PyMongoError as exc:
        print('MongoDB unavailable. Start MongoDB or set MONGO_URI in server_py/.env:', exc)
        raise RuntimeError('MongoDB connection failed') from exc
    yield
    client.close()


app = FastAPI(title='EventSphere AI — FastAPI', version='2.0.0', description='VECNAVERSE: Poster to Participation', lifespan=lifespan)
origins = [x.strip() for x in os.getenv('CLIENT_ORIGIN', 'http://localhost:5173').split(',') if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=['GET', 'POST', 'PATCH'], allow_headers=['Authorization', 'Content-Type'])


@app.exception_handler(HTTPException)
async def api_errors(_request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={'message': str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_errors(_request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={'message': 'Please check the submitted fields.', 'errors': [str(e.get('loc')) + ': ' + e['msg'] for e in exc.errors()[:6]]})


@app.exception_handler(DuplicateKeyError)
async def duplicate_errors(_request: Request, _exc: DuplicateKeyError):
    return JSONResponse(status_code=409, content={'message': 'This record already exists.'})


@app.exception_handler(PyMongoError)
async def database_errors(_request: Request, _exc: PyMongoError):
    return JSONResponse(status_code=503, content={'message': 'Database unavailable. Check the MongoDB connection.'})


class AuthRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str


class AuthLogin(BaseModel):
    email: str
    password: str


class InterestsPayload(BaseModel):
    interests: list[str]


class DuplicatePayload(BaseModel):
    title: str
    date: str
    locality: str = ''
    venue: str = ''


class Location(BaseModel):
    lat: float
    lng: float


class EventPayload(BaseModel):
    title: str
    description: str
    category: str
    date: datetime
    time: str
    venue: str
    locality: str
    location: Location
    capacity: int = Field(ge=1, le=10000)
    source: str = 'manual'

    @field_validator('title', 'description', 'time', 'venue', 'locality')
    @classmethod
    def not_blank(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Must contain at least 2 characters')
        return v.strip()


class TicketPayload(BaseModel):
    ticketToken: str


login_attempts = {}
login_lock = Lock()


def rate_limit_auth(request: Request):
    """Basic single-process prototype limiter. Use Redis/shared middleware in production."""
    key = request.client.host if request.client else 'unknown'
    current = time()
    with login_lock:
        hits = [t for t in login_attempts.get(key, []) if current - t < 900]
        if len(hits) >= 50:
            raise HTTPException(429, 'Too many login attempts. Try again later.')
        hits.append(current)
        login_attempts[key] = hits


def error(code, message):
    raise HTTPException(status_code=code, detail=message)


def event_public(event, populate_organizer=False):
    data = dict(event)
    if populate_organizer and isinstance(data.get('organizer'), ObjectId):
        owner = db.users.find_one({'_id': data['organizer']}, {'name': 1})
        data['organizer'] = {'_id': str(data['organizer']), 'name': owner.get('name', 'Organizer') if owner else 'Organizer'}
    return serialize(data)


def find_duplicates(incoming):
    try:
        day = parse_date(incoming['date'])
    except (ValueError, TypeError, KeyError):
        error(400, 'Title and a valid date are required.')
    start = day - timedelta(days=1)
    end = day + timedelta(days=2)
    docs = list(db.events.find({'date': {'$gte': start, '$lte': end}}).limit(300))
    matches = [{'id': str(x['_id']), 'title': x['title'], 'confidence': round(duplicate_confidence(incoming, x), 2)} for x in docs]
    return sorted([x for x in matches if x['confidence'] >= .65], key=lambda x: x['confidence'], reverse=True)[:3]


@app.get('/api/health')
def health():
    try:
        client.admin.command('ping')
        status = 'ok'
    except PyMongoError:
        status = 'db-disconnected'
    return {'status': status, 'app': 'EventSphere AI', 'backend': 'FastAPI'}


@app.post('/api/auth/register', status_code=201)
def register(body: AuthRegister, request: Request):
    rate_limit_auth(request)
    if not (2 <= len(body.name.strip()) <= 80 and re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', body.email) and
            8 <= len(body.password.encode('utf-8')) <= 72 and body.role in ('attendee', 'organizer')):
        error(400, 'Enter a name, valid email, password (8–72 characters), and role.')
    email = body.email.lower().strip()
    if db.users.find_one({'email': email}):
        error(409, 'Email already registered.')
    new_user = {'name': body.name.strip(), 'email': email, 'passwordHash': hash_password(body.password),
                'role': body.role, 'interests': ['Hackathon', 'Workshop'], 'createdAt': utcnow(), 'updatedAt': utcnow()}
    new_user['_id'] = db.users.insert_one(new_user).inserted_id
    return {'token': token_for(new_user), 'user': public_user(new_user)}


@app.post('/api/auth/login')
def login(body: AuthLogin, request: Request):
    rate_limit_auth(request)
    if not body.email or not body.password:
        error(400, 'Enter valid login credentials.')
    user = db.users.find_one({'email': body.email.lower().strip()})
    if not user or not verify_password(body.password, user['passwordHash']):
        error(401, 'Invalid email or password.')
    return {'token': token_for(user), 'user': public_user(user)}


@app.get('/api/auth/me')
def my_profile(user=Depends(require_user)):
    return {'user': public_user(user)}


@app.patch('/api/auth/me/interests')
def update_interests(body: InterestsPayload, user=Depends(require_user)):
    if len(body.interests) > len(CATEGORIES) or any(v not in CATEGORIES for v in body.interests):
        error(400, 'Invalid interests.')
    interests = list(dict.fromkeys(body.interests))
    db.users.update_one({'_id': user['_id']}, {'$set': {'interests': interests, 'updatedAt': utcnow()}})
    user['interests'] = interests
    return {'user': public_user(user)}


@app.post('/api/events/duplicate-check')
def duplicate_check(body: DuplicatePayload, _user=Depends(organizer)):
    if not body.title.strip():
        error(400, 'Title and date are required.')
    return {'matches': find_duplicates(body.model_dump())}


@app.get('/api/events')
def list_events(search: str = '', category: str = 'All', sort: str = 'recommended',
                lat: float | None = None, lng: float | None = None, radius: float | None = None,
                user=Depends(optional_user)):
    query = {'date': {'$gte': utcnow() - timedelta(hours=1)}}
    if category != 'All' and category in CATEGORIES:
        query['category'] = category
    if search.strip():
        pat = re.escape(search.strip()[:70])
        query['$or'] = [{key: {'$regex': pat, '$options': 'i'}} for key in ['title', 'description', 'venue', 'locality']]
    results = list(db.events.find(query).sort('date', 1).limit(100))
    valid_coords = lat is not None and lng is not None and abs(lat) <= 90 and abs(lng) <= 180
    origin = {'lat': lat, 'lng': lng} if valid_coords else None
    event_ids = [e['_id'] for e in results]
    counts = db.registrations.aggregate([{'$match': {'event': {'$in': event_ids}}}, {'$group': {'_id': '$event', 'count': {'$sum': 1}}}])
    count_map = {x['_id']: x['count'] for x in counts}
    events = [{**event_public(e, populate_organizer=True),
               **recommendation(e, user.get('interests', []) if user else [], origin),
               'registeredCount': count_map.get(e['_id'], 0)} for e in results]
    if origin and radius is not None and 0 < radius < 500:
        events = [e for e in events if e['distanceKm'] is not None and e['distanceKm'] <= radius]
    if sort == 'nearest':
        events.sort(key=lambda e: e['distanceKm'] if e['distanceKm'] is not None else 1000000)
    elif sort == 'date':
        events.sort(key=lambda e: e['date'])
    else:
        events.sort(key=lambda e: (-e['score'], e['date']))
    return {'events': events}


@app.post('/api/events', status_code=201)
def create_event(body: EventPayload, user=Depends(organizer)):
    b = body.model_dump()
    if not (len(b['title']) <= 120 and len(b['description']) <= 2400 and len(b['time']) <= 40 and
            len(b['venue']) <= 160 and len(b['locality']) <= 120 and b['category'] in CATEGORIES and
            abs(b['location']['lat']) <= 90 and abs(b['location']['lng']) <= 180 and
            parse_date(b['date']) >= utcnow() - timedelta(hours=1)):
        error(400, 'Complete all event details, with a future date and valid location.')
    b['date'] = parse_date(b['date'])
    matches = find_duplicates(b)
    if any(x['confidence'] >= .94 for x in matches):
        return JSONResponse(status_code=409, content={'message': 'A near-identical event already exists.', 'matches': matches})
    b['organizer'] = user['_id']
    b['source'] = 'poster' if body.source == 'poster' else 'manual'
    b.update({'isDemo': False, 'createdAt': utcnow(), 'updatedAt': utcnow()})
    b['_id'] = db.events.insert_one(b).inserted_id
    return {'event': event_public(b), 'matches': matches}


@app.get('/api/events/{event_id}')
def event_details(event_id: str, user=Depends(optional_user)):
    oid = as_id(event_id)
    if not oid:
        error(400, 'Invalid event ID.')
    event = db.events.find_one({'_id': oid})
    if not event:
        error(404, 'Event not found.')
    registered_count = db.registrations.count_documents({'event': oid})
    registered = bool(user and user['role'] == 'attendee' and db.registrations.find_one({'event': oid, 'attendee': user['_id']}))
    return {'event': {**event_public(event, populate_organizer=True), 'registeredCount': registered_count, 'registered': registered}}


@app.post('/api/events/{event_id}/register', status_code=201)
def register_event(event_id: str, user=Depends(attendee)):
    oid = as_id(event_id)
    if not oid:
        error(400, 'Invalid event ID.')
    event = db.events.find_one({'_id': oid})
    if not event:
        error(404, 'Event not found.')
    if parse_date(event['date']) < utcnow() - timedelta(hours=1):
        error(400, 'Registration has closed.')
    if db.registrations.find_one({'event': oid, 'attendee': user['_id']}):
        error(409, 'You have already registered for this event.')
    if db.registrations.count_documents({'event': oid}) >= event['capacity']:
        error(409, 'This event has reached its capacity.')
    registration = {'event': oid, 'attendee': user['_id'], 'ticketToken': secrets.token_hex(24),
                    'checkedInAt': None, 'createdAt': utcnow(), 'updatedAt': utcnow()}
    try:
        registration['_id'] = db.registrations.insert_one(registration).inserted_id
    except DuplicateKeyError:
        error(409, 'You have already registered for this event.')
    return {'registration': serialize(registration)}


@app.get('/api/me/tickets')
def my_tickets(user=Depends(attendee)):
    docs = list(db.registrations.find({'attendee': user['_id']}).sort('createdAt', -1))
    response = []
    for doc in docs:
        event = db.events.find_one({'_id': doc['event']}, {'title': 1, 'date': 1, 'time': 1, 'venue': 1, 'locality': 1, 'category': 1})
        item = dict(doc)
        item['event'] = serialize(event) if event else None
        response.append(serialize(item))
    return {'tickets': response}


@app.get('/api/organizer/overview')
def organizer_overview(user=Depends(organizer)):
    events = list(db.events.find({'organizer': user['_id']}).sort('date', 1))
    counts = db.registrations.aggregate([
        {'$match': {'event': {'$in': [e['_id'] for e in events]}}},
        {'$group': {'_id': '$event', 'registrations': {'$sum': 1},
                    'checkins': {'$sum': {'$cond': [{'$ne': ['$checkedInAt', None]}, 1, 0]}}}}
    ])
    cmap = {x['_id']: x for x in counts}
    return {'events': [{**event_public(e), 'registrations': cmap.get(e['_id'], {}).get('registrations', 0),
                        'checkins': cmap.get(e['_id'], {}).get('checkins', 0)} for e in events]}


@app.post('/api/checkins/verify')
def check_in(body: TicketPayload, user=Depends(organizer)):
    token = body.ticketToken.strip()
    try:
        parsed = json.loads(token)
        if isinstance(parsed, dict):
            token = parsed.get('ticketToken') or parsed.get('ticket') or ''
    except (json.JSONDecodeError, TypeError):
        pass
    if not re.fullmatch(r'[a-fA-F0-9]{48}', token):
        error(400, 'Invalid QR ticket code.')
    reg = db.registrations.find_one({'ticketToken': token})
    if not reg:
        error(404, 'Ticket not found.')
    event = db.events.find_one({'_id': reg['event']})
    if not event or event['organizer'] != user['_id']:
        error(403, 'This ticket belongs to another organizer.')
    student = db.users.find_one({'_id': reg['attendee']})
    if reg.get('checkedInAt'):
        error(409, 'Ticket already checked in.')
    from pymongo import ReturnDocument
    updated = db.registrations.find_one_and_update({'_id': reg['_id'], 'checkedInAt': None},
        {'$set': {'checkedInAt': utcnow(), 'updatedAt': utcnow()}}, return_document=ReturnDocument.AFTER)
    if updated is None:
        error(409, 'Ticket already checked in.')
    return {'message': 'Attendance verified!', 'attendee': student['name'] if student else 'Attendee',
            'event': event['title'], 'checkedInAt': serialize(updated['checkedInAt'])}


@app.post('/api/ocr/poster')
def poster_scan(poster: UploadFile = File(...), user=Depends(organizer)):
    if poster.content_type not in ('image/png', 'image/jpeg'):
        error(400, 'Upload a PNG or JPEG poster under 4 MB.')
    raw = poster.file.read(4 * 1024 * 1024 + 1)
    if len(raw) > 4 * 1024 * 1024:
        error(413, 'Poster must be smaller than 4 MB.')
    try:
        Image.MAX_IMAGE_PIXELS = 12_000_000
        img = Image.open(io.BytesIO(raw))
        img.verify()
        img = Image.open(io.BytesIO(raw)).convert('RGB')
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        error(400, 'Invalid poster image.')
    try:
        import pytesseract
        from pytesseract import Output
        if os.getenv('TESSERACT_CMD'):
            pytesseract.pytesseract.tesseract_cmd = os.getenv('TESSERACT_CMD')
        results = pytesseract.image_to_data(img, config='--psm 6', output_type=Output.DICT, timeout=15)
        rows = []
        confidences = []
        current = None
        for i, word in enumerate(results['text']):
            word = word.strip()
            if not word:
                continue
            key = (results['block_num'][i], results['par_num'][i], results['line_num'][i])
            if key != current:
                rows.append([])
                current = key
            rows[-1].append(word)
            try:
                v = float(results['conf'][i])
                if v >= 0:
                    confidences.append(v)
            except (ValueError, TypeError):
                pass
        text = '\n'.join(' '.join(row) for row in rows)
        confidence = round(sum(confidences) / len(confidences)) if confidences else 0
        return {'parsed': parse_poster_text(text), 'confidence': confidence,
                'note': 'OCR is a draft. Verify date, venue and other details before publishing.'}
    except Exception as exc:
        print('OCR unavailable:', exc)
        error(503, 'Poster scanner unavailable. Install Tesseract OCR or enter event details manually.')
