// NoSQL-injection guard. Recursively strips any object key that starts with
// "$" or contains "." from req.body and req.params, so user input can't smuggle
// Mongo query operators (e.g. {"email": {"$gt": ""}}) into a query.
//
// Written as a custom middleware because express-mongo-sanitize reassigns
// req.query, which is a read-only getter in Express 5 and throws. req.query is
// left untouched here; callers only ever read primitive query params from it.
function scrub(value) {
    if (Array.isArray(value)) {
        value.forEach(scrub);
        return;
    }
    if (value && typeof value === "object") {
        for (const key of Object.keys(value)) {
            if (key.startsWith("$") || key.includes(".")) {
                delete value[key];
            } else {
                scrub(value[key]);
            }
        }
    }
}

module.exports = function sanitize(req, res, next) {
    if (req.body) scrub(req.body);
    if (req.params) scrub(req.params);
    next();
};
