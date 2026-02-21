// utils/geo.js
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // meters
}

function isWithinRadius(driverLat, driverLng, targetLat, targetLng, radius = 200) {
  const distance = getDistanceInMeters(
    driverLat,
    driverLng,
    targetLat,
    targetLng
  );

  return {
    allowed: distance <= radius,
    distance: Math.round(distance),
  };
}

module.exports = {
  isWithinRadius,
};
