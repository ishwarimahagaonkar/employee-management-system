const geolib = require("geolib");
const { COMPANY_LOCATION } = require("../config/location");

const isWithinOffice = (lat, lng) => {
    const distance = geolib.getDistance(
        {
            latitude: lat,
            longitude: lng
        },
        {
            latitude: COMPANY_LOCATION.latitude,
            longitude: COMPANY_LOCATION.longitude
        }
    );

    console.log("Distance from office:", distance);

    return distance <= COMPANY_LOCATION.radius;
};

module.exports = { isWithinOffice };