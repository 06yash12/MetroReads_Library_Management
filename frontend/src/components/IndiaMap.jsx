import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const IndiaMap = () => {
  const mapContainerRef = useRef(null);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState('');

  // Fetch cities from the database
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/cities/public`);
        if (response.data && response.data.data) {
          // Transform cities data for the map
          const citiesData = {};
          response.data.data.forEach(city => {
            const stateName = city.state || 'Other';
            if (!citiesData[stateName]) {
              citiesData[stateName] = [];
            }
            citiesData[stateName].push({
              city: city.name,
              coords: getCityCoordinates(city.name),
              id: city.id
            });
          });
          setCities(citiesData);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
        // Use fallback data if API fails (not authenticated or error)
        console.log('Using fallback city data');
        setCities(getFallbackCities());
      }
    };

    fetchCities();
  }, []);

  // Helper function to get city coordinates (you should store these in your database)
  const getCityCoordinates = (cityName) => {
    const coordinates = {
      'Mumbai': [72.8777, 19.0760],
      'Pune': [73.8567, 18.5204],
      'Bengaluru': [77.5946, 12.9716],
      'Bangalore': [77.5946, 12.9716],
      'Mysuru': [76.6394, 12.2958],
      'Mysore': [76.6394, 12.2958],
      'New Delhi': [77.1025, 28.7041],
      'Delhi': [77.1025, 28.7041],
      'Chennai': [80.2707, 13.0827],
      'Coimbatore': [76.9558, 11.0168],
      'Kolkata': [88.3639, 22.5726],
      'Ahmedabad': [72.5714, 23.0225],
      'Jaipur': [75.7873, 26.9124],
      'Hyderabad': [78.4867, 17.3850],
      'Srinagar': [74.7973, 34.0837],
      'Jammu': [74.8570, 32.7266],
      'Lucknow': [80.9462, 26.8467],
      'Chandigarh': [76.7794, 30.7333],
      'Nagpur': [79.0882, 21.1458],
      'Nashik': [73.7898, 19.9975],
      'Surat': [72.8311, 21.1702],
      'Vadodara': [73.1812, 22.3072],
      'Rajkot': [70.8022, 22.3039],
      'Jodhpur': [73.0243, 26.2389],
      'Udaipur': [73.6833, 24.5854],
      'Kota': [75.8648, 25.2138],
      'Kanpur': [80.3319, 26.4499],
      'Agra': [78.0081, 27.1767],
      'Varanasi': [82.9739, 25.3176]
    };
    return coordinates[cityName] || [78.9629, 23.5937]; // Default to center of India
  };

  // Fallback cities if API fails
  const getFallbackCities = () => {
    return {
      "Maharashtra": [
        { city: "Mumbai", coords: [72.8777, 19.0760], id: 1 },
        { city: "Pune", coords: [73.8567, 18.5204], id: 2 }
      ],
      "Karnataka": [
        { city: "Bengaluru", coords: [77.5946, 12.9716], id: 3 },
        { city: "Mysuru", coords: [76.6394, 12.2958], id: 4 }
      ],
      "Delhi": [
        { city: "New Delhi", coords: [77.1025, 28.7041], id: 5 }
      ]
    };
  };

  useEffect(() => {
    // Load D3.js dynamically
    const loadD3 = () => {
      return new Promise((resolve, reject) => {
        if (window.d3) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    // Load map script
    const loadMapScript = () => {
      return new Promise((resolve, reject) => {
        if (window.initIndiaMap) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = '/map.js';
        script.type = 'module';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    // Initialize map
    const initMap = async () => {
      try {
        await loadD3();
        await loadMapScript();

        // Wait a bit for the script to be fully loaded
        setTimeout(() => {
          if (window.initIndiaMap && mapContainerRef.current) {
            window.initIndiaMap('india-map-container', cities);
          }
        }, 100);
      } catch (error) {
        console.error('Error loading map:', error);
      }
    };

    if (Object.keys(cities).length > 0) {
      initMap();
    }

    // Listen for state selection events
    const handleStateSelection = (event) => {
      setSelectedState(event.detail.stateName);
    };

    window.addEventListener('stateSelected', handleStateSelection);

    // Cleanup
    return () => {
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = '';
      }
      window.removeEventListener('stateSelected', handleStateSelection);
    };
  }, [cities]);

  return (
    <div className="w-full overflow-hidden h-full flex flex-col">
      {/* Map Title with Selected State - Single Row */}
      <div className="flex items-center justify-between w-full mb-1">
        <h2 className="text-xl font-bold text-gray-900">Our Library Network Across India</h2>
        {selectedState && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <span className="font-bold text-base">{selectedState}</span>
          </div>
        )}
      </div>

      {/* Map Container - Fits to border edges with fixed positioning */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl overflow-hidden p-1 w-full flex-1">
        <div
          id="india-map-container"
          ref={mapContainerRef}
          className="w-full h-full"
          style={{
            touchAction: 'none',
            userSelect: 'none',
            overflow: 'hidden',
            position: 'relative'
          }}
          onWheel={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
};

export default IndiaMap;
