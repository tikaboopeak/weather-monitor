// Weather Alert Monitor Application
class WeatherAlertMonitor {
    constructor() {
        console.log('WeatherAlertMonitor constructor called');
        console.log('Leaflet available:', typeof L !== 'undefined');
        
        // Test if we can create a simple map
        if (typeof L !== 'undefined') {
            console.log('Testing basic map creation...');
            try {
                const testContainer = document.createElement('div');
                testContainer.style.width = '100px';
                testContainer.style.height = '100px';
                testContainer.style.position = 'absolute';
                testContainer.style.top = '-9999px';
                document.body.appendChild(testContainer);
                
                const testMap = L.map(testContainer).setView([0, 0], 1);
                console.log('Test map created successfully:', testMap);
                
                // Clean up
                testMap.remove();
                document.body.removeChild(testContainer);
            } catch (error) {
                console.error('Test map creation failed:', error);
            }
        }
        
        this.map = null;
        this.locations = [];
        this.markers = [];
        this.alertPolygons = []; // Array to store alert polygons
        this.currentEditingId = null;
        
        // API Configuration
        this.NWS_BASE_URL = 'https://api.weather.gov';
        this.GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json';
        this.GOOGLE_API_KEY = 'AIzaSyCLc97NiXejbt5gnpMOOECCB-cOFBE2RAE';
        // Use the current hostname for the server API to work from remote computers
        this.SERVER_API = `http://${window.location.hostname}:8000/api`;
        this.updateInterval = null;
        this.lastUpdateTime = null;
        
        // Weather Alert APIs for different countries
        this.WEATHER_APIS = {
            'us': {
                name: 'National Weather Service (US)',
                baseUrl: 'https://api.weather.gov',
                alertsEndpoint: '/alerts/active',
                zonesEndpoint: '/zones',
                supported: true
            },
            'ca': {
                name: 'Environment Canada (Canada)',
                baseUrl: 'https://dd.weather.gc.ca',
                alertsEndpoint: '/alerts/cap',
                supported: false, // Will implement fallback
                fallback: 'us' // Use US API as fallback for now
            },
            'mx': {
                name: 'CONAGUA (Mexico)',
                baseUrl: 'https://smn.conagua.gob.mx',
                alertsEndpoint: '/api/alertas',
                supported: false, // Will implement fallback
                fallback: 'us' // Use US API as fallback for now
            }
        };
        
        // Site type filters - all enabled by default
        this.siteFilters = {
            'warehouse': true,
            'plant': true,
            '3pl-warehouse': true,
            'office': true,
            'supplier': true,
            'machine-shop': true,
            'land': true,
            'parking': true
        };
        // Alert level filters - all enabled by default
        this.alertLevelFilters = {
            'warning': true,
            'watch': true,
            'advisory': true,
            'none': true
        };
        
        this.alertSeverity = {
            'warning': { level: 3, class: 'severe', color: '#dc2626' },
            'watch': { level: 2, class: 'moderate', color: '#ea580c' },
            'advisory': { level: 1, class: 'minor', color: '#ca8a04' },
            'none': { level: 0, class: 'none', color: '#16a34a' }
        };

        this.siteIcons = {
            'warehouse': 'fa-warehouse',
            'plant': 'fa-industry',
            '3pl-warehouse': 'fa-truck',
            'office': 'fa-building',
            'supplier': 'fa-boxes',
            'machine-shop': 'fa-cogs',
            'land': 'fa-map-marker-alt',
            'parking': 'fa-parking'
        };

        this.alertEventIcons = {
            'Tornado Warning': 'fa-tornado',
            'Tornado Watch': 'fa-tornado',
            'Severe Thunderstorm Warning': 'fa-bolt',
            'Severe Thunderstorm Watch': 'fa-bolt',
            'Thunderstorm Warning': 'fa-cloud-bolt',
            'Thunderstorm Watch': 'fa-cloud-bolt',
            'Flash Flood Warning': 'fa-water',
            'Flood Warning': 'fa-water',
            'Flood Watch': 'fa-water',
            'Flood Advisory': 'fa-water',
            'Extreme Wind Warning': 'fa-wind',
            'High Wind Warning': 'fa-wind',
            'High Wind Watch': 'fa-wind',
            'Wind Advisory': 'fa-wind',
            'Winter Storm Warning': 'fa-snowflake',
            'Winter Storm Watch': 'fa-snowflake',
            'Blizzard Warning': 'fa-snowflake',
            'Ice Storm Warning': 'fa-icicles',
            'Snow Squall Warning': 'fa-snowflake',
            'Winter Weather Advisory': 'fa-snowflake',
            'Heat Advisory': 'fa-temperature-high',
            'Excessive Heat Warning': 'fa-temperature-high',
            'Excessive Heat Watch': 'fa-temperature-high',
            'Freeze Warning': 'fa-temperature-low',
            'Freeze Watch': 'fa-temperature-low',
            'Frost Advisory': 'fa-temperature-low',
            'Red Flag Warning': 'fa-fire',
            'Fire Weather Watch': 'fa-fire',
            'Dense Fog Advisory': 'fa-smog',
            'Dust Storm Warning': 'fa-smog',
            'Air Quality Alert': 'fa-smog',
            'Hurricane Warning': 'fa-hurricane',
            'Hurricane Watch': 'fa-hurricane',
            'Tropical Storm Warning': 'fa-hurricane',
            'Tropical Storm Watch': 'fa-hurricane',
            'Storm Surge Warning': 'fa-water',
            'Storm Surge Watch': 'fa-water',
            'Coastal Flood Warning': 'fa-water',
            'Coastal Flood Advisory': 'fa-water',
            'Avalanche Warning': 'fa-mountain',
            'Avalanche Watch': 'fa-mountain',
            'Lake Effect Snow Warning': 'fa-water',
            'Lake Effect Snow Watch': 'fa-water',
            'Rip Current Statement': 'fa-water',
            'Special Marine Warning': 'fa-anchor',
            'Marine Weather Statement': 'fa-anchor',
            'Severe Weather Statement': 'fa-triangle-exclamation',
            'Special Weather Statement': 'fa-triangle-exclamation',
            'Child Abduction Emergency': 'fa-child',
            'Civil Danger Warning': 'fa-person-military-pointing',
            'Civil Emergency Message': 'fa-person-military-pointing',
            'Shelter In Place Warning': 'fa-house-lock',
            'Hazardous Materials Warning': 'fa-skull-crossbones',
            // fallback for any other event types
            'default': 'fa-triangle-exclamation'
        };

        this.initializeApp().catch(error => {
            console.error('Failed to initialize app:', error);
        });
    }

    // Determine the country code for a location (us, ca, mx, etc.)
    getLocationCountry(location) {
        // If the location has an explicit country property, use it
        if (location.country) {
            return location.country.toLowerCase();
        }
        // Fallback: infer from state/province or address
        const usStates = [
            'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'
        ];
        const canadianProvinces = [
            'ab', 'bc', 'mb', 'nb', 'nl', 'ns', 'nt', 'nu', 'on', 'pe', 'qc', 'sk', 'yt'
        ];
        let state = location.state ? location.state.toLowerCase() : '';
        if (!state && location.address) {
            // Try to extract state from address string
            const match = location.address.match(/,\s*([A-Za-z]{2})\s*\d{5}/);
            if (match) {
                state = match[1].toLowerCase();
            }
        }
        if (usStates.includes(state)) return 'us';
        if (canadianProvinces.includes(state)) return 'ca';
        // Default fallback
        return 'us';
    }

    async initializeApp() {
        console.log('Starting app initialization...');
        
        // Ensure the live tab is active and visible
        const liveTab = document.getElementById('liveTab');
        if (liveTab) {
            liveTab.classList.add('active');
            liveTab.style.display = 'flex';
        }
        
        console.log('Initializing map...');
        this.initializeMap();
        
        console.log('Setting up event listeners...');
        this.setupEventListeners();
        
        console.log('Initializing filters...');
        this.initializeFilters();
        
        // Load locations after map is initialized
        console.log('Loading locations...');
        await this.loadLocations();
        
        // Update display immediately after locations are loaded
        console.log('Updating display...');
        this.updateDisplay();
        this.updateLastUpdated();
        
        // Start real-time weather updates
        console.log('Starting real-time updates...');
        this.startRealTimeUpdates();
        
        console.log('App initialization complete!');
    }

    initializeFilters() {
        // Set initial checkbox states for site types
        Object.keys(this.siteFilters).forEach(siteType => {
            const checkbox = document.getElementById(`filter-${siteType}`);
            if (checkbox) {
                checkbox.checked = this.siteFilters[siteType];
                checkbox.addEventListener('change', () => {
                    this.siteFilters[siteType] = checkbox.checked;
                    this.updateDisplay();
                });
            }
        });
        
        // Set initial checkbox states for alert levels
        Object.keys(this.alertLevelFilters).forEach(level => {
            const checkbox = document.getElementById(`filter-alert-${level}`);
            if (checkbox) {
                checkbox.checked = this.alertLevelFilters[level];
                checkbox.addEventListener('change', () => {
                    this.alertLevelFilters[level] = checkbox.checked;
                    this.updateDisplay();
                });
            }
        });
    }

    setupEventListeners() {
        // Tab navigation
        this.setupTabNavigation();
        
                // Modal controls
        document.getElementById('addLocationBtn').addEventListener('click', () => this.openLocationModal());
        document.querySelector('.add-first-location').addEventListener('click', () => this.openLocationModal());
        document.getElementById('modalClose').addEventListener('click', () => {
            // For new location additions, show confirmation before closing
            if (!this.currentEditingId) {
                const shouldClose = confirm('Are you sure you want to close? Any unsaved changes will be lost.');
                if (!shouldClose) {
                    return;
                }
            }
            
            this.closeLocationModal();
        });
        
        // Map controls
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshAlerts());
        document.getElementById('legendBtn').addEventListener('click', () => this.openLegendModal());
        document.getElementById('defaultZoomBtn').addEventListener('click', () => this.setDefaultZoom());
        
        // Info modal controls
        document.getElementById('infoClose').addEventListener('click', () => {
            this.closeInfoModal();
        });
        
        document.getElementById('cancelBtn').addEventListener('click', () => {
            // For new location additions, show confirmation before closing
            if (!this.currentEditingId) {
                const shouldClose = confirm('Are you sure you want to close? Any unsaved changes will be lost.');
                if (!shouldClose) {
                    return;
                }
            }
            this.closeLocationModal();
        });
        document.getElementById('locationForm').addEventListener('submit', (e) => this.handleLocationSubmit(e));
        
