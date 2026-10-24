"""Seed demo accounts and six explicitly fictional future events; rerunnable."""
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / '.env')

from app.database import db, client, create_indexes, utcnow
from app.security import hash_password


def main():
    client.admin.command('ping')
    create_indexes()
    password_hash = hash_password('Demo@12345')
    now = utcnow()
    for user in [
        {'name': 'Aarav Organizer', 'email': 'organizer@eventsphere.demo', 'role': 'organizer', 'interests': []},
        {'name': 'Riya Student', 'email': 'student@eventsphere.demo', 'role': 'attendee', 'interests': ['Hackathon', 'Workshop']},
    ]:
        db.users.update_one({'email': user['email']}, {'$setOnInsert': {
            **user, 'passwordHash': password_hash, 'createdAt': now, 'updatedAt': now}}, upsert=True)
    organizer = db.users.find_one({'email': 'organizer@eventsphere.demo'})
    demo_events = [
        ('CodeSprint: Build for Good', 'Hackathon', 'Hinjawadi, Pune', 'Demo Innovation Hall', 18.5914, 73.7389, 120, 1, '10:00 AM',
         'A fictional 24-hour social innovation hackathon for demo purposes. Build practical ideas with engineers and designers.'),
        ('Full Stack Engineering Lab', 'Workshop', 'Viman Nagar, Pune', 'Demo Learning Studio', 18.5679, 73.9143, 55, 3, '2:00 PM',
         'A fictional hands-on React, FastAPI and MongoDB workshop with guided challenges and a portfolio demo.'),
        ('AI Builders Meetup', 'Networking', 'Baner, Pune', 'Demo Community Hub', 18.5590, 73.7868, 80, 5, '4:30 PM',
         'A fictional meetup for developers interested in agentic AI, product thinking and student entrepreneurship.'),
        ('Cyber Safety and Digital Trust', 'Tech Talk', 'Kharadi, Pune', 'Demo Tech Auditorium', 18.5512, 73.9471, 200, 6, '11:00 AM',
         'A fictional expert talk on cyber hygiene, digital identity protection and secure development practices.'),
        ('Community Design Jam', 'Community', 'Shivajinagar, Pune', 'Demo Civic Space', 18.5314, 73.8446, 40, 8, '9:30 AM',
         'A fictional collaborative design session for accessible neighbourhood public services and student volunteering.'),
        ('FutureTech Cultural Fest', 'Cultural', 'Kothrud, Pune', 'Demo Arts Arena', 18.5074, 73.8077, 500, 10, '5:00 PM',
         'A fictional creative-technology celebration, featuring art, music and interactive student-built installations.'),
    ]
    total = 0
    for title, category, locality, venue, lat, lng, capacity, days, event_time, description in demo_events:
        if db.events.find_one({'title': title, 'isDemo': True, 'date': {'$gte': now - timedelta(hours=1)}}):
            continue
        day = (now + timedelta(days=days)).replace(hour=10, minute=0, second=0, microsecond=0)
        db.events.insert_one({'title': title, 'category': category, 'locality': locality, 'venue': venue,
                              'location': {'lat': lat, 'lng': lng}, 'capacity': capacity, 'date': day,
                              'time': event_time, 'description': description, 'organizer': organizer['_id'],
                              'isDemo': True, 'source': 'manual', 'createdAt': now, 'updatedAt': now})
        total += 1
    print(f'Demo users ready. Added {total} fictional future events.')
    print('Student: student@eventsphere.demo / Demo@12345')
    print('Organizer: organizer@eventsphere.demo / Demo@12345')
    client.close()


if __name__ == '__main__':
    main()
