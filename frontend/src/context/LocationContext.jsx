import React, { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
        address: '',
        isLocationFetched: false,
        error: null
    });

    const fetchReverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`);
            const data = await response.json();
            return data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        } catch (error) {
            console.error("Reverse geocoding failed", error);
            return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        }
    };

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, error: "Geolocation not supported" }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const addr = await fetchReverseGeocode(latitude, longitude);
                
                const newLocation = {
                    latitude,
                    longitude,
                    address: addr,
                    isLocationFetched: true,
                    error: null
                };
                
                setLocation(newLocation);
                localStorage.setItem('user_location', JSON.stringify(newLocation));
            },
            (error) => {
                console.error("Geolocation error:", error);
                setLocation(prev => ({ ...prev, error: "Permission denied or unavailable" }));
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        const savedLocation = localStorage.getItem('user_location');
        if (savedLocation) {
            setLocation(JSON.parse(savedLocation));
        } else {
            detectLocation(); // Auto-fetch on first open
        }
    }, []);

    const manualUpdateLocation = (addr) => {
        const updated = { ...location, address: addr };
        setLocation(updated);
        localStorage.setItem('user_location', JSON.stringify(updated));
    };

    return (
        <LocationContext.Provider value={{ ...location, detectLocation, manualUpdateLocation }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocationContext = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocationContext must be used within a LocationProvider');
    }
    return context;
};
