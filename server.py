#!/usr/bin/env python3
"""
Simple Flask server for Weather Alert Monitor database operations
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DATABASE_FILE = 'database.json'

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

@app.route('/api/locations', methods=['POST'])
def add_location():
    """Add a new location"""
    try:
        data = load_database()
        location_data = request.json
        
        # Generate unique ID
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
        location_data = request.json
        
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
        locations_data = request.json
        
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
    print("Server will be available at: http://localhost:8201")
    print("API endpoints:")
    print("  GET  /api/locations - Get all locations")
    print("  POST /api/locations - Add new location")
    print("  PUT  /api/locations/<id> - Update location")
    print("  DELETE /api/locations/<id> - Delete location")
    print("  PUT  /api/locations/bulk - Update multiple locations")
    print("  GET  /api/database - Get database info")
    app.run(host='0.0.0.0', port=8201, debug=True) 