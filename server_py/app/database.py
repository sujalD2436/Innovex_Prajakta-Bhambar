"""MongoDB connection and reusable serializers."""
import os
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017/eventsphere_ai')
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client.get_default_database(default='eventsphere_ai')


def create_indexes():
    db.users.create_index([('email', ASCENDING)], unique=True)
    db.events.create_index([('date', ASCENDING)])
    db.registrations.create_index([('ticketToken', ASCENDING)], unique=True)
    db.registrations.create_index([('event', ASCENDING), ('attendee', ASCENDING)], unique=True)


def utcnow():
    return datetime.now(timezone.utc)


def serialize(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat().replace('+00:00', 'Z') if value.tzinfo else value.isoformat() + 'Z'
    if isinstance(value, dict):
        return {k: serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [serialize(x) for x in value]
    return value


def as_id(value):
    try:
        return ObjectId(value) if ObjectId.is_valid(value) else None
    except (TypeError, ValueError):
        return None
