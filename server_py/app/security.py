"""JWT auth with bcrypt hashing (compatible with previous bcryptjs hashes)."""
import os
import re
from datetime import timedelta
import bcrypt
import jwt
from fastapi import Header, HTTPException, Depends
from .database import db, utcnow, as_id, serialize

JWT_SECRET = os.getenv('JWT_SECRET', '')

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')


def verify_password(password, password_hash):
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except (ValueError, TypeError):
        return False


def public_user(user):
    return {'id': str(user['_id']), 'name': user['name'], 'email': user['email'],
            'role': user['role'], 'interests': user.get('interests', [])}


def token_for(user):
    payload = {'sub': str(user['_id']), 'exp': utcnow() + timedelta(days=1)}
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def optional_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith('Bearer '):
        return None
    try:
        payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=['HS256'])
        oid = as_id(payload.get('sub'))
        return db.users.find_one({'_id': oid}) if oid else None
    except (jwt.PyJWTError, ValueError):
        return None


def require_user(user=Depends(optional_user)):
    if user is None:
        raise HTTPException(status_code=401, detail='Please sign in first.')
    return user


def attendee(user=Depends(require_user)):
    if user['role'] != 'attendee':
        raise HTTPException(status_code=403, detail='Student access only.')
    return user


def organizer(user=Depends(require_user)):
    if user['role'] != 'organizer':
        raise HTTPException(status_code=403, detail='Organizer access only.')
    return user
