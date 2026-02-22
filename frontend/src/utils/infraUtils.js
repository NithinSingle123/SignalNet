import infraData from '../data/infrastructure.json';
import { calculateHaversine } from './geoUtils';

/**
 * Get nearest infrastructure points of a specific type.
 * @param {number} lat - Target latitude
 * @param {number} lon - Target longitude
 * @param {string} type - Infrastructure type (hospital, police, unit)
 * @param {number} limit - Number of results to return
 * @returns {Array} - Array of nearest infrastructure objects with distance
 */
export const getNearestInfra = (lat, lon, type, limit = 3) => {
    return infraData
        .filter(i => i.type === type)
        .map(i => ({
            ...i,
            distance: calculateHaversine(lat, lon, i.lat, i.lon)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
};

/**
 * Get all nearest infrastructure points (all types).
 * @param {number} lat 
 * @param {number} lon 
 * @param {number} limitPerType 
 * @returns {Array}
 */
export const getAllNearestInfra = (lat, lon, limitPerType = 3) => {
    return [
        ...getNearestInfra(lat, lon, 'hospital', limitPerType),
        ...getNearestInfra(lat, lon, 'police', limitPerType),
        ...getNearestInfra(lat, lon, 'unit', limitPerType)
    ];
};
