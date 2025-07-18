#!/usr/bin/env python3
"""
Simple Flask server for Weather Alert Monitor database operations
"""

from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid
import hashlib
import secrets
import subprocess

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DATABASE_FILE = 'database.json'
USERS_FILE = 'users.json'
sessions = {}  # session_token: {username, role}

login_counter = 0


def load_database():
    """Load the database from JSON file"""
    try:
        with open(DATABASE_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Return default database structure if file doesn't exist
        return {
            "locations": [],
            "lastUpdated": None
        }

def save_database(data):
    """Save the database to JSON file"""
    data['lastUpdated'] = datetime.now().isoformat()
    with open(DATABASE_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def load_users():
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)['users']
    except Exception:
        return []

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump({'users': users}, f, indent=2)

def get_user(username):
    users = load_users()
    for user in users:
        if user['username'] == username:
            return user
    return None

def require_auth(role=None):
    def decorator(func):
        def wrapper(*args, **kwargs):
            token = request.headers.get('Authorization')
            if not token or token not in sessions:
                return jsonify({'error': 'Unauthorized'}), 401
            user = sessions[token]
            if not user or (role and user.get('role') != role):
                return jsonify({'error': 'Forbidden'}), 403
            g.user = user
            return func(*args, **kwargs)
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator

@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS, etc.)"""
    return send_from_directory('.', filename)

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all locations"""
    try:
        data = load_database()
        return jsonify(data['locations'])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    global login_counter
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    user = get_user(username)
    if not user or not user.get('password'):
        return jsonify({'error': 'Invalid credentials'}), 401
    hashed = hashlib.sha256((password or '').encode()).hexdigest()
    if hashed != user['password']:
        return jsonify({'error': 'Invalid credentials'}), 401
    token = secrets.token_hex(32)
    sessions[token] = {'username': username, 'role': user.get('role')}
    login_counter += 1
    if login_counter % 10 == 0:
        try:
            subprocess.Popen(['sh', 'backup_databases.sh'])
        except Exception as e:
            print(f"Backup script failed: {e}")
    return jsonify({'token': token, 'role': user.get('role'), 'username': username})

@app.route('/api/logout', methods=['POST'])
def logout():
    token = request.headers.get('Authorization')
    if token in sessions:
        del sessions[token]
    return jsonify({'message': 'Logged out'})

@app.route('/api/users', methods=['POST'])
@require_auth(role='admin')
def add_user():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    if not username or not password or not role:
        return jsonify({'error': 'Missing fields'}), 400
    if get_user(username):
        return jsonify({'error': 'User already exists'}), 400
    hashed = hashlib.sha256(password.encode()).hexdigest()
    users = load_users()
    users.append({'username': username, 'password': hashed, 'role': role})
    save_users(users)
    return jsonify({'message': 'User added'})

# Restrict add_location to admin only
@app.route('/api/locations', methods=['POST'])
@require_auth(role='admin')
def add_location():
    try:
        data = load_database()
        location_data = request.json or {}
        location_data['id'] = f"loc_{uuid.uuid4().hex[:8]}"
        location_data['lastUpdated'] = datetime.now().isoformat()
        data['locations'].append(location_data)
        save_database(data)
        return jsonify(location_data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations/<location_id>', methods=['PUT'])
def update_location(location_id):
    """Update an existing location"""
    try:
        data = load_database()
        location_data = request.json or {}
        
        # Find and update the location
        for i, location in enumerate(data['locations']):
            if location['id'] == location_id:
                location_data['id'] = location_id
                location_data['lastUpdated'] = datetime.now().isoformat()
                data['locations'][i] = location_data
                save_database(data)
                return jsonify(location_data)
        
        return jsonify({'error': 'Location not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations/<location_id>', methods=['DELETE'])
def delete_location(location_id):
    """Delete a location"""
    try:
        data = load_database()
        
        # Find and remove the location
        for i, location in enumerate(data['locations']):
            if location['id'] == location_id:
                deleted_location = data['locations'].pop(i)
                save_database(data)
                return jsonify(deleted_location)
        
        return jsonify({'error': 'Location not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations/bulk', methods=['PUT'])
def update_locations_bulk():
    """Update multiple locations at once (for weather data updates)"""
    try:
        data = load_database()
        locations_data = request.json or []
        if not isinstance(locations_data, list):
            return jsonify({'error': 'Invalid data'}), 400
        # Update each location
        for location_data in locations_data:
            for i, location in enumerate(data['locations']):
                if location['id'] == location_data['id']:
                    location_data['lastUpdated'] = datetime.now().isoformat()
                    data['locations'][i] = location_data
                    break
        
        save_database(data)
        return jsonify({'message': 'Locations updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/database', methods=['GET'])
def get_database_info():
    """Get database information"""
    try:
        data = load_database()
        return jsonify({
            'totalLocations': len(data['locations']),
            'lastUpdated': data['lastUpdated']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Weather Alert Monitor Server...")
    cert_file = os.path.join('ssl', 'cert.pem')
    key_file = os.path.join('ssl', 'key.pem')
    ssl_context = None
    if os.path.exists(cert_file) and os.path.exists(key_file):
        ssl_context = (cert_file, key_file)
        print('SSL enabled: serving HTTPS on port 443')
        port = 443
    else:
        print('SSL not enabled: serving HTTP on port 8000')
        port = 8000
    print("Server will be available at: https://localhost:{}".format(port) if ssl_context else "http://localhost:{}".format(port))
    print("API endpoints:")
    print("  GET  /api/locations - Get all locations")
    print("  POST /api/locations - Add new location")
    print("  PUT  /api/locations/<id> - Update location")
    print("  DELETE /api/locations/<id> - Delete location")
    print("  PUT  /api/locations/bulk - Update multiple locations")
    print("  GET  /api/database - Get database info")
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False, ssl_context=ssl_context) 