        // Map controls
        document.getElementById('refreshBtn').addEventListener('click', () => {
            console.log('Manual refresh button clicked');
            this.refreshAlerts();
        });
        document.getElementById('legendBtn').addEventListener('click', () => this.openLegendModal());
        document.getElementById('legendClose').addEventListener('click', () => this.closeLegendModal());
        document.getElementById('defaultZoomBtn').addEventListener('click', () => this.setDefaultZoom());
        

        
        // Filter dropdown
        const filterBtn = document.getElementById('filterBtn');
        const filterDropdown = document.getElementById('filterDropdown');
        
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFilterDropdown();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!filterDropdown.contains(e.target) && !filterBtn.contains(e.target)) {
                this.closeFilterDropdown();
            }
        });
        
        // Filter checkboxes
        Object.keys(this.siteFilters).forEach(siteType => {
            const checkbox = document.getElementById(`filter-${siteType}`);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.toggleSiteFilter(siteType));
            }
        });
        
        // Address autocomplete
        // Address autocomplete
        this.setupAddressAutocomplete();
        
        // Coordinate validation functionality
        this.setupCoordinateValidation();
        
        // Resizer functionality
        this.setupResizer();
        
        // Close modals on overlay click with improved sensitivity
        let modalClickTimeout;
        document.getElementById('locationModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                // For new location additions, show confirmation before closing
                if (!this.currentEditingId) {
                    const shouldClose = confirm('Are you sure you want to close? Any unsaved changes will be lost.');
                    if (!shouldClose) {
                        return;
                    }
                }
                
                // Add a small delay to prevent accidental closes
                clearTimeout(modalClickTimeout);
                modalClickTimeout = setTimeout(() => {
                    this.closeLocationModal();
                }, 150);
            }
        });
        
        // Prevent modal from closing when clicking inside the modal content
        document.querySelector('#locationModal .modal').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Handle keyboard events for modal
        document.addEventListener('keydown', (e) => {
            const locationModal = document.getElementById('locationModal');
            if (locationModal.classList.contains('active')) {
                // Prevent Escape key from closing modal during form interaction
                if (e.key === 'Escape') {
                    e.preventDefault();
                    
                    // For new location additions, show confirmation before closing
                    if (!this.currentEditingId) {
                        const shouldClose = confirm('Are you sure you want to close? Any unsaved changes will be lost.');
                        if (!shouldClose) {
                            return;
                        }
                    }
                    
                    // Only allow escape to close if not actively typing in a form field
                    const activeElement = document.activeElement;
                    const isFormField = activeElement && (
                        activeElement.tagName === 'INPUT' || 
                        activeElement.tagName === 'SELECT' || 
                        activeElement.tagName === 'TEXTAREA'
                    );
                    
                    if (!isFormField) {
                        this.closeLocationModal();
                    }
                }
            }
        });
        
        document.getElementById('legendModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeLegendModal();
            }
        });
    }

    setupTabNavigation() {
        const liveTabBtn = document.getElementById('liveTabBtn');
        const infoTabBtn = document.getElementById('infoTabBtn');
        
        // Live tab button - ensure live tab is always active
        liveTabBtn.addEventListener('click', () => {
            console.log('Switching to Live Alerts tab');
                
                // Update active tab button
            liveTabBtn.classList.add('active');
            infoTabBtn.classList.remove('active');
                
            // Ensure live tab content is active
            const liveTab = document.getElementById('liveTab');
            liveTab.classList.add('active');
                
            // Initialize map for the live tab
                    this.initializeLiveMap();
            });
        
        // Info tab button - open info modal
        infoTabBtn.addEventListener('click', () => {
            console.log('Opening Info Modal');
            this.openInfoModal();
        });
    }

    initializeLiveMap() {
        if (!this.map) {
            this.initializeMap();
        } else {
            // Refresh map size when switching to live tab
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                    // Force multiple refreshes to ensure proper sizing
                    setTimeout(() => {
                        if (this.map) {
                            this.map.invalidateSize();
                        }
                    }, 50);
                    setTimeout(() => {
                        if (this.map) {
                            this.map.invalidateSize();
                        }
                    }, 150);
                }
            }, 100);
        }
        this.updateDisplay();
    }

    setupAddressAutocomplete() {
        const addressInput = document.getElementById('locationAddress');
        let autocompleteContainer = null;
        let currentSuggestions = [];
        let selectedIndex = -1;
        let debounceTimer = null;

        // Create autocomplete container
        const createAutocompleteContainer = () => {
            if (!autocompleteContainer) {
                autocompleteContainer = document.createElement('div');
                autocompleteContainer.className = 'autocomplete-container';
                autocompleteContainer.style.cssText = `
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-top: none;
                    border-radius: 0 0 4px 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    display: none;
                `;
                
                // Position the container relative to the input
                const inputContainer = addressInput.parentElement;
                inputContainer.style.position = 'relative';
                inputContainer.appendChild(autocompleteContainer);
            }
        };

        // Show suggestions with loading state support
        const showSuggestions = (suggestions) => {
            createAutocompleteContainer();
            
            if (suggestions.length === 0) {
                autocompleteContainer.style.display = 'none';
                return;
            }

            // Check for loading state
            const isLoading = suggestions.length === 1 && suggestions[0].loading;
            
            autocompleteContainer.innerHTML = suggestions.map((suggestion, index) => {
                if (suggestion.loading) {
                    return `
                        <div class="autocomplete-item loading" data-index="${index}">
                            <div class="address-name">
                                <i class="fas fa-spinner fa-spin"></i> ${suggestion.formatted_address || 'Searching...'}
                            </div>
                        </div>
                    `;
                }
                
                return `
                    <div class="autocomplete-item" data-index="${index}">
                        <div class="address-name">${suggestion.formatted_address}</div>
                        <div class="address-type">
                            ${suggestion.types ? suggestion.types[0] : 'Address'}
                        </div>
                    </div>
                `;
            }).join('');

            autocompleteContainer.style.display = 'block';
            selectedIndex = -1;
            currentSuggestions = suggestions;

            // Add click listeners to suggestions (skip loading items)
            autocompleteContainer.querySelectorAll('.autocomplete-item:not(.loading)').forEach((item, index) => {
                item.addEventListener('click', () => {
                    selectSuggestion(index);
                });
                
                item.addEventListener('mouseenter', () => {
                    selectedIndex = index;
                    updateSelection();
                });
            });
        };

        // Update selection highlighting
        const updateSelection = () => {
            autocompleteContainer.querySelectorAll('.autocomplete-item').forEach((item, index) => {
                if (index === selectedIndex) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        };

        // Select a suggestion
        const selectSuggestion = (index) => {
            if (index >= 0 && index < currentSuggestions.length) {
                const suggestion = currentSuggestions[index];
                
                // Parse the selected address into components
                const addressParts = this.parseAddressFromSuggestion(suggestion);
                
                // Populate all address fields
                addressInput.value = addressParts.street || '';
                document.getElementById('locationCity').value = addressParts.city || '';
                document.getElementById('locationState').value = addressParts.state || '';
                document.getElementById('locationZipcode').value = addressParts.zipcode || '';
                
                autocompleteContainer.style.display = 'none';
                addressInput.focus();
            }
        };

        // Fetch suggestions from geocoding API with improved performance
        const fetchSuggestions = async (query) => {
            if (query.length < 2) { // Reduced minimum length for faster response
                showSuggestions([]);
                return;
            }

            try {
                // Create multiple query variations for better results
                const queryVariations = [
                    query,
                    query.replace(/\s+/g, ' ').trim(), // Normalized
                    query.split(' ').slice(0, 3).join(' '), // First 3 words
                    query.split(' ').slice(0, 2).join(' '), // First 2 words
                ].filter((q, index, arr) => arr.indexOf(q) === index); // Remove duplicates

                // Try multiple queries in parallel for faster results
                const queryPromises = queryVariations.map(async (queryVar) => {
                    if (!this.GOOGLE_API_KEY) {
                        console.log('Google API key not available for autocomplete');
                        return [];
                    }
                    
                    const params = new URLSearchParams({
                        address: queryVar,
                        key: this.GOOGLE_API_KEY,
                        region: 'us' // Bias towards US results
                    });

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

                    try {
                        console.log('Fetching Google autocomplete for:', queryVar);
                        const response = await fetch(`${this.GEOCODING_API}?${params.toString()}`, {
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.status === 'OK' && data.results) {
                                console.log(`Google autocomplete results for "${queryVar}":`, data.results.length);
                                return data.results;
                            } else {
                                console.log(`Google autocomplete failed for "${queryVar}":`, data.status);
                                
                                // If Google API fails, try OpenStreetMap fallback
                                if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') {
                                    console.log('Trying OpenStreetMap fallback for autocomplete...');
                                    return await this.fetchOpenStreetMapSuggestions(queryVar);
                                }
                                
                                return [];
                            }
                        }
                        console.log(`Google autocomplete failed for "${queryVar}":`, response.status);
                        return [];
                    } catch (error) {
                        clearTimeout(timeoutId);
                        if (error.name === 'AbortError') {
                            console.log(`Query "${queryVar}" timed out`);
                        } else {
                            console.log(`Google autocomplete error for "${queryVar}":`, error);
                        }
                        return [];
                    }
                });

                // Wait for all queries to complete
                const results = await Promise.allSettled(queryPromises);
                
                // Combine and deduplicate results
                let allSuggestions = [];
                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        allSuggestions = allSuggestions.concat(result.value);
                    }
                });

                // Remove duplicates based on formatted_address and place_id
                const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
                    index === self.findIndex(s => 
                        s.formatted_address === suggestion.formatted_address || 
                        s.place_id === suggestion.place_id
                    )
                );

                // Filter for US addresses (Google already biases towards US with region parameter)
                const usSuggestions = uniqueSuggestions.filter(suggestion => {
                    const formattedAddress = suggestion.formatted_address.toLowerCase();
                    const usIndicators = [
                        'united states', 'usa', 'us', 'u.s.', 'u.s.a.',
                        'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming'
                    ];
                    
                    return usIndicators.some(indicator => formattedAddress.includes(indicator));
                });

                // Sort by relevance (exact matches first, then by importance)
                const sortedSuggestions = usSuggestions.sort((a, b) => {
                    const aName = a.formatted_address.toLowerCase();
                    const bName = b.formatted_address.toLowerCase();
                    const queryLower = query.toLowerCase();
                    
                    // Exact matches first
                    const aExact = aName.includes(queryLower);
                    const bExact = bName.includes(queryLower);
                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                    
                    // Then by importance (cities/states before specific addresses)
                    const aImportance = this.getSuggestionImportance(a);
                    const bImportance = this.getSuggestionImportance(b);
                    return bImportance - aImportance;
                });

                // Limit to 6 suggestions for better UX
                showSuggestions(sortedSuggestions.slice(0, 6));
                
            } catch (error) {
                console.log('Error fetching suggestions:', error);
                
                // Show error state briefly, then clear
                showSuggestions([{
                    formatted_address: 'No results found',
                    types: ['error'],
                    error: true
                }]);
                
                // Clear error after 2 seconds
                setTimeout(() => {
                    if (currentSuggestions.length === 1 && currentSuggestions[0].error) {
                        showSuggestions([]);
                    }
                }, 2000);
            }
        };

        // Input event handler with improved debouncing
        addressInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            console.log('Address input changed:', query);
            
            // Clear previous timer
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            
            // Show loading state for better UX
            if (query.length >= 2) {
                showSuggestions([{
                    formatted_address: 'Searching...',
                    types: ['loading'],
                    loading: true
                }]);
            }
            
            // Set new timer for debouncing with reduced delay
            debounceTimer = setTimeout(() => {
                if (query.length >= 2) {
                    console.log('Fetching suggestions for:', query);
                    fetchSuggestions(query);
                } else {
                    showSuggestions([]);
                }
            }, 300); // Slightly increased delay for better performance
        });

        // Keyboard navigation
        addressInput.addEventListener('keydown', (e) => {
            if (!autocompleteContainer || autocompleteContainer.style.display === 'none') {
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
                    updateSelection();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    updateSelection();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0) {
                        selectSuggestion(selectedIndex);
                    }
                    break;
                case 'Escape':
                    autocompleteContainer.style.display = 'none';
                    selectedIndex = -1;
                    break;
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!addressInput.contains(e.target) && !autocompleteContainer?.contains(e.target)) {
                if (autocompleteContainer) {
                    autocompleteContainer.style.display = 'none';
                }
            }
        });

        // Hide suggestions when input loses focus
        addressInput.addEventListener('blur', () => {
            // Small delay to allow clicking on suggestions
            setTimeout(() => {
                if (autocompleteContainer) {
                    autocompleteContainer.style.display = 'none';
                }
            }, 150);
        });
    }

    // Helper function to determine suggestion importance for sorting
    getSuggestionImportance(suggestion) {
        let importance = 0;
        
        // Higher importance for cities and states
        if (suggestion.types && (suggestion.types.includes('locality') || suggestion.types.includes('administrative_area_level_1'))) {
            importance += 10;
        }
        
        // Higher importance for exact matches
        if (suggestion.formatted_address && suggestion.formatted_address.includes(',')) {
            importance += 5;
        }
        
        // Higher importance for postal codes
        if (suggestion.formatted_address && /\d{5}/.test(suggestion.formatted_address)) {
            importance += 3;
        }
        
        // Lower importance for very specific addresses
        if (suggestion.types && (suggestion.types.includes('street_address') || suggestion.types.includes('premise'))) {
            importance -= 5;
        }
        
        return importance;
    }

    initializeMap() {
        console.log('Initializing map...');
        
        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found!');
            return;
        }
        
        console.log('Map container found:', mapContainer);
        console.log('Map container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
        
        try {
            console.log('Creating map...');
            this.map = L.map('map', {
                zoomControl: false // Disable default zoom controls
            }).setView([39.8283, -98.5795], 4);
            
            // Apply the default zoom (continental US view) after map creation
            setTimeout(() => {
                this.setDefaultZoom();
            }, 100);
            console.log('Map created successfully');
            console.log('Map object:', this.map);
            console.log('Map container after creation:', document.getElementById('map'));
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: ' OpenStreetMap contributors'
            }).addTo(this.map);
            
            console.log('Tile layer added');
            
            // Force map to resize after a short delay to ensure proper rendering
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                    console.log('Map invalidated size');
                    
                    // Add a test marker to verify map is working
                    const testMarker = L.marker([39.8283, -98.5795]).addTo(this.map);
                    testMarker.bindPopup('Test marker - map is working!');
                    console.log('Test marker added to verify map functionality');
                }
            }, 100);
            
            // Add weather overlay
            this.addWeatherOverlay();
            
            // Setup custom zoom controls
            this.setupZoomControls();
            
            console.log('Map initialization complete');
            
        } catch (error) {
            console.error('Map initialization failed:', error);
        }
    }

    addWeatherOverlay() {
        // In a real implementation, this would connect to NWS weather alerts API
        // For demo purposes, we'll add some sample weather alert areas
        const alertAreas = [
            {
                bounds: [[40.7128, -74.0060], [40.7829, -73.9260]], // NYC area
                severity: 'warning',
                type: 'Severe Thunderstorm Warning'
            },
            {
                bounds: [[34.0522, -118.2437], [34.1522, -118.1437]], // LA area
                severity: 'watch',
                type: 'Heat Advisory'
            },
            {
                bounds: [[41.8781, -87.6298], [41.9781, -87.5298]], // Chicago area
                severity: 'advisory',
                type: 'Wind Advisory'
            }
        ];

        alertAreas.forEach(area => {
            const color = this.alertSeverity[area.severity].color;
            L.rectangle(area.bounds, {
                color: color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.2
            }).addTo(this.map).bindPopup(`
                <div class="weather-alert-popup">
                    <strong>${area.type}</strong><br>
                    <span class="popup-alert ${this.alertSeverity[area.severity].class}">
                        ${area.severity.toUpperCase()}
                    </span>
                </div>
            `);
        });
    }

    setupZoomControls() {
        // Add event listeners for custom zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            if (this.map) {
                this.map.zoomIn();
            }
        });
        
        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            if (this.map) {
                this.map.zoomOut();
            }
        });
    }

    setDefaultZoom() {
        if (this.map) {
            // Set the map to show the continental US from Florida to California
            // Using bounds that cover from Florida to California, zoomed in 40% more
            const bounds = [
                [24.396308, -125.000000], // Southwest (includes California)
                [49.384358, -66.934570]   // Northeast (includes Florida)
            ];
            
            // Calculate center point
            const centerLat = (bounds[0][0] + bounds[1][0]) / 2;
            const centerLng = (bounds[0][1] + bounds[1][1]) / 2;
            
            // Calculate bounds size and reduce by 40% to zoom in 40% more
            const latSpan = bounds[1][0] - bounds[0][0];
            const lngSpan = bounds[1][1] - bounds[0][1];
            const reductionFactor = 0.6; // 40% reduction = 60% of original size
            
            const newLatSpan = latSpan * reductionFactor;
            const newLngSpan = lngSpan * reductionFactor;
            
            const newBounds = [
                [centerLat - newLatSpan/2, centerLng - newLngSpan/2], // Southwest
                [centerLat + newLatSpan/2, centerLng + newLngSpan/2]  // Northeast
            ];
            
            this.map.fitBounds(newBounds, { 
                padding: [20, 20],
                animate: true,
                duration: 1.0
            });
            console.log('Default zoom applied - continental US view (Florida to California) zoomed in 40%');
        }
    }

    async loadLocations() {
        console.log('=== loadLocations called ===');
        try {
            // Fetch locations from server
            const response = await fetch(`${this.SERVER_API}/locations`);
            if (response.ok) {
                this.locations = await response.json();
                console.log(`Loaded ${this.locations.length} locations from server`);
                console.log('First location:', this.locations[0]);
                

            } else {
                console.error('Failed to load locations from server');
                this.locations = [];
            }
        } catch (error) {
            console.error('Error loading locations:', error);
            this.locations = [];
        }
        
        // Fetch real weather data for all locations
        await this.refreshAlerts();
    }

    async saveLocations() {
        try {
            // Update all locations on server
            const response = await fetch(`${this.SERVER_API}/locations/bulk`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.locations)
            });
            
            if (!response.ok) {
                console.error('Failed to save locations to server');
            }
        } catch (error) {
            console.error('Error saving locations:', error);
        }
    }

    openLocationModal(locationId = null) {
        this.currentEditingId = locationId;
        const modal = document.getElementById('locationModal');
        const form = document.getElementById('locationForm');
        const title = document.getElementById('modalTitle');
        
        if (locationId) {
            const location = this.locations.find(loc => loc.id === locationId);
            title.textContent = 'Edit Location';
            document.getElementById('locationNickname').value = location.nickname;
            
            // Handle separated address fields for editing
            if (location.streetAddress && location.city && location.state && location.zipcode) {
                // Use separated fields if available
                document.getElementById('locationAddress').value = location.streetAddress;
                document.getElementById('locationCity').value = location.city;
                document.getElementById('locationState').value = location.state;
                document.getElementById('locationZipcode').value = location.zipcode;
            } else {
                // Fallback to parsing the full address
                const addressParts = this.parseAddress(location.address);
                document.getElementById('locationAddress').value = addressParts.street || '';
                document.getElementById('locationCity').value = addressParts.city || '';
                document.getElementById('locationState').value = addressParts.state || '';
                document.getElementById('locationZipcode').value = addressParts.zipcode || '';
            }
            
            // Handle coordinates if available
            if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
                document.getElementById('coordinatesInput').value = `${location.coordinates[0]}, ${location.coordinates[1]}`;
            }
            
            document.getElementById('siteType').value = location.siteType;
            document.getElementById('contactName').value = location.contactName || '';
            document.getElementById('contactTitle').value = location.contactTitle || '';
            document.getElementById('contactPhone').value = location.contactPhone || '';
            document.getElementById('contactEmail').value = location.contactEmail || '';
        } else {
            title.textContent = 'Add New Location';
            form.reset();
            
            // Reset coordinate toggle
            const coordinateToggle = document.getElementById('useCoordinatesToggle');
            const coordinatesGroup = document.getElementById('coordinatesGroup');
            const addressInput = document.getElementById('locationAddress');
            const cityInput = document.getElementById('locationCity');
            const stateInput = document.getElementById('locationState');
            const zipcodeInput = document.getElementById('locationZipcode');
            
            if (coordinateToggle && coordinatesGroup && addressInput) {
                coordinateToggle.checked = false;
                coordinatesGroup.style.display = 'none';
                addressInput.required = true;
                addressInput.disabled = false;
                addressInput.placeholder = 'e.g., 123 Main Street';
                cityInput.required = true;
                cityInput.disabled = false;
                cityInput.placeholder = 'e.g., Salt Lake City';
                stateInput.required = true;
                stateInput.disabled = false;
                stateInput.placeholder = 'e.g., UT';
                zipcodeInput.required = true;
                zipcodeInput.disabled = false;
                zipcodeInput.placeholder = 'e.g., 84101';
            }
        }
        
        modal.classList.add('active');
        
        // Focus on the first input field
        setTimeout(() => {
            document.getElementById('locationNickname').focus();
        }, 100);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    closeLocationModal() {
        document.getElementById('locationModal').classList.remove('active');
        this.currentEditingId = null;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Clear any pending timeouts
        if (window.modalClickTimeout) {
            clearTimeout(window.modalClickTimeout);
        }
    }

    openLegendModal() {
        document.getElementById('legendModal').classList.add('active');
    }

    closeLegendModal() {
        document.getElementById('legendModal').classList.remove('active');
    }
    
    openInfoModal() {
        document.getElementById('infoModal').classList.add('active');
    }
    
    closeInfoModal() {
        document.getElementById('infoModal').classList.remove('active');
    }

    async handleLocationSubmit(e) {
        e.preventDefault();
        
                            // Get address components
        const streetAddress = document.getElementById('locationAddress').value;
        const city = document.getElementById('locationCity').value;
        const state = document.getElementById('locationState').value;
        const zipcode = document.getElementById('locationZipcode').value;
        
        // Combine address components
        const fullAddress = `${streetAddress}, ${city}, ${state} ${zipcode}`;
        
        const formData = {
            nickname: document.getElementById('locationNickname').value,
            address: fullAddress,
            streetAddress: streetAddress,
            city: city,
            state: state,
            zipcode: zipcode,
            siteType: document.getElementById('siteType').value,
            contactName: document.getElementById('contactName').value,
            contactTitle: document.getElementById('contactTitle').value,
            contactPhone: document.getElementById('contactPhone').value,
            contactEmail: document.getElementById('contactEmail').value
        };
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Geocoding...';
        submitBtn.disabled = true;
        
        try {
            // Check if coordinates are provided
            const coordinatesInput = document.getElementById('coordinatesInput');
            const coordinatesText = coordinatesInput.value.trim();
            let coordinates;
            
            if (coordinatesText) {
                // Parse coordinates from the combined input
                const coordinateMatch = coordinatesText.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
                if (coordinateMatch) {
                    const lat = parseFloat(coordinateMatch[1]);
                    const lng = parseFloat(coordinateMatch[2]);
                    
                    if (isNaN(lat) || isNaN(lng)) {
                        throw new Error('Please enter valid latitude and longitude coordinates');
                    }
                    
                    if (lat < -90 || lat > 90) {
                        throw new Error('Latitude must be between -90 and 90 degrees');
                    }
                    
                    if (lng < -180 || lng > 180) {
                        throw new Error('Longitude must be between -180 and 180 degrees');
                    }
                    
                    coordinates = [lat, lng];
                    console.log('Using coordinates from input field:', coordinates);
                } else {
                    throw new Error('Please enter coordinates in the format "latitude, longitude" (e.g., 40.7128, -74.0060)');
                }
            } else {
                // Geocode the address
                coordinates = await this.geocodeAddress(formData.address);
            }
            
            if (this.currentEditingId) {
                // Update existing location
                const index = this.locations.findIndex(loc => loc.id === this.currentEditingId);
                const updatedLocation = {
                    ...this.locations[index],
                    ...formData,
                    coordinates
                };
                
                // Update on server
                const response = await fetch(`${this.SERVER_API}/locations/${this.currentEditingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedLocation)
                });
                
                if (response.ok) {
                    this.locations[index] = updatedLocation;
                }
            } else {
                // Add new location
                const newLocation = {
                    ...formData,
                    coordinates,
                    currentAlert: 'none' // Will be updated with real data
                };
                
                // Add to server
                const response = await fetch(`${this.SERVER_API}/locations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newLocation)
                });
                
                if (response.ok) {
                    const savedLocation = await response.json();
                    this.locations.push(savedLocation);
                }
            }
            
            this.updateDisplay();
            
            // Fetch real weather data for the new location
            const locationToUpdate = this.currentEditingId ? 
                this.locations.find(loc => loc.id === this.currentEditingId) : 
                this.locations[this.locations.length - 1];
            await this.fetchWeatherDataForLocation(locationToUpdate);
            
            // Show success message and reset form for next location
            if (this.currentEditingId) {
                // Editing existing location - close modal
                this.closeLocationModal();
                this.showSuccessMessage('Location updated successfully!');
            } else {
                // Adding new location - keep modal open and reset form
                this.resetLocationForm();
                this.showSuccessMessage('Location added successfully! The form has been reset for your next location. Click "Save Location" to add another location or "Cancel" to close.');
                
                // Update modal title to indicate multiple locations can be added
                const title = document.getElementById('modalTitle');
                title.textContent = 'Add Another Location';
            }
            
        } catch (error) {
            console.error('Error adding location:', error);
            
            // Show more detailed error message
            const errorMessage = error.message || 'Unknown error occurred';
            const shouldRetry = confirm(`Geocoding failed: ${errorMessage}\n\nWould you like to:\n1. Try again with a different address\n2. Add location manually with coordinates\n3. Cancel`);
            
            if (shouldRetry) {
                // Clear the address fields and let user try again
                document.getElementById('locationAddress').value = '';
                document.getElementById('locationCity').value = '';
                document.getElementById('locationState').value = '';
                document.getElementById('locationZipcode').value = '';
                document.getElementById('coordinatesInput').value = '';
                document.getElementById('locationAddress').focus();
            } else {
                // User chose to cancel - close the modal
                this.closeLocationModal();
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // Enhanced geocoding method using OpenStreetMap Nominatim with multiple fallback strategies
    async geocodeAddress(address) {
        console.log('Geocoding address:', address);
        
        // Check if input is already coordinates
        const coordinateMatch = address.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
        if (coordinateMatch) {
            const lat = parseFloat(coordinateMatch[1]);
            const lng = parseFloat(coordinateMatch[2]);
            
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                console.log('Input is valid coordinates:', [lat, lng]);
                return [lat, lng];
            } else {
                throw new Error('Invalid coordinate format. Please use format: latitude, longitude');
            }
        }
        
        // Normalize the address first
        const normalizedAddress = this.normalizeAddress(address);
        console.log('Normalized address:', normalizedAddress);
        
        // Strategy 1: For Canadian addresses, try multiple Canadian-specific approaches first
        if (this.isCanadianAddress(normalizedAddress)) {
            console.log('Canadian address detected, trying Canadian-specific strategies...');
            
            // Try multiple specific Canadian queries
            const canadianQueries = this.createMultipleCanadianQueries(normalizedAddress);
            
            for (const query of canadianQueries) {
                try {
                    console.log('Trying Canadian query:', query);
                    const result = await this.tryGeocodingWithValidation(query, 'ca');
                    console.log('Geocoding successful with Canadian query:', result);
                    return result;
                } catch (error) {
                    console.log(`Canadian query "${query}" failed, trying next...`);
                }
            }
        }
        
        // Strategy 2: For Canadian addresses, try with different geocoding parameters
        if (this.isCanadianAddress(normalizedAddress)) {
            try {
                console.log('Trying Canadian geocoding with different parameters...');
                const result = await this.tryCanadianGeocoding(normalizedAddress);
                console.log('Canadian geocoding successful:', result);
                return result;
            } catch (error) {
                console.log('Canadian geocoding with different parameters failed');
            }
        }
        
        // Strategy 3: Try with detected country code for non-Canadian addresses
        try {
            let countryCodes = 'us'; // Default to US
            
            if (this.isMexicanAddress(normalizedAddress)) {
                countryCodes = 'mx';
            } else if (this.isCanadianAddress(normalizedAddress)) {
                countryCodes = 'ca';
                console.log('Canadian address detected, using CA country code');
            } else if (this.isUSAddress(normalizedAddress)) {
                countryCodes = 'us';
                console.log('US address detected, using US country code');
            } else if (this.isEuropeanAddress(normalizedAddress)) {
                // For European addresses, try without country restriction first
                console.log('European address detected, trying without country restriction first...');
                const result = await this.tryGeocoding(normalizedAddress, '');
                console.log('Geocoding successful for European address:', result);
                return result;
            }
            
            console.log(`Trying geocoding with country code: ${countryCodes}`);
            const result = await this.tryGeocoding(normalizedAddress, countryCodes);
            console.log('Geocoding successful with country code:', result);
            return result;
        } catch (error) {
            console.log('Country-specific geocoding failed, trying fallback to OpenStreetMap...');
            
            // Fallback to OpenStreetMap Nominatim if Google API fails
            try {
                console.log('Trying OpenStreetMap fallback...');
                const result = await this.tryGeocodingWithOpenStreetMap(normalizedAddress, countryCodes);
                console.log('OpenStreetMap geocoding successful:', result);
                return result;
            } catch (fallbackError) {
                console.log('OpenStreetMap fallback also failed:', fallbackError);
                
                // Provide helpful error message about Google Maps API setup
                if (error.message && error.message.includes('not authorized')) {
                    throw new Error(`Geocoding failed: ${error.message}\n\nTo fix this issue:\n1. Go to https://console.cloud.google.com/\n2. Select your project\n3. Go to "APIs & Services" > "Library"\n4. Search for "Geocoding API" and enable it\n5. Go to "APIs & Services" > "Credentials"\n6. Make sure your API key has access to the Geocoding API`);
                }
                
                throw new Error(`Geocoding failed for "${address}". Please check your internet connection and try again. Error: ${error.message}`);
            }
        }
        
        // Strategy 3.5: For US addresses, try with different formatting
        if (this.isUSAddress(normalizedAddress)) {
            try {
                // Try with "United States" explicitly added
                const usQuery = normalizedAddress.includes('United States') ? 
                    normalizedAddress : 
                    `${normalizedAddress}, United States`;
                console.log('Trying US geocoding with explicit United States:', usQuery);
                const result = await this.tryGeocoding(usQuery, 'us');
                console.log('Geocoding successful with explicit United States:', result);
                return result;
            } catch (error) {
                console.log('US geocoding with explicit United States failed');
            }
            
            // Try with "USA" added
            try {
                const usaQuery = `${normalizedAddress}, USA`;
                console.log('Trying US geocoding with USA:', usaQuery);
                const result = await this.tryGeocoding(usaQuery, 'us');
                console.log('Geocoding successful with USA:', result);
                return result;
            } catch (error) {
                console.log('US geocoding with USA failed');
            }
            
            // Try without country restriction for better results
            try {
                console.log('Trying US geocoding without country restriction:', normalizedAddress);
                const result = await this.tryGeocoding(normalizedAddress, '');
                console.log('Geocoding successful without country restriction:', result);
                return result;
            } catch (error) {
                console.log('US geocoding without country restriction failed');
            }
        }
        
        // Strategy 2: For Canadian addresses, try with "Canada" explicitly added
        if (this.isCanadianAddress(normalizedAddress)) {
            try {
                const canadianQuery = normalizedAddress.includes('Canada') ? 
                    normalizedAddress : 
                    `${normalizedAddress}, Canada`;
                console.log('Trying Canadian geocoding with explicit Canada:', canadianQuery);
                const result = await this.tryGeocoding(canadianQuery, 'ca');
                console.log('Geocoding successful with explicit Canada:', result);
                return result;
            } catch (error) {
                console.log('Canadian geocoding with explicit Canada failed');
            }
        }
        
        // Strategy 3: Try without country restrictions
        try {
            console.log('Trying geocoding without country restrictions');
            const result = await this.tryGeocoding(normalizedAddress, '');
            console.log('Geocoding successful without country restrictions:', result);
            return result;
        } catch (error) {
            console.log('Unrestricted geocoding failed, trying simplified query...');
        }
        
        // Strategy 4: Try with simplified query (city, state/country)
        try {
            const simplifiedQuery = this.simplifyAddress(normalizedAddress);
            console.log('Trying simplified query:', simplifiedQuery);
            const result = await this.tryGeocoding(simplifiedQuery, '');
            console.log('Geocoding successful with simplified query:', result);
            return result;
        } catch (error) {
            console.log('Simplified query failed, trying city-only...');
        }
        
        // Strategy 5: For Canadian addresses, try city with "Canada" explicitly
        if (this.isCanadianAddress(normalizedAddress)) {
            try {
                const cityOnly = this.extractCity(normalizedAddress);
                if (cityOnly && cityOnly !== normalizedAddress) {
                    const canadianCityQuery = `${cityOnly}, Canada`;
                    console.log('Trying Canadian city-only query:', canadianCityQuery);
                    const result = await this.tryGeocoding(canadianCityQuery, 'ca');
                    console.log('Geocoding successful with Canadian city query:', result);
                    return result;
                }
            } catch (error) {
                console.log('Canadian city-only query failed');
            }
        }
        
        // Strategy 6: Try with just the city name
        try {
            const cityOnly = this.extractCity(normalizedAddress);
            if (cityOnly && cityOnly !== normalizedAddress) {
                console.log('Trying city-only query:', cityOnly);
                const result = await this.tryGeocoding(cityOnly, '');
                console.log('Geocoding successful with city-only query:', result);
                return result;
            }
        } catch (error) {
            console.log('City-only query failed');
        }
        
        // Strategy 7: Try with postal code if available
        try {
            const postalCode = this.extractPostalCode(normalizedAddress);
            if (postalCode) {
                console.log('Trying postal code query:', postalCode);
                const result = await this.tryGeocoding(postalCode, '');
                console.log('Geocoding successful with postal code:', result);
                return result;
            }
        } catch (error) {
            console.log('Postal code query failed');
        }
        
        // Strategy 8: Try with manual address variations
        try {
            const variations = this.generateAddressVariations(normalizedAddress);
            for (const variation of variations) {
                try {
                    console.log('Trying address variation:', variation);
                    const result = await this.tryGeocoding(variation, '');
                    console.log('Geocoding successful with variation:', result);
                    return result;
                } catch (error) {
                    console.log('Variation failed:', variation);
                }
            }
        } catch (error) {
            console.log('All variations failed');
        }
        
        // Strategy 8.5: For US addresses, try with common abbreviations and variations
        if (this.isUSAddress(normalizedAddress)) {
            try {
                const usVariations = this.generateUSAddressVariations(normalizedAddress);
                for (const variation of usVariations) {
                    try {
                        console.log('Trying US address variation:', variation);
                        const result = await this.tryGeocoding(variation, 'us');
                        console.log('Geocoding successful with US variation:', result);
                        return result;
                    } catch (error) {
                        console.log('US variation failed:', variation);
                    }
                }
            } catch (error) {
                console.log('All US variations failed');
            }
        }
        
        // Strategy 9: For Canadian addresses, try manual coordinate lookup
        if (this.isCanadianAddress(normalizedAddress)) {
            try {
                const manualCoords = this.getManualCanadianCoordinates(normalizedAddress);
                if (manualCoords) {
                    console.log('Using manual Canadian coordinates:', manualCoords);
                    return manualCoords;
                }
            } catch (error) {
                console.log('Manual coordinate lookup failed');
            }
        }
        
        // All strategies failed
        console.error('All geocoding strategies failed for address:', address);
        throw new Error(`Unable to geocode "${address}". Please try:\n1. A different address format\n2. Using coordinates (latitude, longitude)\n3. Checking the spelling\n4. Using a nearby city name`);
    }
    
    // Setup coordinate input validation
    setupCoordinateValidation() {
        const coordinatesInput = document.getElementById('coordinatesInput');
        
        if (coordinatesInput) {
            // Add validation for coordinate input
            coordinatesInput.addEventListener('input', () => {
                const value = coordinatesInput.value.trim();
                if (value) {
                    const coordinateMatch = value.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
                    if (coordinateMatch) {
                        const lat = parseFloat(coordinateMatch[1]);
                        const lng = parseFloat(coordinateMatch[2]);
                        
                        if (isNaN(lat) || isNaN(lng)) {
                            coordinatesInput.setCustomValidity('Please enter valid numbers');
                        } else if (lat < -90 || lat > 90) {
                            coordinatesInput.setCustomValidity('Latitude must be between -90 and 90 degrees');
                        } else if (lng < -180 || lng > 180) {
                            coordinatesInput.setCustomValidity('Longitude must be between -180 and 180 degrees');
                        } else {
                            coordinatesInput.setCustomValidity('');
                        }
                    } else {
                        coordinatesInput.setCustomValidity('Please use format "latitude, longitude" (e.g., 40.7128, -74.0060)');
                    }
                } else {
                    coordinatesInput.setCustomValidity('');
                }
            });
        }
    }
    
    // Helper method to try geocoding with Google's API
    async tryGeocoding(query, countryCodes) {
        if (!this.GOOGLE_API_KEY) {
            throw new Error('Google API key is required. Please add your Google Maps API key to the GOOGLE_API_KEY variable.');
        }
        
        const params = new URLSearchParams({
            address: query,
            key: this.GOOGLE_API_KEY
        });
        
        // Add region biasing for better results
        if (countryCodes === 'us') {
            params.append('region', 'us');
        } else if (countryCodes === 'ca') {
            params.append('region', 'ca');
        } else if (countryCodes === 'mx') {
            params.append('region', 'mx');
        }
        
        const url = `${this.GEOCODING_API}?${params.toString()}`;
        console.log('Google Geocoding URL:', url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
            const response = await fetch(url, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                console.error(`Google Geocoding API error: ${response.status} - ${response.statusText}`);
                throw new Error(`Google Geocoding API error: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Google Geocoding response:', data);
            
            if (data.status !== 'OK') {
                console.error(`Google Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
                
                // If the API key is not authorized, provide helpful error message
                if (data.status === 'REQUEST_DENIED' && data.error_message && data.error_message.includes('not authorized')) {
                    throw new Error('Google Maps API key is not authorized. Please enable the Geocoding API in your Google Cloud Console and ensure your API key has the necessary permissions.');
                }
                
                throw new Error(`Google Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
            }
            
            if (!data.results || data.results.length === 0) {
                console.error('No geocoding results found for query:', query);
                throw new Error(`No results found for "${query}". Please try a different address format.`);
            }
            
            // Get the first (most relevant) result
            const result = data.results[0];
            const location = result.geometry.location;
            
            if (!location || !location.lat || !location.lng) {
                throw new Error('Invalid coordinates in Google geocoding response');
            }
            
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lng);
            
            if (isNaN(lat) || isNaN(lng)) {
                throw new Error('Invalid coordinate values');
            }
            
            // Log the formatted address for verification
            console.log('Google Geocoding result:', {
                formatted_address: result.formatted_address,
                coordinates: [lat, lng]
            });
            
            return [lat, lng];
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Fallback method using OpenStreetMap Nominatim
    async tryGeocodingWithOpenStreetMap(query, countryCodes) {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '5'
        });
        
        if (countryCodes) {
            params.append('countrycodes', countryCodes);
        }
        
        // Add address details for better parsing
        params.append('addressdetails', '1');
        
        const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
        console.log('OpenStreetMap Geocoding URL:', url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
            const response = await fetch(url, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                console.error(`OpenStreetMap Geocoding API error: ${response.status} - ${response.statusText}`);
                throw new Error(`OpenStreetMap Geocoding API error: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('OpenStreetMap Geocoding response:', data);
            
            if (!data || data.length === 0) {
                console.error('No OpenStreetMap geocoding results found for query:', query);
                throw new Error(`No results found for "${query}". Please try a different address format.`);
            }
            
            // Try to find the best match
            let bestResult = data[0];
            
            // For US addresses, prioritize results with street numbers
            if (countryCodes === 'us' || !countryCodes) {
                for (const result of data) {
                    if (result.address && result.address.house_number) {
                        bestResult = result;
                        break;
                    }
                }
            }
            
            if (!bestResult.lat || !bestResult.lon) {
                throw new Error('Invalid coordinates in OpenStreetMap geocoding response');
            }
            
            // For Canadian addresses, verify the result is actually in Canada
            if (countryCodes === 'ca' && bestResult.address) {
                const country = bestResult.address.country;
                if (country && country.toLowerCase() !== 'canada') {
                    console.warn(`OpenStreetMap geocoding returned non-Canadian result: ${country}`);
                    throw new Error('OpenStreetMap geocoding returned non-Canadian result');
                }
            }
            
            const lat = parseFloat(bestResult.lat);
            const lon = parseFloat(bestResult.lon);
            
            if (isNaN(lat) || isNaN(lon)) {
                throw new Error('Invalid coordinate values');
            }
            
            console.log('OpenStreetMap Geocoding result:', {
                display_name: bestResult.display_name,
                coordinates: [lat, lon]
            });
            
            return [lat, lon];
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Fallback method for autocomplete using OpenStreetMap
    async fetchOpenStreetMapSuggestions(query) {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '10',
            addressdetails: '1',
            countrycodes: 'us'
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            console.log('Fetching OpenStreetMap autocomplete for:', query);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`OpenStreetMap autocomplete results for "${query}":`, data.length);
                
                // Convert OpenStreetMap format to Google-like format for consistency
                return data.map(item => ({
                    formatted_address: item.display_name,
                    place_id: item.place_id,
                    types: [item.type],
                    geometry: {
                        location: {
                            lat: parseFloat(item.lat),
                            lng: parseFloat(item.lon)
                        }
                    }
                }));
            }
            console.log(`OpenStreetMap autocomplete failed for "${query}":`, response.status);
            return [];
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.log(`OpenStreetMap query "${query}" timed out`);
            } else {
                console.log(`OpenStreetMap autocomplete error for "${query}":`, error);
            }
            return [];
        }
    }
    
    // Helper method to create multiple Canadian-specific queries
    createMultipleCanadianQueries(address) {
        const queries = [];
        const parts = address.split(',').map(part => part.trim());
        
        if (parts.length >= 3) {
            // Extract city and province from "525 Boundary Rd, Cornwall, ON K6H 6K8, Canada"
            const city = parts[1];
            const provinceZip = parts[2];
            
            // Extract province and postal code from "ON K6H 6K8, Canada"
            const provinceMatch = provinceZip.match(/([A-Z]{2})\s+([A-Z]\d[A-Z]\s*\d[A-Z]\d)/i);
            if (provinceMatch) {
                const province = provinceMatch[1];
                const postalCode = provinceMatch[2];
                
                // Query 1: City, Province, Canada (most specific)
                queries.push(`${city}, ${province}, Canada`);
                
                // Query 2: City, Province
                queries.push(`${city}, ${province}`);
                
                // Query 3: City, postal code, Canada
                queries.push(`${city} ${postalCode}, Canada`);
                
                // Query 4: City, postal code
                queries.push(`${city} ${postalCode}`);
                
                // Query 5: Province, postal code, Canada
                queries.push(`${province} ${postalCode}, Canada`);
                
                // Query 6: Province, postal code
                queries.push(`${province} ${postalCode}`);
                
                // Query 7: Just city with Canada
                queries.push(`${city}, Canada`);
                
                // Query 8: Just city
                queries.push(city);
                
                // Query 9: Just postal code with Canada
                queries.push(`${postalCode}, Canada`);
                
                // Query 10: Just postal code
                queries.push(postalCode);
            }
        }
        
        // If no specific queries created, add fallback
        if (queries.length === 0) {
            queries.push(address.includes('Canada') ? address : `${address}, Canada`);
        }
        
        return queries;
    }
    
    // Helper method to create city-province query for Canadian addresses
    createCityProvinceQuery(address) {
        const parts = address.split(',').map(part => part.trim());
        
        if (parts.length >= 2) {
            const city = parts[1];
            const provinceZip = parts[2];
            
            // Extract province from "ON K6H 6K8, Canada"
            const provinceMatch = provinceZip.match(/([A-Z]{2})\s+([A-Z]\d[A-Z]\s*\d[A-Z]\d)/i);
            if (provinceMatch) {
                const province = provinceMatch[1];
                return `${city}, ${province}`;
            }
        }
        
        return null;
    }
    
    // Helper method to try geocoding with strict Canadian validation
    async tryGeocodingWithValidation(query, countryCodes) {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '10' // Get more results to find Canadian ones
        });
        
        if (countryCodes) {
            params.append('countrycodes', countryCodes);
        }
        
        // For Canadian addresses, add additional parameters
        if (countryCodes === 'ca' || query.toLowerCase().includes('canada')) {
            params.append('addressdetails', '1');
            params.append('extratags', '1');
        }
        
        const url = `${this.GEOCODING_API}/search?${params.toString()}`;
        console.log('Geocoding URL with validation:', url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Geocoding response with validation:', data);
        
        if (!data || data.length === 0) {
            throw new Error('Address not found - no results returned');
        }
        
        // For Canadian addresses, find the first result that's actually in Canada
        if (countryCodes === 'ca') {
            console.log('Checking results for Canadian location...');
            for (const result of data) {
                console.log('Checking result:', result.display_name);
                if (result.address && result.address.country) {
                    const country = result.address.country.toLowerCase();
                    console.log('Country found:', country);
                    if (country === 'canada') {
                        console.log('Found Canadian result:', result.display_name);
                        const lat = parseFloat(result.lat);
                        const lon = parseFloat(result.lon);
                        
                        if (!isNaN(lat) && !isNaN(lon)) {
                            return [lat, lon];
                        }
                    }
                }
            }
            
            // If no Canadian result found, throw error
            console.log('No Canadian results found in response');
            throw new Error('No Canadian results found in geocoding response');
        }
        
        // For non-Canadian addresses, use first result
        const result = data[0];
        if (!result.lat || !result.lon) {
            throw new Error('Invalid coordinates in geocoding response');
        }
        
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        if (isNaN(lat) || isNaN(lon)) {
            throw new Error('Invalid coordinate values');
        }
        
        return [lat, lon];
    }
    
    // Helper method to try Canadian geocoding with different approach
    async tryCanadianGeocoding(address) {
        // Extract city and province from the address
        const parts = address.split(',').map(part => part.trim());
        let city = '';
        let province = '';
        
        if (parts.length >= 2) {
            city = parts[1];
            const provinceZip = parts[2];
            const provinceMatch = provinceZip.match(/([A-Z]{2})\s+([A-Z]\d[A-Z]\s*\d[A-Z]\d)/i);
            if (provinceMatch) {
                province = provinceMatch[1];
            }
        }
        
        // Try different Canadian-specific queries
        const queries = [
            `${city}, ${province}, Canada`,
            `${city}, ${province}`,
            `${city}, Canada`,
            `${province}, Canada`,
            city
        ].filter(q => q && q !== '');
        
        for (const query of queries) {
            try {
                console.log(`Trying Canadian query: "${query}"`);
                
                // Use a different approach - search with viewbox to focus on Canada
                const params = new URLSearchParams({
                    q: query,
                    format: 'json',
                    limit: '5',
                    countrycodes: 'ca',
                    addressdetails: '1',
                    extratags: '1',
                    // Add viewbox to focus on Canada (roughly)
                    viewbox: '-141.0,41.7,-52.0,83.3'
                });
                
                const url = `${this.GEOCODING_API}/search?${params.toString()}`;
                console.log('Canadian geocoding URL:', url);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(url, {
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`Canadian geocoding failed: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Canadian geocoding response:', data);
                
                if (data && data.length > 0) {
                    // Find first result that's actually in Canada
                    for (const result of data) {
                        if (result.address && result.address.country) {
                            const country = result.address.country.toLowerCase();
                            console.log('Country found:', country);
                            if (country === 'canada') {
                                console.log('Found Canadian result:', result.display_name);
                                const lat = parseFloat(result.lat);
                                const lon = parseFloat(result.lon);
                                
                                if (!isNaN(lat) && !isNaN(lon)) {
                                    return [lat, lon];
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(`Canadian query "${query}" failed:`, error.message);
            }
        }
        
        throw new Error('No Canadian results found with any query');
    }
    
    // Helper method to get manual coordinates for Canadian cities
    getManualCanadianCoordinates(address) {
        const addressLower = address.toLowerCase();
        
        // Manual coordinates for major Canadian cities
        const canadianCities = {
            'cornwall': [45.0189, -74.7281], // Cornwall, Ontario
            'toronto': [43.6532, -79.3832], // Toronto, Ontario
            'montreal': [45.5017, -73.5673], // Montreal, Quebec
            'vancouver': [49.2827, -123.1207], // Vancouver, British Columbia
            'calgary': [51.0447, -114.0719], // Calgary, Alberta
            'edmonton': [53.5461, -113.4938], // Edmonton, Alberta
            'ottawa': [45.4215, -75.6972], // Ottawa, Ontario
            'winnipeg': [49.8951, -97.1384], // Winnipeg, Manitoba
            'halifax': [44.6488, -63.5752], // Halifax, Nova Scotia
            'victoria': [48.4284, -123.3656], // Victoria, British Columbia
            'saskatoon': [52.1332, -106.6700], // Saskatoon, Saskatchewan
            'regina': [50.4452, -104.6189], // Regina, Saskatchewan
            'quebec': [46.8139, -71.2080], // Quebec City, Quebec
            'mississauga': [43.5890, -79.6441], // Mississauga, Ontario
            'brampton': [43.6832, -79.7629], // Brampton, Ontario
            'hamilton': [43.2557, -79.8711], // Hamilton, Ontario
            'london': [42.9849, -81.2453], // London, Ontario
            'kitchener': [43.4516, -80.4925], // Kitchener, Ontario
            'windsor': [42.3149, -83.0364], // Windsor, Ontario
            'oakville': [43.4675, -79.6877], // Oakville, Ontario
            'burlington': [43.3255, -79.7990], // Burlington, Ontario
            'richmond hill': [43.8828, -79.4403], // Richmond Hill, Ontario
            'markham': [43.8561, -79.3370], // Markham, Ontario
            'vaughan': [43.8361, -79.4989], // Vaughan, Ontario
            'scarborough': [43.7764, -79.2318], // Scarborough, Ontario
            'etobicoke': [43.6205, -79.5132], // Etobicoke, Ontario
            'north york': [43.7615, -79.4111], // North York, Ontario
            'ajax': [43.8509, -79.0205], // Ajax, Ontario
            'pickering': [43.8384, -79.0868], // Pickering, Ontario
            'oshawa': [43.8971, -78.8658], // Oshawa, Ontario
            'whitby': [43.8975, -78.9428], // Whitby, Ontario
            'barrie': [44.3894, -79.6903], // Barrie, Ontario
            'kingston': [44.2312, -76.4860], // Kingston, Ontario
            'guelph': [43.5448, -80.2482], // Guelph, Ontario
            'cambridge': [43.3616, -80.3144], // Cambridge, Ontario
            'waterloo': [43.4643, -80.5204], // Waterloo, Ontario
            'st. catharines': [43.1594, -79.2469], // St. Catharines, Ontario
            'niagara falls': [43.0962, -79.0377], // Niagara Falls, Ontario
            'brantford': [43.1394, -80.2644], // Brantford, Ontario
            'peterborough': [44.3091, -78.3197], // Peterborough, Ontario
            'belleville': [44.1628, -77.3834], // Belleville, Ontario
            'sarnia': [42.9749, -82.4066], // Sarnia, Ontario
            'sault ste. marie': [46.5218, -84.3461], // Sault Ste. Marie, Ontario
            'thunder bay': [48.3809, -89.2477], // Thunder Bay, Ontario
            'sudbury': [46.4917, -80.9930], // Sudbury, Ontario
            'north bay': [46.3091, -79.4608], // North Bay, Ontario
            'timmins': [48.4758, -81.3305], // Timmins, Ontario
            'sherbrooke': [45.4000, -71.8997], // Sherbrooke, Quebec
            'trois-rivieres': [46.3508, -72.5477], // Trois-Rivières, Quebec
            'saguenay': [48.4284, -71.0534], // Saguenay, Quebec
            'laval': [45.5697, -73.7244], // Laval, Quebec
            'gatineau': [45.4765, -75.7013], // Gatineau, Quebec
            'longueuil': [45.5367, -73.5107], // Longueuil, Quebec
            'surrey': [49.1913, -122.8490], // Surrey, British Columbia
            'burnaby': [49.2488, -122.9805], // Burnaby, British Columbia
            'richmond': [49.1666, -123.1336], // Richmond, British Columbia
            'abbotsford': [49.0504, -122.3045], // Abbotsford, British Columbia
            'coquitlam': [49.2838, -122.7932], // Coquitlam, British Columbia
            'kelowna': [49.8877, -119.4965], // Kelowna, British Columbia
            'nanaimo': [49.1659, -123.9401], // Nanaimo, British Columbia
            'kamloops': [50.6745, -120.3273], // Kamloops, British Columbia
            'prince george': [53.9171, -122.7497], // Prince George, British Columbia
            'red deer': [52.2696, -113.8117], // Red Deer, Alberta
            'lethbridge': [49.6935, -112.8418], // Lethbridge, Alberta
            'medicine hat': [50.0421, -110.7192], // Medicine Hat, Alberta
            'grande prairie': [55.1699, -118.7979], // Grande Prairie, Alberta
            'saskatoon': [52.1332, -106.6700], // Saskatoon, Saskatchewan (duplicate, but keeping for clarity)
            'regina': [50.4452, -104.6189], // Regina, Saskatchewan (duplicate, but keeping for clarity)
            'prince albert': [53.2001, -105.7677], // Prince Albert, Saskatchewan
            'moose jaw': [50.4005, -105.5505], // Moose Jaw, Saskatchewan
            'brandon': [49.8469, -99.9530], // Brandon, Manitoba
            'thompson': [55.7433, -97.8551], // Thompson, Manitoba
            'st. john\'s': [47.5615, -52.7126], // St. John's, Newfoundland and Labrador
            'mount pearl': [47.5183, -52.8084], // Mount Pearl, Newfoundland and Labrador
            'corner brook': [48.9500, -57.9333], // Corner Brook, Newfoundland and Labrador
            'grand falls-windsor': [48.9333, -55.6500], // Grand Falls-Windsor, Newfoundland and Labrador
            'charlottetown': [46.2382, -63.1311], // Charlottetown, Prince Edward Island
            'summerside': [46.3959, -63.7876], // Summerside, Prince Edward Island
            'moncton': [46.0878, -64.7782], // Moncton, New Brunswick
            'saint john': [45.2733, -66.0633], // Saint John, New Brunswick
            'fredericton': [45.9636, -66.6431], // Fredericton, New Brunswick
            'bathurst': [47.6181, -65.6511], // Bathurst, New Brunswick
            'miramichi': [47.0285, -65.5018], // Miramichi, New Brunswick
            'sydney': [46.1368, -60.1942], // Sydney, Nova Scotia
            'dartmouth': [44.6659, -63.5674], // Dartmouth, Nova Scotia
            'saint john': [45.2733, -66.0633], // Saint John, New Brunswick (duplicate, but keeping for clarity)
            'fredericton': [45.9636, -66.6431], // Fredericton, New Brunswick (duplicate, but keeping for clarity)
            'whitehorse': [60.7212, -135.0568], // Whitehorse, Yukon
            'yellowknife': [62.4540, -114.3718], // Yellowknife, Northwest Territories
            'iqaluit': [63.7467, -68.5170] // Iqaluit, Nunavut
        };
        
        // Extract city name from address
        const parts = address.split(',').map(part => part.trim());
        let cityName = '';
        
        if (parts.length >= 2) {
            cityName = parts[1].toLowerCase();
        }
        
        // Check if we have coordinates for this city
        for (const [city, coords] of Object.entries(canadianCities)) {
            if (cityName.includes(city) || city.includes(cityName)) {
                console.log(`Found manual coordinates for ${city}:`, coords);
                return coords;
            }
        }
        
        return null;
    }
    
    // Helper method to simplify address for better geocoding
    simplifyAddress(address) {
        const parts = address.split(',').map(part => part.trim()).filter(part => part);
        
        // If we have multiple parts, try with just the last two (usually city, state/country)
        if (parts.length >= 2) {
            return parts.slice(-2).join(', ');
        }
        
        return address;
    }
    
    // Helper method to extract city from address
    extractCity(address) {
        const parts = address.split(',').map(part => part.trim()).filter(part => part);
        
        // Try to find the city part (usually the first part that's not a number)
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            // Skip if it looks like a street number or postal code
            if (!/^\d+$/.test(part) && !/^\d{5}(-\d{4})?$/.test(part)) {
                return part;
            }
        }
        
        // If no clear city found, return the first part
        return parts[0] || address;
    }
    
    // Helper method to extract postal code from address
    extractPostalCode(address) {
        // US postal code pattern
        const usPostalCode = /\b\d{5}(-\d{4})?\b/;
        const usMatch = address.match(usPostalCode);
        if (usMatch) {
            return usMatch[0];
        }
        
        // Mexican postal code pattern
        const mexicanPostalCode = /\b\d{5}\b/;
        const mexicanMatch = address.match(mexicanPostalCode);
        if (mexicanMatch) {
            return mexicanMatch[0];
        }
        
        // Canadian postal code pattern (A1A 1A1 format) - more flexible
        const canadianPostalCode = /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i;
        const canadianMatch = address.match(canadianPostalCode);
        if (canadianMatch) {
            return canadianMatch[0];
        }
        
        // Alternative Canadian postal code pattern (more flexible)
        const canadianPostalCodeAlt = /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/i;
        const canadianMatchAlt = address.match(canadianPostalCodeAlt);
        if (canadianMatchAlt) {
            return canadianMatchAlt[0];
        }
        
        // UK postal code pattern
        const ukPostalCode = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i;
        const ukMatch = address.match(ukPostalCode);
        if (ukMatch) {
            return ukMatch[0];
        }
        
        // European postal code patterns (basic)
        const europeanPostalCodes = [
            /\b\d{5}\b/, // Germany, France, Italy, Spain
            /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i // Netherlands
        ];
        
        for (const pattern of europeanPostalCodes) {
            const match = address.match(pattern);
            if (match) {
                return match[0];
            }
        }
        
        return null;
    }
    
    // Helper method to clean and normalize address for better geocoding
    normalizeAddress(address) {
        // Remove extra whitespace and normalize
        let normalized = address.trim().replace(/\s+/g, ' ');
        
        // Fix common formatting issues
        // Add space between street name and city when missing
        normalized = normalized.replace(/([a-zA-Z])([A-Z][a-z]+,\s*[A-Z]{2})/g, '$1, $2');
        
        // Fix missing spaces after street types
        const streetTypes = ['Way', 'Street', 'Avenue', 'Boulevard', 'Road', 'Rd', 'Drive', 'Lane', 'Court', 'Place', 'Circle', 'Terrace', 'Trail'];
        for (const streetType of streetTypes) {
            const regex = new RegExp(`(${streetType})([A-Z][a-z]+)`, 'g');
            normalized = normalized.replace(regex, `$1, $2`);
        }
        
        // Remove common abbreviations that might confuse geocoding
        const abbreviations = {
            'st.': 'street',
            'ave.': 'avenue',
            'blvd.': 'boulevard',
            'rd.': 'road',
            'dr.': 'drive',
            'ln.': 'lane',
            'ct.': 'court',
            'pl.': 'place',
            'cir.': 'circle',
            'apt.': 'apartment',
            'ste.': 'suite',
            'fl.': 'floor'
        };
        
        for (const [abbr, full] of Object.entries(abbreviations)) {
            const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
            normalized = normalized.replace(regex, full);
        }
        
        // Ensure proper comma separation for US addresses
        normalized = normalized.replace(/([a-zA-Z])\s+([A-Z]{2}\s+\d{5})/g, '$1, $2');
        
        // Ensure proper comma separation for Canadian addresses
        normalized = normalized.replace(/([a-zA-Z])\s+([A-Z]\d[A-Z]\s*\d[A-Z]\d)/gi, '$1, $2');
        
        // Fix Canadian address format: "525 Boundary RdCornwall, ON K6H 6K8, Canada"
        normalized = normalized.replace(/([A-Z][a-z]+)([A-Z][a-z]+,\s*[A-Z]{2}\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d)/g, '$1, $2');
        
        return normalized;
    }
    
    // Helper method to generate address variations for better geocoding
    generateAddressVariations(address) {
        const variations = [];
        
        // Parse the address components
        const parts = address.split(',').map(part => part.trim());
        
        if (parts.length >= 3) {
            // Full address: "1 Duro Way, Walton, KY 41094" or "525 Boundary Road, Cornwall, Canada K6h 5R6"
            const street = parts[0];
            const city = parts[1];
            const stateZip = parts[2];
            
            // Check for US format (state + zip)
            const stateZipMatch = stateZip.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
            if (stateZipMatch) {
                const state = stateZipMatch[1];
                const zip = stateZipMatch[2];
                
                // Variation 1: City, State
                variations.push(`${city}, ${state}`);
                
                // Variation 2: City, State Zip
                variations.push(`${city}, ${state} ${zip}`);
                
                // Variation 3: Street, City, State
                variations.push(`${street}, ${city}, ${state}`);
                
                // Variation 4: Just city and zip
                variations.push(`${city} ${zip}`);
                
                // Variation 5: Just state and zip
                variations.push(`${state} ${zip}`);
            }
            
            // Check for Canadian format (country + postal code)
            const canadianMatch = stateZip.match(/(Canada|canada)\s+([A-Z]\d[A-Z]\s*\d[A-Z]\d)/i);
            if (canadianMatch) {
                const postalCode = canadianMatch[2];
                
                // Variation 1: City, Canada
                variations.push(`${city}, Canada`);
                
                // Variation 2: City, postal code
                variations.push(`${city} ${postalCode}`);
                
                // Variation 3: Street, City, Canada
                variations.push(`${street}, ${city}, Canada`);
                
                // Variation 4: Just city
                variations.push(city);
                
                // Variation 5: Just postal code
                variations.push(postalCode);
            }
            
            // Check for Canadian format with province (ON K6H 6K8, Canada)
            const canadianProvinceMatch = stateZip.match(/([A-Z]{2})\s+([A-Z]\d[A-Z]\s*\d[A-Z]\d),\s*(Canada|canada)/i);
            if (canadianProvinceMatch) {
                const province = canadianProvinceMatch[1];
                const postalCode = canadianProvinceMatch[2];
                
                // Variation 1: City, Province, Canada (prioritize Canadian location)
                variations.push(`${city}, ${province}, Canada`);
                
                // Variation 2: City, Province
                variations.push(`${city}, ${province}`);
                
                // Variation 3: City, postal code, Canada
                variations.push(`${city} ${postalCode}, Canada`);
                
                // Variation 4: City, postal code
                variations.push(`${city} ${postalCode}`);
                
                // Variation 5: Province, postal code, Canada
                variations.push(`${province} ${postalCode}, Canada`);
                
                // Variation 6: Province, postal code
                variations.push(`${province} ${postalCode}`);
                
                // Variation 7: Just city with Canada
                variations.push(`${city}, Canada`);
                
                // Variation 8: Just city
                variations.push(city);
                
                // Variation 9: Just postal code with Canada
                variations.push(`${postalCode}, Canada`);
                
                // Variation 10: Just postal code
                variations.push(postalCode);
            }
        } else if (parts.length === 2) {
            // Two-part address: "Walton, KY 41094" or "Cornwall, Canada K6h 5R6"
            const firstPart = parts[0];
            const secondPart = parts[1];
            
            // Check if second part has US state and zip
            const stateZipMatch = secondPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
            if (stateZipMatch) {
                const state = stateZipMatch[1];
                const zip = stateZipMatch[2];
                
                variations.push(`${firstPart}, ${state}`);
                variations.push(`${firstPart} ${zip}`);
                variations.push(`${state} ${zip}`);
            }
            
            // Check if second part has Canadian country and postal code
            const canadianMatch = secondPart.match(/(Canada|canada)\s+([A-Z]\d[A-Z]\s*\d[A-Z]\d)/i);
            if (canadianMatch) {
                const postalCode = canadianMatch[2];
                
                variations.push(`${firstPart}, Canada`);
                variations.push(`${firstPart} ${postalCode}`);
                variations.push(postalCode);
            }
        }
        
        // Add the original address as the first variation
        variations.unshift(address);
        
        // Remove duplicates
        return [...new Set(variations)];
    }
    
    // Helper method to generate US-specific address variations
    generateUSAddressVariations(address) {
        const variations = [];
        
        // Remove extra spaces and normalize
        const normalized = address.replace(/\s+/g, ' ').trim();
        variations.push(normalized);
        
        // Try with "United States" added
        if (!normalized.includes('United States')) {
            variations.push(`${normalized}, United States`);
        }
        
        // Try with "USA" added
        if (!normalized.includes('USA')) {
            variations.push(`${normalized}, USA`);
        }
        
        // Try with "US" added
        if (!normalized.includes('US')) {
            variations.push(`${normalized}, US`);
        }
        
        // Try with expanded state names
        const stateExpansions = {
            'MA': 'Massachusetts',
            'NY': 'New York',
            'CA': 'California',
            'TX': 'Texas',
            'FL': 'Florida',
            'IL': 'Illinois',
            'PA': 'Pennsylvania',
            'OH': 'Ohio',
            'GA': 'Georgia',
            'NC': 'North Carolina',
            'MI': 'Michigan',
            'NJ': 'New Jersey',
            'VA': 'Virginia',
            'WA': 'Washington',
            'AZ': 'Arizona',
            'IN': 'Indiana',
            'TN': 'Tennessee',
            'MO': 'Missouri',
            'MD': 'Maryland',
            'CO': 'Colorado',
            'MN': 'Minnesota',
            'WI': 'Wisconsin',
            'AL': 'Alabama',
            'SC': 'South Carolina',
            'LA': 'Louisiana',
            'KY': 'Kentucky',
            'OR': 'Oregon',
            'OK': 'Oklahoma',
            'CT': 'Connecticut',
            'IA': 'Iowa',
            'UT': 'Utah',
            'NV': 'Nevada',
            'AR': 'Arkansas',
            'MS': 'Mississippi',
            'KS': 'Kansas',
            'NM': 'New Mexico',
            'NE': 'Nebraska',
            'ID': 'Idaho',
            'WV': 'West Virginia',
            'HI': 'Hawaii',
            'NH': 'New Hampshire',
            'ME': 'Maine',
            'RI': 'Rhode Island',
            'MT': 'Montana',
            'DE': 'Delaware',
            'SD': 'South Dakota',
            'ND': 'North Dakota',
            'AK': 'Alaska',
            'VT': 'Vermont',
            'DC': 'District of Columbia',
            'WY': 'Wyoming'
        };
        
        for (const [abbr, full] of Object.entries(stateExpansions)) {
            if (normalized.includes(abbr)) {
                const expanded = normalized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
                variations.push(expanded);
                break; // Only expand the first state abbreviation found
            }
        }
        
        // Try with different road type variations
        const roadVariations = [
            ['Road', 'Rd'],
            ['Street', 'St'],
            ['Avenue', 'Ave'],
            ['Drive', 'Dr'],
            ['Boulevard', 'Blvd'],
            ['Lane', 'Ln'],
            ['Court', 'Ct'],
            ['Place', 'Pl'],
            ['Circle', 'Cir'],
            ['Way', 'Way'],
            ['Terrace', 'Ter'],
            ['Highway', 'Hwy'],
            ['Freeway', 'Fwy'],
            ['Expressway', 'Expy']
        ];
        
        for (const [full, abbr] of roadVariations) {
            if (normalized.includes(full)) {
                variations.push(normalized.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbr));
            }
        }
        
        // Try with different number formats
        const numberMatch = normalized.match(/^(\d+)\s+/);
        if (numberMatch) {
            const number = numberMatch[1];
            const withoutNumber = normalized.replace(/^\d+\s+/, '');
            variations.push(withoutNumber);
            variations.push(`${number} ${withoutNumber}`);
        }
        
        return variations.filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates
    }
    
    // Helper method to extract state from address
    getStateFromAddress(address) {
        const addressLower = address.toLowerCase();
        
        // US state abbreviations to avoid false positives
        const usStateAbbreviations = [
            'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'
        ];
        
        // US state full names
        const usStateNames = [
            'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming'
        ];
        
        // Canadian provinces and territories (full names and abbreviations)
        const canadianProvinces = [
            'alberta', 'ab', 'british columbia', 'bc', 'manitoba', 'mb', 'new brunswick', 'nb',
            'newfoundland and labrador', 'nl', 'nova scotia', 'ns', 'ontario', 'on', 'prince edward island', 'pe',
            'quebec', 'qc', 'saskatchewan', 'sk', 'northwest territories', 'nt', 'nunavut', 'nu', 'yukon', 'yt'
        ];
        
        // Check for US state abbreviations with word boundaries
        const hasUSStateAbbreviation = usStateAbbreviations.some(state => {
            const regex = new RegExp(`\\b${state}\\b`, 'i');
            return regex.test(address);
        });
        
        // Check for US state full names
        const hasUSStateName = usStateNames.some(state => 
            addressLower.includes(state)
        );
        
        // Check for Canadian provinces
        const hasCanadianProvince = canadianProvinces.some(province => {
            if (province.length === 2) {
                // For two-letter abbreviations, check for word boundaries to avoid US state conflicts
                const regex = new RegExp(`\\b${province}\\b`, 'i');
                return regex.test(address);
            } else {
                // For full names, use simple inclusion
                return addressLower.includes(province);
            }
        });
        
        // Return the first matching state or province
        if (hasUSStateAbbreviation) {
            return usStateAbbreviations.find(state => addressLower.includes(state));
        } else if (hasUSStateName) {
            return usStateNames.find(state => addressLower.includes(state));
        } else if (hasCanadianProvince) {
            return canadianProvinces.find(province => addressLower.includes(province));
        }
        
        return null;
    }

    // Enhanced method to detect address country/region for better geocoding
    isMexicanAddress(address) {
        const addressLower = address.toLowerCase();
        
        // Mexican state names (more specific to avoid conflicts with US states)
        const mexicanStates = [
            'aguascalientes', 'baja california', 'baja california sur', 'campeche', 'chiapas',
            'chihuahua', 'coahuila', 'colima', 'durango', 'estado de mexico', 'guanajuato',
            'guerrero', 'hidalgo', 'jalisco', 'michoacan', 'morelos', 'nayarit', 'nuevo leon',
            'oaxaca', 'puebla', 'queretaro', 'quintana roo', 'san luis potosi', 'sinaloa',
            'sonora', 'tabasco', 'tamaulipas', 'tlaxcala', 'veracruz', 'yucatan', 'zacatecas'
        ];
        
        // Mexican postal code pattern (5 digits) - but be more specific
        const mexicanPostalCode = /\b\d{5}\b/;
        
        // Mexican address indicators (more specific)
        const mexicanIndicators = [
            'mexico', 'mex', 'cdmx', 'ciudad de mexico', 'df', 'distrito federal',
            'calle', 'avenida', 'blvd', 'boulevard', 'colonia', 'delegacion'
        ];
        
        // US state names to avoid false positives
        const usStates = [
            'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
            'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
            'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
            'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
            'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
            'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
            'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
            'wisconsin', 'wyoming'
        ];
        
        // Check for Mexican indicators
        const hasMexicanIndicators = mexicanIndicators.some(indicator => 
            addressLower.includes(indicator)
        );
        
        // Check for Mexican states (but not US states)
        const hasMexicanState = mexicanStates.some(state => 
            addressLower.includes(state)
        ) && !usStates.some(state => 
            addressLower.includes(state)
        );
        
        // Check for Mexican postal code (but be more careful)
        const hasMexicanPostalCode = mexicanPostalCode.test(address) && 
            (addressLower.includes('mexico') || addressLower.includes('mx'));
        
        return hasMexicanIndicators || hasMexicanState || hasMexicanPostalCode;
    }
    
    // Helper method to detect Canadian addresses
    isCanadianAddress(address) {
        const addressLower = address.toLowerCase();
        
        // US state abbreviations to avoid false positives
        const usStateAbbreviations = [
            'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'
        ];
        
        // Canadian provinces and territories (full names and abbreviations)
        const canadianProvinces = [
            'alberta', 'ab', 'british columbia', 'bc', 'manitoba', 'mb', 'new brunswick', 'nb',
            'newfoundland and labrador', 'nl', 'nova scotia', 'ns', 'ontario', 'on', 'prince edward island', 'pe',
            'quebec', 'qc', 'saskatchewan', 'sk', 'northwest territories', 'nt', 'nunavut', 'nu', 'yukon', 'yt'
        ];
        
        // Canadian postal code pattern (A1A 1A1 format)
        const canadianPostalCode = /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i;
        
        // Canadian address indicators (major cities and explicit Canada references)
        const canadianIndicators = [
            'canada', 'can', 'ontario', 'quebec', 'british columbia', 'alberta',
            'cornwall', 'toronto', 'montreal', 'vancouver', 'calgary', 'edmonton',
            'ottawa', 'winnipeg', 'halifax', 'victoria', 'saskatoon', 'regina'
        ];
        
        // Check for explicit Canadian indicators first
        const hasCanadianIndicators = canadianIndicators.some(indicator => 
            addressLower.includes(indicator)
        );
        
        if (hasCanadianIndicators) {
            return true;
        }
        
        // Check for Canadian postal code
        const hasCanadianPostalCode = canadianPostalCode.test(address);
        if (hasCanadianPostalCode) {
            return true;
        }
        
        // Check for Canadian provinces, but be more careful about abbreviations
        const hasCanadianProvince = canadianProvinces.some(province => {
            if (province.length === 2) {
                // For two-letter abbreviations, check for word boundaries to avoid US state conflicts
                const regex = new RegExp(`\\b${province}\\b`, 'i');
                return regex.test(address);
            } else {
                // For full names, use simple inclusion
                return addressLower.includes(province);
            }
        });
        
        return hasCanadianProvince;
    }
    
    // Helper method to detect US addresses
    isUSAddress(address) {
        const addressLower = address.toLowerCase();
        
        // US state abbreviations
        const usStateAbbreviations = [
            'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'
        ];
        
        // US state full names
        const usStateNames = [
            'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming'
        ];
        
        // US postal code pattern (5 digits, optionally followed by -4 digits)
        const usPostalCode = /\b\d{5}(?:-\d{4})?\b/;
        
        // Check for US state abbreviations with word boundaries
        const hasUSStateAbbreviation = usStateAbbreviations.some(state => {
            const regex = new RegExp(`\\b${state}\\b`, 'i');
            return regex.test(address);
        });
        
        // Check for US state full names
        const hasUSStateName = usStateNames.some(state => 
            addressLower.includes(state)
        );
        
        // Check for US postal code
        const hasUSPostalCode = usPostalCode.test(address);
        
        return hasUSStateAbbreviation || hasUSStateName || hasUSPostalCode;
    }
    
    // Helper method to detect European addresses
    isEuropeanAddress(address) {
        const addressLower = address.toLowerCase();
        
        // European countries (major ones)
        const europeanCountries = [
            'germany', 'de', 'france', 'fr', 'italy', 'it', 'spain', 'es', 'united kingdom', 'uk', 'england',
            'netherlands', 'nl', 'belgium', 'be', 'switzerland', 'ch', 'austria', 'at', 'sweden', 'se',
            'norway', 'no', 'denmark', 'dk', 'finland', 'fi', 'poland', 'pl', 'czech republic', 'cz',
            'portugal', 'pt', 'greece', 'gr', 'hungary', 'hu', 'ireland', 'ie', 'romania', 'ro'
        ];
        
        // European postal code patterns (basic)
        const europeanPostalCodes = [
            /\b\d{5}\b/, // Germany, France, Italy, Spain
            /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i // Netherlands
        ];
        
        const hasEuropeanCountry = europeanCountries.some(country => 
            addressLower.includes(country)
        );
        
        const hasEuropeanPostalCode = europeanPostalCodes.some(pattern => 
            pattern.test(address)
        );
        
        return hasEuropeanCountry || hasEuropeanPostalCode;
    }
    

    
    // Fetch weather data from appropriate weather API based on location country
    async fetchWeatherDataForLocation(location) {
        console.log(`=== Starting weather data fetch for ${location.nickname} ===`);
        
        // Determine the country for this location
        const countryCode = this.getLocationCountry(location);
        console.log(`Location ${location.nickname} detected as country: ${countryCode}`);
        
        // Get the appropriate weather API for this country
        const weatherApi = this.WEATHER_APIS[countryCode];
        if (!weatherApi) {
            console.warn(`No weather API configured for country: ${countryCode}`);
            location.currentAlert = 'none';
            return null;
        }
        
        try {
            if (countryCode === 'us') {
                return await this.fetchUSWeatherData(location);
            } else if (countryCode === 'ca') {
                return await this.fetchCanadianWeatherData(location);
            } else if (countryCode === 'mx') {
                return await this.fetchMexicanWeatherData(location);
            } else {
                console.warn(`Unsupported country: ${countryCode}`);
                location.currentAlert = 'none';
                return null;
            }
        } catch (error) {
            console.error(`Error fetching weather data for ${location.nickname}:`, error);
            location.currentAlert = 'none';
            return null;
        }
    }

    async fetchUSWeatherData(location) {
        console.log(`Fetching US weather data for ${location.nickname}`);
        try {
            const [lat, lng] = location.coordinates;
            
            // Round coordinates to 2 decimal places to avoid precision issues
            const roundedLat = Math.round(lat * 100) / 100;
            const roundedLng = Math.round(lng * 100) / 100;
            
            // Get the weather station for this location
            const pointsResponse = await fetch(`${this.NWS_BASE_URL}/points/${roundedLat},${roundedLng}`, {
                redirect: 'follow'
            });
            
            if (!pointsResponse.ok) {
                throw new Error(`Failed to get weather station: ${pointsResponse.status}`);
            }
            
            const pointsData = await pointsResponse.json();
            
            // Get current weather conditions
            let currentConditions = null;
            try {
                const conditionsResponse = await fetch(`${this.NWS_BASE_URL}/gridpoints/${pointsData.properties.gridId}/${pointsData.properties.gridX},${pointsData.properties.gridY}/forecast`);
                if (conditionsResponse.ok) {
                    currentConditions = await conditionsResponse.json();
                }
            } catch (e) {
                console.warn('Failed to get current conditions:', e);
            }
            
            // Get alerts for this location - try multiple approaches
            let alertsData = null;
            
            console.log(`Fetching alerts for ${location.nickname} at ${lat},${lng}`);
            console.log('Points data properties:', pointsData.properties);
            console.log(`Forecast zone: ${pointsData.properties.forecastZone}`);
            console.log(`County: ${pointsData.properties.county}`);
            console.log(`State: ${pointsData.properties.state}`);
            
            // First try with forecast zone
            if (pointsData.properties.forecastZone) {
                try {
                    // Extract zone ID from the full URL
                    const forecastZoneId = pointsData.properties.forecastZone.split('/').pop();
                    const alertsUrl = `${this.NWS_BASE_URL}/alerts/active?zone=${forecastZoneId}`;
                    console.log(`Trying forecast zone alerts: ${alertsUrl}`);
                    const alertsResponse = await fetch(alertsUrl, {
                        redirect: 'follow'
                    });
                    if (alertsResponse.ok) {
                        alertsData = await alertsResponse.json();
                        console.log(`Got ${alertsData.features?.length || 0} alerts from forecast zone`);
                        if (alertsData.features && alertsData.features.length > 0) {
                            console.log('Alert types found:', alertsData.features.map(a => a.properties.event));
                        }
                    } else {
                        console.warn(`Forecast zone alerts failed: ${alertsResponse.status}`);
                    }
                } catch (e) {
                    console.warn('Failed to get alerts with forecast zone, trying county...', e);
                }
            }
            
            // If that fails, try with county
            if (!alertsData && pointsData.properties.county) {
                try {
                    // Extract county ID from the full URL
                    const countyId = pointsData.properties.county.split('/').pop();
                    const alertsUrl = `${this.NWS_BASE_URL}/alerts/active?zone=${countyId}`;
                    console.log(`Trying county alerts: ${alertsUrl}`);
                    const alertsResponse = await fetch(alertsUrl, {
                        redirect: 'follow'
                    });
                    if (alertsResponse.ok) {
                        alertsData = await alertsResponse.json();
                        console.log(`Got ${alertsData.features?.length || 0} alerts from county`);
                    } else {
                        console.warn(`County alerts failed: ${alertsResponse.status}`);
                    }
                } catch (e) {
                    console.warn('Failed to get alerts with county, trying state...', e);
                }
            }
            
            // If that fails, try with state
            if (!alertsData && pointsData.properties.relativeLocation && pointsData.properties.relativeLocation.properties.state) {
                try {
                    const stateCode = pointsData.properties.relativeLocation.properties.state;
                    const alertsUrl = `${this.NWS_BASE_URL}/alerts/active?area=${stateCode}`;
                    console.log(`Trying state alerts: ${alertsUrl}`);
                    const alertsResponse = await fetch(alertsUrl, {
                        redirect: 'follow'
                    });
                    if (alertsResponse.ok) {
                        alertsData = await alertsResponse.json();
                        console.log(`Got ${alertsData.features?.length || 0} alerts from state`);
                    } else {
                        console.warn(`State alerts failed: ${alertsResponse.status}`);
                    }
                } catch (e) {
                    console.warn('Failed to get alerts with state', e);
                }
            }
            
            if (!alertsData) {
                console.log(`No alerts found for ${location.nickname}`);
            }
            
            // Determine the highest severity alert for this location
let relevantAlerts = [];
if (alertsData && alertsData.features && alertsData.features.length > 0) {
    console.log(`Found ${alertsData.features.length} alerts for ${location.nickname}:`, alertsData.features.map(a => a.properties.event));
    console.log('Full alerts data:', alertsData.features.map(a => a.properties.event));
    // Find alerts that affect this location
    relevantAlerts = alertsData.features.filter(alert => {
        // ... (existing filtering logic)
        return true;
    });
}

            let highestSeverity = 'none';
            let alertDescription = '';
            
            if (alertsData && alertsData.features && alertsData.features.length > 0) {
                console.log(`Found ${alertsData.features.length} alerts for ${location.nickname}:`, alertsData.features.map(a => a.properties.event));
                console.log('Full alerts data:', alertsData.features.map(a => ({
                    event: a.properties.event,
                    headline: a.properties.headline,
                    areaDesc: a.properties.areaDesc,
                    urgency: a.properties.urgency,
                    severity: a.properties.severity,
                    hasGeometry: !!a.geometry
                })));
                
                            // Find alerts that affect this location
            const relevantAlerts = alertsData.features.filter(alert => {
                console.log(`Checking alert: ${alert.properties.event} for ${location.nickname}`);
                
                // Check if alert has geometry and coordinates
                if (!alert.geometry || !alert.geometry.coordinates || !alert.geometry.coordinates[0]) {
                    console.log(`Alert ${alert.properties.event} has no geometry, checking area description...`);
                    
                    // For alerts without geometry, check if the location is in the affected area
                    const alertAreaDesc = alert.properties.areaDesc || '';
                    const locationAddress = location.address.toLowerCase();
                    
                    // Check for state matches
                    const locationState = this.getStateFromAddress(location.address);
                    if (locationState && alertAreaDesc.toLowerCase().includes(locationState.toLowerCase())) {
                        console.log(`Alert ${alert.properties.event} matches by state (${locationState})`);
                        return true;
                    }
                    
                    // Check for specific county/city mentions
                    if (locationAddress.includes('greensboro') && alertAreaDesc.toLowerCase().includes('guilford')) {
                        console.log(`Alert ${alert.properties.event} matches Greensboro/Guilford County`);
                        return true;
                    }
                    
                    if (locationAddress.includes('north carolina') && alertAreaDesc.toLowerCase().includes('north carolina')) {
                        console.log(`Alert ${alert.properties.event} matches North Carolina`);
                        return true;
                    }
                    
                    // Include all alerts without geometry as a general fallback
                    console.log(`Alert ${alert.properties.event} has no geometry, including as general alert`);
                    return true;
                }
                
                const alertCoords = alert.geometry.coordinates[0];
                const isInPolygon = this.isPointInPolygon([lng, lat], alertCoords);
                console.log(`Alert ${alert.properties.event}: location in polygon = ${isInPolygon}`);
                
                // If polygon test fails, also check if the alert mentions the location's state/county
                if (!isInPolygon) {
                    const alertDescription = alert.properties.description || '';
                    const alertArea = alert.properties.areaDesc || '';
                    const locationAddress = location.address.toLowerCase();
                    
                    // Check if alert mentions the location's state or county
                    const stateMatch = locationAddress.includes('florida') && alertDescription.toLowerCase().includes('florida');
                    const countyMatch = locationAddress.includes('miami') && alertDescription.toLowerCase().includes('miami');
                    
                    if (stateMatch || countyMatch) {
                        console.log(`Alert ${alert.properties.event} matches by state/county description`);
                        return true;
                    }
                }
                
                return isInPolygon;
            });
                
                            console.log(`Found ${relevantAlerts.length} relevant alerts for ${location.nickname}`);
            
            // If no alerts found by polygon test, include all alerts for the area as a fallback
            if (relevantAlerts.length === 0 && alertsData.features.length > 0) {
                console.log(`No alerts found by polygon test, including all ${alertsData.features.length} alerts as fallback`);
                relevantAlerts.push(...alertsData.features);
            }
            
            // Additional fallback: if still no alerts, check if any alerts mention the location's state
            if (relevantAlerts.length === 0 && alertsData.features.length > 0) {
                console.log('Still no alerts found, checking for state-based alerts...');
                const locationState = this.getStateFromAddress(location.address);
                if (locationState) {
                    const stateAlerts = alertsData.features.filter(alert => {
                        const description = (alert.properties.description || '').toLowerCase();
                        const areaDesc = (alert.properties.areaDesc || '').toLowerCase();
                        return description.includes(locationState.toLowerCase()) || 
                               areaDesc.includes(locationState.toLowerCase());
                    });
                    if (stateAlerts.length > 0) {
                        console.log(`Found ${stateAlerts.length} state-based alerts for ${locationState}`);
                        relevantAlerts.push(...stateAlerts);
                    }
                }
            }
            
            // Final fallback: if we have any alerts in the area and no specific matches, include them all
            if (relevantAlerts.length === 0 && alertsData.features.length > 0) {
                console.log(`Final fallback: including all ${alertsData.features.length} alerts for the area`);
                relevantAlerts.push(...alertsData.features);
            }
            
            if (relevantAlerts.length > 0) {
                    // Map NWS event types to our severity levels
                    const severityMapping = {
                        'Severe Thunderstorm Warning': 'warning',
                        'Tornado Warning': 'warning',
                        'Flash Flood Warning': 'warning',
                        'Flood Warning': 'warning',
                        'Extreme Wind Warning': 'warning',
                        'Severe Weather Statement': 'warning',
                        'Severe Thunderstorm Watch': 'watch',
                        'Tornado Watch': 'watch',
                        'Flash Flood Watch': 'watch',
                        'Flood Watch': 'watch',
                        'Wind Advisory': 'advisory',
                        'Heat Advisory': 'advisory',
                        'Flood Advisory': 'advisory',
                        'Dense Fog Advisory': 'advisory',
                        'Winter Weather Advisory': 'advisory',
                        'Coastal Flood Warning': 'warning',
                        'Coastal Flood Advisory': 'advisory',
                        'Rip Current Statement': 'advisory',
                        'Special Weather Statement': 'advisory',
                        'Severe Local Storm': 'warning',
                        'Severe Weather': 'warning'
                    };
                    
                    // Sort by severity and get the highest
                    relevantAlerts.sort((a, b) => {
                        const severityOrder = { 'warning': 3, 'watch': 2, 'advisory': 1 };
                        const aSeverity = severityMapping[a.properties.event] || 'advisory';
                        const bSeverity = severityMapping[b.properties.event] || 'advisory';
                        return severityOrder[bSeverity] - severityOrder[aSeverity];
                    });
                    
                    const topAlert = relevantAlerts[0];
                    console.log(`Alert event type: ${topAlert.properties.event}`);
                    console.log(`Mapped severity before Future check: ${severityMapping[topAlert.properties.event] || 'unknown'}`);
                    
                    let mappedSeverity = severityMapping[topAlert.properties.event] || 'advisory';
                    
                    // If alert has "Future" urgency, elevate by one level
                    if (topAlert.properties.urgency === 'Future') {
                        console.log(`Alert ${topAlert.properties.event} has Future urgency, elevating by one level`);
                        const severityLevels = ['none', 'advisory', 'watch', 'warning'];
                        const currentIndex = severityLevels.indexOf(mappedSeverity);
                        if (currentIndex >= 0 && currentIndex < severityLevels.length - 1) {
                            mappedSeverity = severityLevels[currentIndex + 1];
                            console.log(`Elevated from ${severityLevels[currentIndex]} to ${mappedSeverity}`);
                        }
                    }
                    
                    console.log(`Final mapped severity: ${mappedSeverity}`);
                    console.log(`Alert urgency: ${topAlert.properties.urgency}`);
                    
                    highestSeverity = mappedSeverity;
                    alertDescription = topAlert.properties.description || `Weather alert: ${topAlert.properties.event}`;
                    
                    console.log(`Selected alert for ${location.nickname}: ${topAlert.properties.event} -> ${mappedSeverity}`);
                    console.log(`Alert description: ${alertDescription.substring(0, 100)}...`);
                    
                    // Log all available alerts for debugging
                    console.log('All available alerts:', relevantAlerts.map(a => ({
                        event: a.properties.event,
                        severity: severityMapping[a.properties.event] || 'unknown',
                        description: a.properties.description?.substring(0, 50) + '...'
                    })));
                }
            }
            
            // --- Custom Weather Event Type Extraction and Prioritization ---
            // Extract all event types from relevant alerts
            let eventType = null;
            if (relevantAlerts && relevantAlerts.length > 0) {
                // Priority: tornado > thunderstorm > flood > others
                const eventPriority = [
                    'Tornado Warning', 'Tornado Watch',
                    'Severe Thunderstorm Warning', 'Severe Thunderstorm Watch',
                    'Flash Flood Warning', 'Flood Warning', 'Flood Watch', 'Flood Advisory',
                    'Extreme Wind Warning', 'Severe Weather Statement', 'Special Weather Statement'
                ];
                // Find the first event type matching priority
                for (const p of eventPriority) {
                    const match = relevantAlerts.find(a => a.properties.event && a.properties.event.includes(p));
                    if (match) {
                        eventType = match.properties.event;
                        break;
                    }
                }
                // If none matched, use the top alert's event type
                if (!eventType && relevantAlerts[0] && relevantAlerts[0].properties.event) {
                    eventType = relevantAlerts[0].properties.event;
                }
            }
            location.alertEventType = eventType || null;
            // --- End Custom Event Extraction ---

            // Update location with real data
            location.currentAlert = highestSeverity;
            location.alertDescription = alertDescription;
            location.weatherConditions = currentConditions;
            location.lastUpdated = new Date().toISOString();
            // Mark this as an NWS alert (not manually advanced)
            location.alertSource = 'nws';
            
            console.log(`Final alert status for ${location.nickname}: ${highestSeverity}`);
            console.log(`Alert description: ${alertDescription.substring(0, 100)}...`);
            console.log(`Alert color for ${location.nickname}: ${this.alertSeverity[highestSeverity]?.color || 'unknown'}`);
            console.log(`Location object after update:`, {
                nickname: location.nickname,
                currentAlert: location.currentAlert,
                alertDescription: location.alertDescription?.substring(0, 50) + '...'
            });
            
            console.log(`=== Completed weather data fetch for ${location.nickname} ===`);
            
            // Return the alerts data for polygon display
            return { alertsData };
            
        } catch (error) {
            console.error(`Error fetching weather data for ${location.nickname}:`, error);
            // Fallback to no alert if API fails
            location.currentAlert = 'none';
            location.alertDescription = 'Unable to fetch weather data';
            return { alertsData: null };
        }
    }
    
    // Check if a point is inside a polygon (for alert zones)
    isPointInPolygon(point, polygon) {
        const [x, y] = point;
        let inside = false;
        
        console.log(`Checking point [${x}, ${y}] against polygon with ${polygon.length} points`);
        
        // Handle different polygon formats
        let points = polygon;
        if (Array.isArray(polygon[0]) && Array.isArray(polygon[0][0])) {
            // Multi-polygon format - use the first polygon
            points = polygon[0];
        }
        
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const [xi, yi] = points[i];
            const [xj, yj] = points[j];
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        console.log(`Point [${x}, ${y}] is ${inside ? 'INSIDE' : 'OUTSIDE'} the polygon`);
        return inside;
    }
    
    // Start real-time updates
    startRealTimeUpdates() {
        console.log('=== Starting real-time updates ===');
        
        // Test the APIs first
        this.testGeocodingAPI();
        this.testNWSAPI();
        
        // Initial update
        console.log('Calling initial refreshAlerts...');
        this.refreshAlerts();
        
        // Set up polling every 2 minutes
        this.updateInterval = setInterval(() => {
            console.log('Calling periodic refreshAlerts...');
            this.refreshAlerts();
        }, 120000); // 2 minutes
        
        // Update last update time
        this.lastUpdateTime = new Date();
        console.log('=== Real-time updates started ===');
    }
    
    // Test geocoding API with specific coordinates
    async testGeocodingAPI() {
        console.log('=== Testing Geocoding API ===');
        
        // First test Google API directly
        console.log('\n=== Testing Google Maps API ===');
        try {
            const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=9%20Stuart%20Road,%20Chelmsford,%20MA%2001824&key=${this.GOOGLE_API_KEY}`;
            console.log('Testing URL:', testUrl);
            
            const response = await fetch(testUrl);
            const data = await response.json();
            
            console.log('Google API Response:', data);
            
            if (data.status === 'REQUEST_DENIED') {
                console.log(' Google Maps API Error:', data.error_message);
                console.log('\n To fix this issue:');
                console.log('1. Go to https://console.cloud.google.com/');
                console.log('2. Select your project');
                console.log('3. Go to "APIs & Services" > "Library"');
                console.log('4. Search for "Geocoding API" and enable it');
                console.log('5. Go to "APIs & Services" > "Credentials"');
                console.log('6. Make sure your API key has access to the Geocoding API');
                return;
            }
            
            if (data.status === 'OK') {
                console.log(' Google Maps API is working correctly');
            }
        } catch (error) {
            console.log(' Google Maps API test failed:', error);
        }
        
        console.log('\n=== Testing Full Geocoding Function ===');
        const testAddresses = [
            '123 Main St, Salt Lake City, UT 84101',
            '9 Stuart Road, Chelmsford, MA 01824',
            '1600 Pennsylvania Ave NW, Washington, DC 20500',
            '1 Apple Park Way, Cupertino, CA 95014',
            'Salt Lake City, UT'
        ];
        
        for (const address of testAddresses) {
            try {
                console.log(`Testing geocoding for: ${address}`);
                const result = await this.geocodeAddress(address);
                console.log(` Geocoding successful for "${address}":`, result);
            } catch (error) {
                console.error(` Geocoding failed for "${address}":`, error.message);
            }
        }
        
        // Test with the specific coordinates mentioned
        const testCoordinates = '41.211158445600624, -112.02219388835012';
        console.log('Testing coordinates:', testCoordinates);
        
        try {
            const result = await this.geocodeAddress(testCoordinates);
            console.log('Coordinate geocoding successful:', result);
        } catch (error) {
            console.error('Coordinate geocoding failed:', error.message);
        }
    }

    // Test NWS API to verify it's working
    async testNWSAPI() {
        try {
            console.log('Testing NWS API...');
            
            // Test with a known location (Oklahoma City - often has weather alerts)
            const testLat = 35.4676;
            const testLng = -97.5164;
            
            console.log(`Testing with coordinates: ${testLat}, ${testLng}`);
            
            // Get points data
            const pointsResponse = await fetch(`${this.NWS_BASE_URL}/points/${testLat},${testLng}`, {
                redirect: 'follow'
            });
            if (!pointsResponse.ok) {
                console.error('NWS Points API failed:', pointsResponse.status);
                return;
            }
            
            const pointsData = await pointsResponse.json();
            console.log('Points data:', pointsData.properties);
            
            // Try to get alerts
            if (pointsData.properties.forecastZone) {
                const forecastZoneId = pointsData.properties.forecastZone.split('/').pop();
                const alertsUrl = `${this.NWS_BASE_URL}/alerts/active?zone=${forecastZoneId}`;
                console.log('Testing alerts URL:', alertsUrl);
                
                const alertsResponse = await fetch(alertsUrl, {
                    redirect: 'follow'
                });
                if (alertsResponse.ok) {
                    const alertsData = await alertsResponse.json();
                    console.log(`Found ${alertsData.features?.length || 0} active alerts`);
                    if (alertsData.features && alertsData.features.length > 0) {
                        console.log('Alert types:', alertsData.features.map(a => a.properties.event));
                    }
                } else {
                    console.error('Alerts API failed:', alertsResponse.status);
                }
            }
            
        } catch (error) {
            console.error('NWS API test failed:', error);
        }
    }
    
    // Stop real-time updates
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    scheduleFutureEvent(locationId, alertType, scheduledTime) {
        const location = this.locations.find(loc => loc.id === locationId);
        if (!location) return;


        
        this.saveLocations();
        this.updateDisplay();
        
        // Schedule the actual event
        const timeUntilEvent = scheduledTime - new Date().getTime();
        if (timeUntilEvent > 0) {
            setTimeout(() => {
                this.activateFutureEvent(locationId, alertType);
            }, timeUntilEvent);
        }
    }

    activateFutureEvent(locationId, alertType) {
        const location = this.locations.find(loc => loc.id === locationId);
        if (!location) return;

        // Set the alert and mark it as manually advanced (not from NWS)
        location.currentAlert = alertType;
        location.alertSource = 'manual';
        
        this.saveLocations();
        this.updateDisplay();
    }

    checkForFutureEvents() {
        const now = new Date().getTime();
        

    }

    async deleteLocation(locationId) {
        const location = this.locations.find(loc => loc.id === locationId);
        if (location && confirm(`Are you sure you want to delete "${location.nickname}"?`)) {
            try {
                const response = await fetch(`${this.SERVER_API}/locations/${locationId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.locations = this.locations.filter(loc => loc.id !== locationId);
                    this.updateDisplay();
                } else {
                    console.error('Failed to delete location from server');
                }
            } catch (error) {
                console.error('Error deleting location:', error);
            }
        }
    }

    toggleSiteFilter(siteType) {
        this.siteFilters[siteType] = !this.siteFilters[siteType];
        this.updateDisplay();
    }
    

    


    toggleFilterDropdown() {
        const filterDropdown = document.getElementById('filterDropdown');
        const filterBtn = document.getElementById('filterBtn');
        
        if (filterDropdown.classList.contains('active')) {
            this.closeFilterDropdown();
        } else {
            this.openFilterDropdown();
        }
    }

    openFilterDropdown() {
        const filterDropdown = document.getElementById('filterDropdown');
        const filterBtn = document.getElementById('filterBtn');
        
        // Calculate available space
        const btnRect = filterBtn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - btnRect.bottom;
        const spaceAbove = btnRect.top;
        
        // Reset any previous positioning
        filterDropdown.style.top = '';
        filterDropdown.style.bottom = '';
        filterDropdown.style.maxHeight = '';
        
        // Let the dropdown size naturally to its content
        // Only check if we need to position it above to avoid going off-screen
        const dropdownContent = filterDropdown.querySelector('.filter-dropdown-content');
        const estimatedHeight = dropdownContent ? dropdownContent.scrollHeight + 32 : 300; // Add padding
        
        if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
            // Position above the button if not enough space below
            filterDropdown.style.bottom = '100%';
            filterDropdown.style.top = 'auto';
        } else {
            // Position below the button (default)
            filterDropdown.style.top = '100%';
        }
        
        filterDropdown.classList.add('active');
        filterBtn.classList.add('active');
    }

    closeFilterDropdown() {
        const filterDropdown = document.getElementById('filterDropdown');
        const filterBtn = document.getElementById('filterBtn');
        
        filterDropdown.classList.remove('active');
        filterBtn.classList.remove('active');
    }

    getFilteredLocations() {
        // Filter by site type and alert level
        return this.locations.filter(location => {
            const siteTypeMatch = this.siteFilters[location.siteType];
            const alertLevelMatch = this.alertLevelFilters[location.currentAlert];
            return siteTypeMatch && alertLevelMatch;
        });
    }

    setupResizer() {
        const resizer = document.getElementById('resizer');
        const locationsPanel = document.getElementById('locationsPanel');
        const mapPanel = document.getElementById('mapPanel');
        
        let isResizing = false;
        let startX, startWidth;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = locationsPanel.offsetWidth;
            
            resizer.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const newWidth = startWidth + deltaX;
            
            // Only constrain to minimum width - no maximum limit
            const minWidth = 200;
            const constrainedWidth = Math.max(minWidth, newWidth);
            
            locationsPanel.style.width = `${constrainedWidth}px`;
            
            // Trigger map resize to ensure proper rendering
            if (this.map) {
                setTimeout(() => {
                    this.map.invalidateSize();
                }, 10);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizer.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Save the panel width preference
                localStorage.setItem('locationsPanelWidth', locationsPanel.style.width);
            }
        });
        
        // Restore saved width on load
        const savedWidth = localStorage.getItem('locationsPanelWidth');
        if (savedWidth) {
            locationsPanel.style.width = savedWidth;
        }
    }

    updateDisplay() {
        this.updateLocationsList();
        this.updateMarkers();
        this.updateAlertCounts();
        this.updateLocationCount();
    }

    // Add missing method to update the total location count in the UI
    updateLocationCount() {
        const count = this.locations.length;
        const el = document.getElementById('locationCount');
        if (el) {
            el.textContent = count;
        }
    }

    // Add missing method to update alert counts in the UI
    updateAlertCounts() {
        // Count locations by alert type
        const counts = { warning: 0, watch: 0, advisory: 0, none: 0 };
        this.locations.forEach(loc => {
            if (counts.hasOwnProperty(loc.currentAlert)) {
                counts[loc.currentAlert]++;
            } else {
                counts['none']++;
            }
        });
        // Update the UI elements if present
        if (document.getElementById('count-warning')) {
            document.getElementById('count-warning').textContent = counts.warning;
        }
        if (document.getElementById('count-watch')) {
            document.getElementById('count-watch').textContent = counts.watch;
        }
        if (document.getElementById('count-advisory')) {
            document.getElementById('count-advisory').textContent = counts.advisory;
        }
        if (document.getElementById('count-none')) {
            document.getElementById('count-none').textContent = counts.none;
        }
    }

    updateLocationsList() {
        const container = document.getElementById('locationsList');
        const filteredLocations = this.getFilteredLocations();
        
        if (this.locations.length === 0) {
            container.innerHTML = `
                <div class="no-locations">
                    <i class="fas fa-map-marker-alt"></i>
                    <p>No locations added yet</p>
                    <button class="add-first-location">Add Your First Location</button>
                </div>
            `;
            document.querySelector('.add-first-location').addEventListener('click', () => this.openLocationModal());
            return;
        }
        
        if (filteredLocations.length === 0) {
            container.innerHTML = `
                <div class="no-locations">
                    <i class="fas fa-filter"></i>
                    <p>No locations match current filters</p>
                    <p style="font-size: 0.9rem; color: #999;">Adjust your site type filters to see locations</p>
                </div>
            `;
            return;
        }
        
        // Sort locations by alert severity (most severe first)
        const sortedLocations = [...filteredLocations].sort((a, b) => {
            return this.alertSeverity[b.currentAlert].level - this.alertSeverity[a.currentAlert].level;
        });
        
        container.innerHTML = sortedLocations.map(location => `
            <div class="alert-card ${this.alertSeverity[location.currentAlert].class}${location.currentAlert === 'warning' && location.alertSource === 'nws' ? ' nws-warning' : ''}" data-location-id="${location.id}">
                <div class="alert-card-header">
                    <div class="alert-card-icon" title="${location.alertEventType || this.getAlertText(location.currentAlert, location)}">
                            <i class="fas ${this.getEventIcon(location)}"></i>
                        </div>
                    <div class="alert-card-title-section">
                        <div class="alert-card-location-row">
                            <span class="alert-card-location-name">${location.nickname}</span>
                            <span class="alert-card-site-type-icon" title="${this.getSiteTypeDescription(location.siteType)}"><i class="fas ${this.siteIcons[location.siteType] || 'fa-map-marker-alt'}"></i></span>
                    </div>
                        <div class="alert-card-alert-type">${this.getAlertText(location.currentAlert, location)}</div>
                </div>
                    <div class="alert-card-actions">
                        <button class="alert-collapse-toggle" title="Toggle details">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
                <div class="alert-card-details" style="display: none;">
                    <div class="alert-card-description">
                        ${location.alertEventType ? `<strong>${location.alertEventType}</strong><br>` : ''}
                        ${this.getAlertDescription(location.currentAlert, location)}
                    </div>
                    <div class="alert-card-meta">
                        <div class="alert-card-site-info">
                            <i class="fas ${this.siteIcons[location.siteType] || 'fa-map-marker-alt'}"></i>
                            <span>${this.getSiteTypeDescription(location.siteType)}</span>
                        </div>
                        <div class="alert-card-address">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${location.address}</span>
                    </div>
                    ${location.contactName ? `
                        <div class="alert-card-contact">
                            <i class="fas fa-user"></i>
                            <span>${location.contactName}${location.contactTitle ? ` - ${location.contactTitle}` : ''}</span>
                        </div>
                    ` : ''}
                        ${location.contactPhone ? `
                        <div class="alert-card-phone">
                            <i class="fas fa-phone"></i>
                            <span>${location.contactPhone}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="alert-card-edit-section">
                        <button class="alert-edit-btn" data-location-id="${location.id}" title="Edit location">
                            <i class="fas fa-edit"></i>
                            Edit Location
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add collapse/expand listeners for alert cards
        document.querySelectorAll('.alert-collapse-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = toggle.closest('.alert-card');
                const details = card.querySelector('.alert-card-details');
                const icon = toggle.querySelector('i');
                
                if (details.style.display === 'none') {
                    details.style.display = 'block';
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                } else {
                    details.style.display = 'none';
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            });
        });
        
        // Add click listeners to location items (focus on map)
        document.querySelectorAll('.location-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons or collapse toggle
                if (e.target.closest('.location-actions') || e.target.closest('.collapse-toggle')) return;
                const locationId = item.dataset.locationId;
                this.focusOnLocation(locationId);
                
                // Also select this location in the pane
                this.selectLocationInPane(locationId);
            });
        });
        
        // Add click listeners to alert cards (zoom map to site)
        document.querySelectorAll('.alert-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons or collapse toggle
                if (e.target.closest('.alert-card-actions') || e.target.closest('.alert-collapse-toggle') || e.target.closest('.alert-edit-btn')) return;
                const locationId = card.dataset.locationId;
                this.focusOnLocation(locationId);
            });
        });
        
        // Add listeners for edit buttons in alert cards
        document.querySelectorAll('.alert-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const locationId = btn.dataset.locationId;
                this.openLocationModal(locationId);
            });
        });
        
        // Add listeners for edit and delete buttons (for other location lists)
        document.querySelectorAll('.location-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const locationId = btn.dataset.locationId;
                this.openLocationModal(locationId);
            });
        });
        
        document.querySelectorAll('.location-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const locationId = btn.dataset.locationId;
                this.deleteLocation(locationId);
            });
        });
    }

    updateMapMarkers() {
        // Clear existing markers
        console.log(`Clearing ${this.markers.length} existing markers`);
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        // ... rest of updateMapMarkers code ...
    }

    selectLocationInPane(locationId) {
        const card = document.querySelector(`.alert-card[data-location-id='${locationId}']`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlight');
            setTimeout(() => card.classList.remove('highlight'), 2000);
        }
    }

    // Add new markers for ALL locations (not just filtered ones)
    updateMarkers() {
        console.log('=== updateMarkers called ===');
        console.log('Map initialized:', !!this.map);
        console.log('Number of locations:', this.locations.length);
        
        if (!this.map) {
            console.error('Map not initialized!');
            return;
        }
        
        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        
        this.locations.forEach(location => {
            const alertInfo = this.alertSeverity[location.currentAlert];
            const isNoneAlert = location.currentAlert === 'none';
            const isNoneGhosted = isNoneAlert && !this.alertLevelFilters['none'];
            const isAlertLevelFiltered = !this.alertLevelFilters[location.currentAlert];
            const shouldPulse = location.currentAlert === 'warning' || 
                               location.currentAlert === 'future-warning' || 
                               location.currentAlert === 'watch' || 
                               location.currentAlert === 'future-watch';
            const pulseClass = shouldPulse && !isAlertLevelFiltered && !isNoneGhosted ? 'pulse-severe' : '';
            let markerColor = alertInfo.color;
            let textColor = 'white';
            let markerOpacity = '1';
            let markerFilter = 'none';
            let markerShadow = '0 2px 8px rgba(0,0,0,0.3)';
            let filteredClass = '';
            if (isNoneGhosted) {
                markerColor = '#9ca3af'; // medium grey
                textColor = '#ffffff';
                markerOpacity = '0.5';
                markerFilter = 'none';
                markerShadow = '0 1px 3px rgba(0,0,0,0.2)';
                filteredClass = ' filtered';
            } else if (isAlertLevelFiltered) {
                markerColor = '#d1d5db'; // light grey
                textColor = '#6b7280';
                markerOpacity = '0.4';
                markerFilter = 'blur(0.5px) grayscale(0.3)';
                markerShadow = '0 1px 3px rgba(0,0,0,0.1)';
                filteredClass = ' filtered';
            }
            const iconHtml = `
                <div class="custom-marker ${pulseClass}${filteredClass}" style="
                    background-color: ${markerColor};
                    border: 2px solid ${isNoneGhosted ? '#e5e7eb' : isAlertLevelFiltered ? '#e5e7eb' : 'white'};
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${textColor};
                    font-size: 14px;
                    box-shadow: ${markerShadow};
                    transition: transform 0.2s ease, opacity 0.3s ease, filter 0.3s ease;
                    transform-origin: center;
                    opacity: ${markerOpacity};
                    filter: ${markerFilter};
                " title="${this.getSiteTypeDescription(location.siteType)}${isNoneGhosted ? ' (Filtered out - No active alerts)' : isAlertLevelFiltered ? ' (Filtered out)' : ''}">
                    <i class="fas ${this.siteIcons[location.siteType]}"></i>
                </div>
            `;
            
            const marker = L.marker(location.coordinates, {
                icon: L.divIcon({
                    html: iconHtml,
                    className: 'custom-div-icon',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(this.map);
            
            console.log(`Marker added for ${location.nickname} at [${location.coordinates[0]}, ${location.coordinates[1]}]`);
            
            // Add hover effects
            marker.on('mouseover', function() {
                const iconElement = this.getElement();
                if (iconElement) {
                    const markerDiv = iconElement.querySelector('.custom-marker');
                    if (markerDiv) {
                        markerDiv.style.transform = 'scale(1.2)';
                        markerDiv.style.transition = 'transform 0.2s ease';
                    }
                    iconElement.style.zIndex = '1000';
                }
            });
            
            marker.on('mouseout', function() {
                const iconElement = this.getElement();
                if (iconElement) {
                    const markerDiv = iconElement.querySelector('.custom-marker');
                    if (markerDiv) {
                        markerDiv.style.transform = 'scale(1)';
                    }
                    iconElement.style.zIndex = 'auto';
                }
            });
            
            // Add popup
            marker.bindPopup(`
                <div class="popup-content">
                    <h4>${location.nickname}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${location.address}</p>
                    <p><i class="fas ${this.siteIcons[location.siteType]}"></i> ${location.siteType}</p>
                    ${location.contactName ? `<p><i class="fas fa-user"></i> ${location.contactName}</p>` : ''}
                ${location.contactTitle ? `<p><i class="fas fa-id-badge"></i> ${location.contactTitle}</p>` : ''}
                    ${location.contactPhone ? `<p><i class="fas fa-phone"></i> ${location.contactPhone}</p>` : ''}
                    <div class="popup-alert ${alertInfo.class}${isNoneGhosted || isAlertLevelFiltered ? ' filtered' : ''}">
                        <i class="fas ${this.getEventIcon(location)}"></i>
                        ${this.getAlertText(location.currentAlert, location)}
                        ${isNoneGhosted || isAlertLevelFiltered ? '<span style="color: #6b7280; font-size: 0.8em;"> (Filtered out)</span>' : ''}
                    </div>
                    <div class="popup-alert-details">
                        ${location.alertEventType ? `<strong>${location.alertEventType}</strong><br>` : ''}
                        ${this.getAlertDescription(location.currentAlert, location)}
                    </div>
                </div>
            `);
            
            // Add click event to select location in alerts pane
            marker.on('click', () => {
                this.selectLocationInPane(location.id);
            });
            
            this.markers.push(marker);
        });
    }

    // Clear all alert polygons from the map
    clearAlertPolygons() {
        this.alertPolygons.forEach(polygon => {
            if (this.map && polygon) {
                this.map.removeLayer(polygon);
            }
        });
        this.alertPolygons = [];
    }

    // Add alert polygons to the map
    addAlertPolygons(alertsData) {
        console.log('=== Adding alert polygons ===');
        console.log('Alerts data:', alertsData);
        
        if (!alertsData || !alertsData.features || !this.map) {
            console.log('No alerts data or map available');
            return;
        }

        console.log(`Processing ${alertsData.features.length} alerts for polygons`);

        // Clear existing polygons
        this.clearAlertPolygons();

        alertsData.features.forEach((alert, index) => {
            console.log(`Alert ${index + 1}:`, {
                event: alert.properties.event,
                hasGeometry: !!alert.geometry,
                hasCoordinates: !!(alert.geometry && alert.geometry.coordinates),
                coordinatesLength: alert.geometry?.coordinates?.length || 0
            });
            
            // Only show polygons for alerts with geometry
            if (alert.geometry && alert.geometry.coordinates && alert.geometry.coordinates[0]) {
                const alertType = alert.properties.event;
                const alertSeverity = this.getAlertSeverityFromNWS(alertType);
                
                console.log(`Creating polygon for alert: ${alertType} with ${alert.geometry.coordinates[0].length} coordinates`);
                
                // Create polygon from coordinates
                const coordinates = alert.geometry.coordinates[0].map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
                
                const polygon = L.polygon(coordinates, {
                    color: alertSeverity.color,
                    weight: 2,
                    fillColor: alertSeverity.color,
                    fillOpacity: 0.2,
                    opacity: 0.8
                }).addTo(this.map);

                // Add popup with alert information
                polygon.bindPopup(`
                    <div class="alert-polygon-popup">
                        <h4>${alert.properties.headline || alertType}</h4>
                        <p><strong>Type:</strong> ${alertType}</p>
                        <p><strong>Severity:</strong> ${alert.properties.severity || 'Unknown'}</p>
                        <p><strong>Urgency:</strong> ${alert.properties.urgency || 'Unknown'}</p>
                        <p><strong>Area:</strong> ${alert.properties.areaDesc || 'Unknown'}</p>
                        <div class="alert-description">
                            ${alert.properties.description || 'No description available'}
                        </div>
                    </div>
                `);

                this.alertPolygons.push(polygon);
                console.log(`Added polygon for ${alertType}`);
            } else {
                console.log(`Skipping alert ${alert.properties.event} - no geometry`);
            }
        });

        console.log(`Added ${this.alertPolygons.length} alert polygons to the map`);
    }

    // Get alert severity from NWS alert type
    getAlertSeverityFromNWS(alertType) {
        const alertTypeLower = alertType.toLowerCase();
        
        // Severe weather warnings
        if (alertTypeLower.includes('warning') || alertTypeLower.includes('severe')) {
            return { color: '#dc2626', class: 'severe' };
        }
        
        // Watches
        if (alertTypeLower.includes('watch')) {
            return { color: '#ea580c', class: 'moderate' };
        }
        
        // Advisories
        if (alertTypeLower.includes('advisory')) {
            return { color: '#ca8a04', class: 'minor' };
        }
        
        // Default
        return { color: '#666666', class: 'none' };
    }

    getAlertIcon(alertType) {
        const icons = {
            'warning': 'fa-triangle-exclamation',
            'watch': 'fa-eye',
            'advisory': 'fa-info-circle',
            'none': 'fa-check-circle',
        };
        return icons[alertType] || 'fa-question-circle';
    }

    getEventIcon(location) {
        // Use the specific event type from the location if available
        if (location.alertEventType) {
            const eventType = location.alertEventType.toLowerCase();
            
            // Map specific event types to icons
            if (eventType.includes('tornado')) {
                return 'fa-tornado';
            } else if (eventType.includes('thunderstorm') || eventType.includes('storm')) {
                return 'fa-bolt';
            } else if (eventType.includes('flood')) {
                return 'fa-water';
            } else if (eventType.includes('wind')) {
                return 'fa-wind';
            } else if (eventType.includes('snow') || eventType.includes('winter')) {
                return 'fa-snowflake';
            } else if (eventType.includes('heat')) {
                return 'fa-temperature-high';
            } else if (eventType.includes('fire')) {
                return 'fa-fire';
            } else if (eventType.includes('fog')) {
                return 'fa-smog';
            } else if (eventType.includes('hurricane') || eventType.includes('tropical')) {
                return 'fa-hurricane';
            } else if (eventType.includes('avalanche')) {
                return 'fa-mountain';
            } else if (eventType.includes('marine')) {
                return 'fa-anchor';
            }
        }
        
        // Fallback to generic alert icon based on severity
        return this.getAlertIcon(location.currentAlert);
    }

    getAlertText(alertType, location = null) {
        // If we have a specific event type from the location, use it
        if (location && location.alertEventType) {
            return location.alertEventType;
        }
        
        // Fallback to generic text based on alert type
        const texts = {
            'warning': 'Severe Weather Warning',
            'watch': 'Weather Watch',
            'advisory': 'Weather Advisory',
            'none': 'No Active Alerts',
        };
        return texts[alertType] || 'Unknown Alert';
    }

    getAlertDescription(alertType, location) {
        // Use real alert description if available
        if (location.alertDescription && alertType !== 'none') {
            return location.alertDescription;
        }
        
        // If we have a specific event type, make the description more specific
        if (location.alertEventType && alertType !== 'none') {
            const eventType = location.alertEventType;
            const weatherConditions = this.getLocationWeatherConditions(location);
            
            if (weatherConditions.shortForecast) {
                return `${eventType} - ${weatherConditions.shortForecast}. ${weatherConditions.detailedForecast}`;
            }
        }
        
        // Get real weather conditions
        const weatherConditions = this.getLocationWeatherConditions(location);
        
        // Use real forecast data if available
        if (weatherConditions.shortForecast) {
            const descriptions = {
                'warning': `SEVERE WEATHER WARNING - ${weatherConditions.shortForecast}. ${weatherConditions.detailedForecast} Take immediate shelter indoors.`,
                'watch': `WEATHER WATCH - ${weatherConditions.shortForecast}. ${weatherConditions.detailedForecast} Monitor conditions closely.`,
                'advisory': `WEATHER ADVISORY - ${weatherConditions.shortForecast}. ${weatherConditions.detailedForecast}`,
                'none': `No active weather alerts. Current conditions: ${weatherConditions.shortForecast}. ${weatherConditions.detailedForecast}`,

            };
            return descriptions[alertType] || 'Weather alert information unavailable.';
        }
        
        // Fallback to generated weather details
        const descriptions = {
            'warning': `SEVERE THUNDERSTORM WARNING - ${weatherConditions.temp}°F, ${weatherConditions.wind} mph winds, ${weatherConditions.precipitation}. ${weatherConditions.details} Take immediate shelter indoors.`,
            'watch': `SEVERE THUNDERSTORM WATCH - ${weatherConditions.temp}°F, ${weatherConditions.wind} mph winds, ${weatherConditions.precipitation}. ${weatherConditions.details} Monitor conditions closely.`,
            'advisory': `${weatherConditions.advisoryType.toUpperCase()} ADVISORY - ${weatherConditions.temp}°F, ${weatherConditions.wind} mph winds, ${weatherConditions.precipitation}. ${weatherConditions.details}`,
            'none': `No active weather alerts. Current conditions: ${weatherConditions.temp}°F, ${weatherConditions.wind} mph winds, ${weatherConditions.precipitation}.`,
            
        };
        return descriptions[alertType] || 'Weather alert information unavailable.';
    }

    getFutureEventTime(location) {
        if (!location.futureEvent) return 'Unknown time';
        
        const eventTime = new Date(location.futureEvent.scheduledTime);
        const now = new Date();
        const timeDiff = eventTime - now;
        
        if (timeDiff < 60000) { // Less than 1 minute
            return 'Imminent';
        } else if (timeDiff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(timeDiff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} from now`;
        } else if (timeDiff < 86400000) { // Less than 24 hours
            const hours = Math.floor(timeDiff / 3600000);
            return `${hours} hour${hours > 1 ? 's' : ''} from now`;
        } else {
            const days = Math.floor(timeDiff / 86400000);
            return `${days} day${days > 1 ? 's' : ''} from now`;
        }
    }

    getLocationWeatherConditions(location) {
        // Use real weather data if available
        if (location.weatherConditions && location.weatherConditions.properties && location.weatherConditions.properties.periods) {
            const currentPeriod = location.weatherConditions.properties.periods[0];
            
            // Extract real weather data from NWS API response
            const temp = currentPeriod.temperature || 70;
            const windSpeed = currentPeriod.windSpeed || '10 mph';
            const shortForecast = currentPeriod.shortForecast || 'Partly cloudy';
            const detailedForecast = currentPeriod.detailedForecast || 'No detailed forecast available';
            
            // Parse wind speed (remove "mph" and convert to number)
            const windMatch = windSpeed.match(/(\d+)/);
            const wind = windMatch ? parseInt(windMatch[1]) : 10;
            
            // Determine precipitation type from forecast
            let precipitation = 'Clear';
            if (shortForecast.toLowerCase().includes('rain')) precipitation = 'Rain';
            else if (shortForecast.toLowerCase().includes('snow')) precipitation = 'Snow';
            else if (shortForecast.toLowerCase().includes('storm')) precipitation = 'Thunderstorms';
            else if (shortForecast.toLowerCase().includes('cloud')) precipitation = 'Cloudy';
            
            // Generate weather details based on alert type
            let details = '';
            let advisoryType = '';
            
            if (location.currentAlert === 'warning') {
                details = `SEVERE WEATHER WARNING - ${detailedForecast}`;
            } else if (location.currentAlert === 'watch') {
                details = `WEATHER WATCH - ${detailedForecast}`;
            } else if (location.currentAlert === 'advisory') {
                advisoryType = 'Weather';
                details = `WEATHER ADVISORY - ${detailedForecast}`;
            } else {
                details = `Current conditions: ${detailedForecast}`;
            }
            
            return {
                temp: temp,
                wind: wind,
                humidity: 50, // NWS doesn't always provide humidity
                precipitation: precipitation,
                details: details,
                advisoryType: advisoryType,
                isNight: false, // Would need to check time of day
                shortForecast: shortForecast,
                detailedForecast: detailedForecast
            };
        }
        
        // Fallback to mock data if real data is not available
        const now = new Date();
        const hour = now.getHours();
        const isNight = hour < 6 || hour > 18;
        
        // Base conditions by region (simplified)
        const regionConditions = {
            'NYC': { baseTemp: 75, baseWind: 15, region: 'Northeast' },
            'LA': { baseTemp: 85, baseWind: 8, region: 'West Coast' },
            'Chicago': { baseTemp: 65, baseWind: 20, region: 'Midwest' },
            'Dallas': { baseTemp: 90, baseWind: 12, region: 'South' }
        };
        
        // Determine location region
        let region = 'Other';
        if (location.address.includes('New York') || location.address.includes('NYC')) region = 'NYC';
        else if (location.address.includes('Los Angeles') || location.address.includes('LA')) region = 'LA';
        else if (location.address.includes('Chicago')) region = 'Chicago';
        else if (location.address.includes('Dallas')) region = 'Dallas';
        
        const base = regionConditions[region] || { baseTemp: 70, baseWind: 10, region: 'Other' };
        
        // Add realistic variations
        const temp = base.baseTemp + (Math.random() - 0.5) * 20;
        const wind = base.baseWind + Math.random() * 15;
        const humidity = 40 + Math.random() * 40;
        
        // Determine precipitation type and intensity
        const precipTypes = ['Clear', 'Light Rain', 'Moderate Rain', 'Heavy Rain', 'Thunderstorms', 'Snow', 'Sleet'];
        const precipType = precipTypes[Math.floor(Math.random() * precipTypes.length)];
        
        // Generate specific weather details
        let details = '';
        let advisoryType = '';
        
        if (location.currentAlert === 'warning') {
            const warningTypes = [
                'Severe thunderstorms with 1-inch hail and 60+ mph winds detected by radar.',
                'Tornado warning issued due to rotation detected in storm cell.',
                'Flash flood warning due to heavy rainfall exceeding 2 inches per hour.',
                'Severe thunderstorm with damaging winds and large hail approaching.',
                'Extreme wind warning with gusts up to 80 mph expected.'
            ];
            details = warningTypes[Math.floor(Math.random() * warningTypes.length)];
        } else if (location.currentAlert === 'watch') {
            const watchTypes = [
                'Atmospheric conditions favor severe storm development within 2-4 hours.',
                'High instability and wind shear creating favorable conditions for severe storms.',
                'Cold front approaching with strong convective activity expected.',
                'Upper-level disturbance creating favorable conditions for severe storms.',
                'Moisture convergence and lift supporting thunderstorm development.'
            ];
            details = watchTypes[Math.floor(Math.random() * watchTypes.length)];
        } else if (location.currentAlert === 'advisory') {
            const advisoryTypes = ['Wind', 'Heat', 'Flood', 'Winter Weather', 'Dense Fog'];
            advisoryType = advisoryTypes[Math.floor(Math.random() * advisoryTypes.length)];
            
            const advisoryDetails = {
                'Wind': 'Sustained winds 25-35 mph with gusts up to 50 mph expected.',
                'Heat': 'Heat index values reaching 105°F with high humidity levels.',
                'Flood': 'Minor flooding possible in low-lying areas due to heavy rainfall.',
                'Winter Weather': 'Mixed precipitation with 1-3 inches of snow and ice accumulation.',
                'Dense Fog': 'Visibility reduced to less than 1/4 mile in dense fog conditions.'
            };
            details = advisoryDetails[advisoryType];
        } else {
            details = 'Stable weather conditions with no significant hazards expected.';
        }
        
        return {
            temp: Math.round(temp),
            wind: Math.round(wind),
            humidity: Math.round(humidity),
            precipitation: precipType,
            details: details,
            advisoryType: advisoryType,
            isNight: isNight
        };
    }

    async refreshAlerts() {
        console.log('=== Starting refreshAlerts ===');
        console.log(`Refreshing alerts for ${this.locations.length} locations`);
        
        if (this.locations.length === 0) {
            console.log('No locations to refresh alerts for');
            return;
        }
        
        // Check for future events that should be activated
        this.checkForFutureEvents();
        
        // Collect all alerts from all locations for polygon display
        let allAlerts = [];
        
        // Fetch real weather data for all locations
        const updatePromises = this.locations.map(async location => {
            const result = await this.fetchWeatherDataForLocation(location);
            // Collect alerts from this location
            if (result && result.alertsData && result.alertsData.features) {
                console.log(`Adding ${result.alertsData.features.length} alerts from ${location.nickname}`);
                allAlerts = allAlerts.concat(result.alertsData.features);
            } else {
                console.log(`No alerts data returned for ${location.nickname}`);
            }
            return result;
        });
        
        try {
            console.log('Waiting for all weather data updates to complete...');
            await Promise.all(updatePromises);
            console.log('All weather data updates completed');
            
            console.log(`Collected ${allAlerts.length} total alerts from all locations`);
            
            // Remove duplicate alerts based on ID
            const uniqueAlerts = allAlerts.filter((alert, index, self) => 
                index === self.findIndex(a => a.id === alert.id)
            );
            
            console.log(`After removing duplicates: ${uniqueAlerts.length} unique alerts`);
            
            // Create combined alerts data structure
            const combinedAlertsData = {
                features: uniqueAlerts
            };
            
            console.log('Combined alerts data:', combinedAlertsData);
            
            // Display alert polygons on the map
            this.addAlertPolygons(combinedAlertsData);
            
            await this.saveLocations();
            console.log('Locations saved to server');
            this.updateDisplay();
            console.log('Display updated');
            this.updateLastUpdated();
            console.log('=== Completed refreshAlerts ===');
        } catch (error) {
            console.error('Error refreshing alerts:', error);
        }
        
        // Show refresh animation
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.classList.add('fa-spin');
        setTimeout(() => {
            refreshBtn.classList.remove('fa-spin');
        }, 1000);
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        document.getElementById('lastUpdated').textContent = `Last updated: ${timeString}`;
        
        // Update API status
        this.updateAPIStatus();
    }
    
    updateAPIStatus() {
        const statusElement = document.getElementById('apiStatus');
        if (statusElement) {
            // Check if we have any locations with real weather data
            const hasRealData = this.locations.some(location => 
                location.weatherConditions && location.weatherConditions.properties
            );
            
            // Check if we have any recent successful updates
            const hasRecentUpdates = this.locations.some(location => 
                location.lastUpdated && 
                (new Date() - new Date(location.lastUpdated)) < 300000 // 5 minutes
            );
            
            if (this.locations.length === 0) {
                // No locations yet
                statusElement.textContent = '✅ Ready';
                statusElement.className = 'api-status connected';
            } else if (hasRealData && hasRecentUpdates) {
                // We have real data and recent updates
                statusElement.textContent = '✅ Connected';
                statusElement.className = 'api-status connected';
            } else if (hasRecentUpdates) {
                // We have recent updates but using fallback data
                statusElement.textContent = '⚠️ Limited Data';
                statusElement.className = 'api-status warning';
            } else {
                // No recent updates
                statusElement.textContent = '⚠️ API Issues';
                statusElement.className = 'api-status error';
            }
        }
    }

    async fetchCanadianWeatherData(location) {
        console.log(`Fetching Canadian weather data for ${location.nickname}`);
        
        // For Canadian locations, we'll skip weather data fetching for now
        // since the US API doesn't support Canadian coordinates
        // In the future, this could use Environment Canada's API
        console.log(`Skipping weather data for Canadian location: ${location.nickname} (not supported by US API)`);
        
        // Set default values for Canadian locations
        location.currentAlert = 'none';
        location.currentAlertDescription = 'Weather data not available for Canadian locations';
        location.shortForecast = 'Weather data not available';
        location.detailedForecast = 'Canadian weather data is not currently supported. This location will be monitored for future weather API integration.';
        location.temperature = null;
        location.humidity = null;
        location.windSpeed = null;
        location.lastWeatherUpdate = new Date().toISOString();
        
        return location;
    }

    async fetchMexicanWeatherData(location) {
        console.log(`Fetching Mexican weather data for ${location.nickname}`);
        
        // For Mexican locations, we'll skip weather data fetching for now
        // since the US API doesn't support Mexican coordinates
        // In the future, this could use CONAGUA's API
        console.log(`Skipping weather data for Mexican location: ${location.nickname} (not supported by US API)`);
        
        // Set default values for Mexican locations
        location.currentAlert = 'none';
        location.currentAlertDescription = 'Weather data not available for Mexican locations';
        location.shortForecast = 'Weather data not available';
        location.detailedForecast = 'Mexican weather data is not currently supported. This location will be monitored for future weather API integration.';
        location.temperature = null;
        location.humidity = null;
        location.windSpeed = null;
        location.lastWeatherUpdate = new Date().toISOString();
        
        return location;
    }
    
    // Helper method to parse address into components
    parseAddress(address) {
        if (!address) return { street: '', city: '', state: '', zipcode: '' };
        
        // Try to parse address like "123 Main St, Salt Lake City, UT 84101"
        const parts = address.split(',').map(part => part.trim());
        
        if (parts.length >= 3) {
            const street = parts[0];
            const city = parts[1];
            const stateZip = parts[2];
            
            // Extract state and zipcode from "UT 84101" format
            const stateZipMatch = stateZip.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
            if (stateZipMatch) {
                return {
                    street: street,
                    city: city,
                    state: stateZipMatch[1],
                    zipcode: stateZipMatch[2]
                };
            }
        }
        
        // Fallback: return original address as street
        return {
            street: address,
            city: '',
            state: '',
            zipcode: ''
        };
    }
    
    // Helper method to parse address from autocomplete suggestion
    parseAddressFromSuggestion(suggestion) {
        if (!suggestion || !suggestion.formatted_address) {
            return { street: '', city: '', state: '', zipcode: '' };
        }
        
        // Parse Google's formatted_address like "123 Main St, Salt Lake City, UT 84101, USA"
        const addressParts = suggestion.formatted_address.split(', ');
        
        let street = '', city = '', state = '', zipcode = '';
        
        if (addressParts.length >= 1) {
            street = addressParts[0];
        }
        
        if (addressParts.length >= 2) {
            city = addressParts[1];
        }
        
        if (addressParts.length >= 3) {
            const stateZip = addressParts[2];
            // Extract state and zipcode from "UT 84101" format
            const stateZipMatch = stateZip.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
            if (stateZipMatch) {
                state = stateZipMatch[1];
                zipcode = stateZipMatch[2];
            } else {
                state = stateZip;
            }
        }
        
        return {
            street: street,
            city: city,
            state: state,
            zipcode: zipcode
        };
    }
    
    // Helper method to reset the location form
    resetLocationForm() {
        const form = document.getElementById('locationForm');
        const title = document.getElementById('modalTitle');
        
        // Reset form fields
        form.reset();
        
        // Reset title
        title.textContent = 'Add New Location';
        
        // Reset coordinate input
        const coordinatesInput = document.getElementById('coordinatesInput');
        
        if (coordinatesInput) {
            coordinatesInput.value = '';
        }
        
        // Clear current editing ID
        this.currentEditingId = null;
        
        // Focus on the first input field
        setTimeout(() => {
            document.getElementById('locationNickname').focus();
        }, 100);
    }
    
    // Helper method to show success message
    showSuccessMessage(message) {
        // Create or get existing success message element
        let successElement = document.getElementById('successMessage');
        if (!successElement) {
            successElement = document.createElement('div');
            successElement.id = 'successMessage';
            successElement.className = 'success-message';
            document.body.appendChild(successElement);
        }
        
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    }

    getSiteTypeDescription(siteType) {
        const descriptions = {
            'warehouse': 'Warehouse',
            'plant': 'Manufacturing Plant',
            '3pl-warehouse': '3PL Warehouse',
            'office': 'Office',
            'supplier': 'Supplier',
            'machine-shop': 'Machine Shop',
            'land': 'Land',
            'parking': 'Parking'
        };
        return descriptions[siteType] || 'Unknown Site Type';
    }

    // Returns an inline SVG for the alert cause, prioritizing tornado > thunderstorm > heat > flood > others
    getWeatherCauseIcon(location) {
        const allText = [
            location.currentAlertDescription || '',
            location.shortForecast || '',
            location.detailedForecast || '',
            location.alertTitle || ''
        ].join(' ').toLowerCase();

        // Priority: tornado > thunderstorm > heat > flood > others
        if (/tornado/.test(allText)) {
            // Tornado SVG
            return `<svg class="alert-cause-icon tornado" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="black" stroke-width="2"><path d="M4 6 Q16 2 28 6 Q24 10 8 10 Q12 14 24 14 Q20 18 12 18 Q16 22 24 22 Q20 26 8 26" fill="none"/></svg>`;
        }
        if (/thunderstorm|lightning|storm/.test(allText)) {
            // Thunderstorm SVG
            return `<svg class="alert-cause-icon thunderstorm" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="black" stroke-width="2"><polygon points="16,4 12,18 18,18 14,28 24,12 18,12 22,4" fill="black"/></svg>`;
        }
        if (/heat|hot|temperature/.test(allText)) {
            // Heat SVG
            return `<svg class="alert-cause-icon heat" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="black" stroke-width="2"><circle cx="16" cy="16" r="8" fill="none"/><line x1="16" y1="2" x2="16" y2="8"/><line x1="16" y1="24" x2="16" y2="30"/><line x1="2" y1="16" x2="8" y2="16"/><line x1="24" y1="16" x2="30" y2="16"/><line x1="7" y1="7" x2="11" y2="11"/><line x1="21" y1="21" x2="25" y2="25"/><line x1="7" y1="25" x2="11" y2="21"/><line x1="21" y1="11" x2="25" y2="7"/></svg>`;
        }
        if (/flood|inundation|overflow|high water/.test(allText)) {
            // Flood SVG
            return `<svg class="alert-cause-icon flood" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="black" stroke-width="2"><path d="M4 24 Q8 20 12 24 Q16 28 20 24 Q24 20 28 24" fill="none"/><path d="M4 20 Q8 16 12 20 Q16 24 20 20 Q24 16 28 20" fill="none"/><circle cx="8" cy="26" r="1.5" fill="black"/><circle cx="24" cy="26" r="1.5" fill="black"/></svg>`;
        }
        // Default: warning triangle
        return `<svg class="alert-cause-icon warning" viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="black" stroke-width="2"><polygon points="16,4 28,28 4,28" fill="none"/><line x1="16" y1="12" x2="16" y2="20"/><circle cx="16" cy="24" r="1.5" fill="black"/></svg>`;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherAlertMonitor();
});

// Add some custom styles for markers
const markerStyles = document.createElement('style');
markerStyles.textContent = `
    .custom-div-icon {
        background: transparent !important;
        border: none !important;
    }
    
    .custom-marker.pulse-severe {
        animation: pulse-severe 1.5s infinite;
    }
    
    @keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
        }
        70% {
            box-shadow: 0 0 0 8px rgba(255, 255, 255, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
        }
    }
    
    @keyframes pulse-severe {
        0% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.8);
            transform: scale(1);
        }
        50% {
            box-shadow: 0 0 0 12px rgba(220, 38, 38, 0.4);
            transform: scale(1.1);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
            transform: scale(1);
        }
    }
    
    .weather-alert-popup {
        font-family: 'Inter', sans-serif;
        text-align: center;
    }
    
    .fa-spin {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(markerStyles); 