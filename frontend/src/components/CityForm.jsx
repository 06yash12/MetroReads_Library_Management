import { useState, useEffect } from 'react';
import { FiMapPin, FiGlobe, FiChevronDown, FiX } from 'react-icons/fi';

// Data for countries, states, and cities
const COUNTRIES_DATA = {
  'India': {
    states: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ],
    cities: {
      'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Other'],
      'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Namsai', 'Other'],
      'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Other'],
      'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Other'],
      'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Other'],
      'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Other'],
      'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Other'],
      'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Other'],
      'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Other'],
      'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Other'],
      'Karnataka': ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Other'],
      'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Other'],
      'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Other'],
      'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Other'],
      'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Other'],
      'Meghalaya': ['Shillong', 'Tura', 'Nongstoin', 'Jowai', 'Other'],
      'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Other'],
      'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Other'],
      'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Other'],
      'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Other'],
      'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Other'],
      'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Other'],
      'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Other'],
      'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Other'],
      'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Other'],
      'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Other'],
      'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Other'],
      'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Other'],
      'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Rangat', 'Car Nicobar', 'Other'],
      'Chandigarh': ['Chandigarh', 'Other'],
      'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa', 'Other'],
      'Delhi': ['New Delhi', 'Delhi', 'Other'],
      'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Other'],
      'Ladakh': ['Leh', 'Kargil', 'Other'],
      'Lakshadweep': ['Kavaratti', 'Agatti', 'Minicoy', 'Other'],
      'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Other']
    }
  },
  'United States': {
    states: ['California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois', 'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia', 'Washington', 'Arizona', 'Massachusetts', 'Tennessee', 'Indiana', 'Missouri', 'Maryland', 'Wisconsin', 'Colorado', 'Minnesota', 'South Carolina', 'Alabama', 'Louisiana', 'Kentucky', 'Oregon', 'Oklahoma', 'Connecticut', 'Utah', 'Other'],
    cities: {
      'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Other'],
      'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Other'],
      'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Other'],
      'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Other'],
      'Other': ['Other']
    }
  },
  'United Kingdom': {
    states: ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Other'],
    cities: {
      'England': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Other'],
      'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Other'],
      'Wales': ['Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Other'],
      'Northern Ireland': ['Belfast', 'Derry', 'Lisburn', 'Newry', 'Other'],
      'Other': ['Other']
    }
  },
  'Canada': {
    states: ['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland and Labrador', 'Prince Edward Island', 'Other'],
    cities: {
      'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'Other'],
      'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Other'],
      'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Other'],
      'Alberta': ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Other'],
      'Other': ['Other']
    }
  },
  'Australia': {
    states: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory', 'Other'],
    cities: {
      'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Central Coast', 'Other'],
      'Victoria': ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Other'],
      'Queensland': ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville', 'Other'],
      'Western Australia': ['Perth', 'Fremantle', 'Mandurah', 'Bunbury', 'Other'],
      'Other': ['Other']
    }
  },
  'Other': {
    states: ['Other'],
    cities: {
      'Other': ['Other']
    }
  }
};

const TOP_COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'China', 'Brazil', 'Mexico', 'Italy', 'Spain', 'South Korea', 'Indonesia', 'Netherlands', 'Saudi Arabia', 'Turkey', 'Switzerland', 'Poland', 'Belgium', 'Sweden', 'Argentina', 'Austria', 'Norway', 'United Arab Emirates', 'Nigeria', 'Israel', 'Ireland', 'Singapore', 'Other'];

const CityForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null, 
  title = "Add City",
  submitButtonText = "Add City"
}) => {
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    country: 'India'
  });
  
  const [errors, setErrors] = useState({});
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  const [customCountry, setCustomCountry] = useState('');
  const [customState, setCustomState] = useState('');
  const [customCity, setCustomCity] = useState('');
  
  const [showCustomCountryInput, setShowCustomCountryInput] = useState(false);
  const [showCustomStateInput, setShowCustomStateInput] = useState(false);
  const [showCustomCityInput, setShowCustomCityInput] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        state: initialData.state || '',
        country: initialData.country || 'India'
      });
    } else {
      setFormData({
        name: '',
        state: '',
        country: 'India'
      });
    }
    setErrors({});
    setShowCustomCountryInput(false);
    setShowCustomStateInput(false);
    setShowCustomCityInput(false);
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    const cityName = showCustomCityInput ? customCity : formData.name;
    if (!cityName.trim()) {
      newErrors.name = 'City name is required';
    }
    
    const countryName = showCustomCountryInput ? customCountry : formData.country;
    if (!countryName.trim()) {
      newErrors.country = 'Country is required';
    }
    
    const stateName = showCustomStateInput ? customState : formData.state;
    if (!stateName.trim()) {
      newErrors.state = 'State/Province is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const submitData = {
        name: showCustomCityInput ? customCity : formData.name,
        state: showCustomStateInput ? customState : formData.state,
        country: showCustomCountryInput ? customCountry : formData.country
      };
      onSubmit(submitData);
      onClose();
    }
  };

  const handleCountryChange = (country) => {
    if (country === 'Other') {
      setShowCustomCountryInput(true);
      setFormData(prev => ({ ...prev, country: '', state: '', name: '' }));
    } else {
      setShowCustomCountryInput(false);
      setShowCustomStateInput(false);
      setShowCustomCityInput(false);
      setFormData(prev => ({ ...prev, country, state: '', name: '' }));
    }
    setShowCountryDropdown(false);
  };

  const handleStateChange = (state) => {
    if (state === 'Other') {
      setShowCustomStateInput(true);
      setFormData(prev => ({ ...prev, state: '', name: '' }));
    } else {
      setShowCustomStateInput(false);
      setShowCustomCityInput(false);
      setFormData(prev => ({ ...prev, state, name: '' }));
    }
    setShowStateDropdown(false);
  };

  const handleCityChange = (city) => {
    if (city === 'Other') {
      setShowCustomCityInput(true);
      setFormData(prev => ({ ...prev, name: '' }));
    } else {
      setShowCustomCityInput(false);
      setFormData(prev => ({ ...prev, name: city }));
    }
    setShowCityDropdown(false);
  };

  const getAvailableStates = () => {
    const country = showCustomCountryInput ? 'Other' : formData.country;
    return COUNTRIES_DATA[country]?.states || ['Other'];
  };

  const getAvailableCities = () => {
    const country = showCustomCountryInput ? 'Other' : formData.country;
    const state = showCustomStateInput ? 'Other' : formData.state;
    return COUNTRIES_DATA[country]?.cities?.[state] || ['Other'];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FiMapPin className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Country Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Country <span className="text-red-500">*</span>
            </label>
            {!showCustomCountryInput ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <div className="flex items-center">
                    <FiGlobe className="w-4 h-4 text-gray-500 mr-2" />
                    <span className={formData.country ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.country || 'Select Country'}
                    </span>
                  </div>
                  <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showCountryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {TOP_COUNTRIES.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => handleCountryChange(country)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none flex items-center"
                      >
                        <span className="text-gray-700">{country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter country name"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCountryInput(false);
                    setCustomCountry('');
                    setFormData(prev => ({ ...prev, country: 'India' }));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Back to country list
                </button>
              </div>
            )}
            {errors.country && (
              <p className="text-red-500 text-sm mt-1">{errors.country}</p>
            )}
          </div>

          {/* State/Province Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              State/Province <span className="text-red-500">*</span>
            </label>
            {!showCustomStateInput ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStateDropdown(!showStateDropdown)}
                  disabled={!formData.country && !showCustomCountryInput}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <span className={formData.state ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.state || 'Select State/Province'}
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showStateDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {getAvailableStates().map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => handleStateChange(state)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        <span className="text-gray-700">{state}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customState}
                  onChange={(e) => setCustomState(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter state/province name"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomStateInput(false);
                    setCustomState('');
                    setFormData(prev => ({ ...prev, state: '' }));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Back to state list
                </button>
              </div>
            )}
            {errors.state && (
              <p className="text-red-500 text-sm mt-1">{errors.state}</p>
            )}
          </div>

          {/* City Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              City <span className="text-red-500">*</span>
            </label>
            {!showCustomCityInput ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  disabled={!formData.state && !showCustomStateInput}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <span className={formData.name ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.name || 'Select City'}
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showCityDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {getAvailableCities().map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleCityChange(city)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        <span className="text-gray-700">{city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter city name"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCityInput(false);
                    setCustomCity('');
                    setFormData(prev => ({ ...prev, name: '' }));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ← Back to city list
                </button>
              </div>
            )}
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
            >
              {submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CityForm;
