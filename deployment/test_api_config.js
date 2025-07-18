// Test script to verify API configuration
// Run this in the browser console to test the API endpoints

async function testAPIConfig() {
    console.log('🔍 Testing API Configuration...');
    
    // Get the current API base URL
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const port = isLocalhost ? ':8000' : '';
    const apiBase = `${protocol}//${hostname}${port}/api`;
    
    console.log('📍 Current location:', window.location.href);
    console.log('🌐 API Base URL:', apiBase);
    console.log('🏠 Hostname:', hostname);
    console.log('🔌 Port:', port || 'default');
    console.log('🔒 Protocol:', protocol);
    
    // Test the locations endpoint
    try {
        console.log('📡 Testing /api/locations...');
        const response = await fetch(`${apiBase}/locations`);
        const data = await response.json();
        console.log('✅ Locations API Response:', data);
        console.log(`📊 Found ${data.length} locations`);
    } catch (error) {
        console.error('❌ Locations API Error:', error);
    }
    
    // Test the database endpoint
    try {
        console.log('📡 Testing /api/database...');
        const response = await fetch(`${apiBase}/database`);
        const data = await response.json();
        console.log('✅ Database API Response:', data);
    } catch (error) {
        console.error('❌ Database API Error:', error);
    }
    
    console.log('🏁 API Configuration Test Complete!');
}

// Run the test
testAPIConfig(); 