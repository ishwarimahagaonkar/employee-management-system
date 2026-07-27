// Haversine formula
// utils/distance.js

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);

  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) *
      Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // meters
};

// Treats a missing coordinate as "can't verify" -> false, but NOT a valid 0
// coordinate (equator / prime meridian), which the old falsy check wrongly
// rejected.
const isValidCoord = (v) => typeof v === "number" && !isNaN(v);

const isWithinOffice = (lat, lng, officeLat, officeLng, radius) => {
  if (!isValidCoord(lat) || !isValidCoord(lng)) return false;

  const distance = getDistance(lat, lng, officeLat, officeLng);

  return distance <= radius;
};

module.exports = { getDistance, isWithinOffice, isValidCoord };