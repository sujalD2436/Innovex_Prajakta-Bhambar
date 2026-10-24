"""Transparent, deterministic event matching (not an ML probability model)."""
import math
import re
import unicodedata
from datetime import datetime, timezone

CATEGORIES = ["Hackathon", "Workshop", "Tech Talk", "Networking", "Cultural", "Community", "Other"]


def normalize(value=''):
    val = unicodedata.normalize('NFKD', str(value or '')).lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s]', ' ', val)).strip()


def similarity(a, b):
    left = {x for x in normalize(a).split() if len(x) > 2}
    right = {x for x in normalize(b).split() if len(x) > 2}
    return len(left & right) / len(left | right) if left and right else 0.0


def parse_date(value):
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    if not isinstance(value, str):
        raise ValueError('Invalid date')
    return datetime.fromisoformat(value.replace('Z', '+00:00')).replace(tzinfo=timezone.utc) if '+' not in value and not value.endswith('Z') else datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)


def duplicate_confidence(incoming, existing):
    title_score = similarity(incoming.get('title'), existing.get('title'))
    try:
        day_equal = parse_date(incoming.get('date')).date() == parse_date(existing.get('date')).date()
    except (ValueError, TypeError):
        day_equal = False
    local_a = normalize(incoming.get('locality') or incoming.get('venue'))
    local_b = normalize(existing.get('locality') or existing.get('venue'))
    local_match = bool(local_a and local_b and (local_a in local_b or local_b in local_a))
    return min(1, .7 * title_score + (.2 if day_equal else 0) + (.1 if local_match else 0))


def distance_km(a, b):
    if not a or not b:
        return None
    try:
        lat1, lon1, lat2, lon2 = map(float, (a['lat'], a['lng'], b['lat'], b['lng']))
        if abs(lat1)>90 or abs(lat2)>90 or abs(lon1)>180 or abs(lon2)>180:
            return None
        rad = math.pi / 180
        d_lat, d_lon = (lat2 - lat1) * rad, (lon2 - lon1) * rad
        v = math.sin(d_lat / 2) ** 2 + math.cos(lat1 * rad) * math.cos(lat2 * rad) * math.sin(d_lon / 2) ** 2
        return 6371 * 2 * math.atan2(math.sqrt(v), math.sqrt(max(0, 1 - v)))
    except (TypeError, ValueError, KeyError):
        return None


def recommendation(event, interests=None, origin=None, now=None):
    now = now or datetime.now(timezone.utc)
    category_match = normalize(event.get('category')) in {normalize(x) for x in (interests or [])}
    km = distance_km(origin, event.get('location'))
    near = km is not None and km <= 12
    days = (parse_date(event['date']) - now).total_seconds() / 86400
    soon = 0 <= days <= 7
    score = 35 + (32 if category_match else 0) + (20 if near else 0) + (13 if soon else 0)
    why = (f"Matches your {event['category']} interest" if category_match else
           f'{round(km)} km away from you' if near else
           'Happening this week' if soon else 'Explore something new')
    return {'score': score, 'why': why, 'distanceKm': round(km, 1) if km is not None else None}


def parse_poster_text(text=''):
    lines = [x.strip() for x in str(text).splitlines() if x.strip()]
    m = re.search(r'\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b', text)
    year_first = True
    if not m:
        m = re.search(r'\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b', text)
        year_first = False
    date = ''
    if m:
        try:
            year, month, day = ((int(m[1]), int(m[2]), int(m[3])) if year_first
                                else (int(m[3]), int(m[2]), int(m[1])))
            date = datetime(year, month, day).date().isoformat()
        except ValueError:
            pass
    time = re.search(r'\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b', text, flags=re.I)
    venue_line = next((x for x in lines if re.match(r'^(venue|location|place)\s*[:\-]', x, re.I)), '')
    title = next((x for x in lines if 7 <= len(x) <= 100 and not re.match(r'^(venue|time|date|location|register|scan|www|http)', x, re.I)), '')
    lower = text.lower()
    category = ('Hackathon' if re.search(r'hackathon|coding competition', lower)
                else 'Workshop' if re.search(r'workshop|bootcamp', lower)
                else 'Networking' if re.search(r'network|meetup', lower)
                else 'Cultural' if re.search(r'cultural|fest|music', lower)
                else 'Tech Talk' if re.search(r'seminar|keynote|tech talk', lower)
                else 'Other')
    return {'title': title, 'date': date, 'time': time.group(0).upper() if time else '',
            'venue': re.sub(r'^(venue|location|place)\s*[:\-]\s*', '', venue_line, flags=re.I),
            'category': category, 'rawText': str(text)[:4000]}
