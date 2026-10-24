"""Fast, offline tests for explainable matching and poster parsing."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.intelligence import duplicate_confidence, recommendation, similarity, parse_poster_text, distance_km


def test_similar_titles():
    assert similarity('React Hackathon Pune', 'React Hackathon Pune') == 1
    assert similarity('React Hackathon Pune', 'Dance festival') == 0


def test_duplicate_detection():
    first = {'title': 'React Hackathon Pune', 'date': '2026-11-15', 'locality': 'Kharadi'}
    second = {'title': 'React Hackathon Pune', 'date': '2026-11-15', 'locality': 'Kharadi'}
    assert duplicate_confidence(first, second) >= .99
    assert duplicate_confidence(first, {'title': 'Outdoor music', 'date': '2026-12-01', 'locality': 'Baner'}) < .65


def test_proximity():
    assert distance_km({'lat': 18.52, 'lng': 73.85}, {'lat': 18.52, 'lng': 73.85}) == 0
    assert distance_km(None, {'lat': 18.52, 'lng': 73.85}) is None


def test_recommendations_explainable():
    e = {'category': 'Hackathon', 'date': datetime.now(timezone.utc) + timedelta(days=2),
         'location': {'lat': 18.5204, 'lng': 73.8567}}
    r = recommendation(e, ['Hackathon'], {'lat': 18.5204, 'lng': 73.8567})
    assert r['score'] == 100
    assert 'Matches your' in r['why']


def test_poster_parser():
    text = 'Full Stack Workshop\nDate: 2026-11-18\nTime: 11:00 AM\nVenue: Demo Hall'
    data = parse_poster_text(text)
    assert data['date'] == '2026-11-18'
    assert data['venue'] == 'Demo Hall'
    assert data['category'] == 'Workshop'
    assert data['title'] == 'Full Stack Workshop'


def test_invalid_poster_date():
    assert parse_poster_text('Workshop on 2026-02-30')['date'] == ''
