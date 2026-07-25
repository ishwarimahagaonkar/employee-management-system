// Backward-compatible pagination helper.
//
// If the request supplies valid ?page & ?limit query params, returns
// { skip, limit, page, paginate: true }. Otherwise paginate is false and the
// caller should return the full result set (preserving existing client
// behaviour). A hard cap keeps a malicious/huge ?limit from being abused.
const MAX_LIMIT = 200;

function getPagination(query) {
    const page = parseInt(query.page, 10);
    const limit = parseInt(query.limit, 10);

    if (Number.isInteger(page) && page > 0 && Number.isInteger(limit) && limit > 0) {
        const cappedLimit = Math.min(limit, MAX_LIMIT);
        return {
            paginate: true,
            page,
            limit: cappedLimit,
            skip: (page - 1) * cappedLimit,
        };
    }

    return { paginate: false };
}

module.exports = { getPagination };
