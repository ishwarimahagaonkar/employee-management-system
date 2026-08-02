const Labour = require("../models/Labour");
const Site = require("../models/Site");
const { getPagination } = require("../utils/pagination");
const { ROLES } = require("../config/roles");

// The duplicate pre-check must use the SAME key the unique index is built on,
// so it comes from the model rather than being re-implemented here.
const mobileKeyOf = (mobile) => Labour.mobileKeyOf(mobile) || "";

// Length is checked against the raw digits, not the comparison key, so a
// number written with a country code isn't judged by its truncated form.
// Loose on purpose -- an international range rather than an India-only rule.
const mobileDigitsOf = (mobile) => String(mobile || "").replace(/\D/g, "");
const MOBILE_MIN_DIGITS = 7;
const MOBILE_MAX_DIGITS = 15;


/**
 * The site ids this user may see labour for. Returns null when the user is
 * unrestricted (admin and manager see the whole company).
 */
const accessibleSiteIds = async (user) => {
    if (user.role !== ROLES.SUPERVISOR) return null;

    const sites = await Site.find({
        companyId: user.companyId ?? null,
        supervisorId: user._id,
    }).select("_id");

    return sites.map((s) => s._id);
};


/**
 * Loads a site the user is allowed to add or edit labour on.
 * Returns { site } or { error, status } -- the status travels with the error so
 * a missing field (400) isn't reported as a permission problem (403).
 */
const resolveWritableSite = async (siteId, user) => {
    if (!siteId) return { error: "Site is required", status: 400 };

    const site = await Site.findOne({
        _id: String(siteId),
        companyId: user.companyId ?? null,
    }).catch(() => null);

    if (!site) return { error: "Site not found", status: 404 };

    // A supervisor only runs their own sites; an admin may work on any of them.
    if (
        user.role === ROLES.SUPERVISOR &&
        String(site.supervisorId ?? "") !== String(user._id)
    ) {
        return {
            error: "You can only manage labour on sites assigned to you",
            status: 403,
        };
    }

    return { site };
};


// ==========================
// CREATE LABOUR
// ==========================
exports.createLabour = async (req, res) => {
    try {
        const { siteId, labourId, fullName, mobile, address } = req.body;

        if (!labourId || !String(labourId).trim()) {
            return res.status(400).json({ message: "Labour ID is required" });
        }

        if (!fullName || !String(fullName).trim()) {
            return res.status(400).json({ message: "Full name is required" });
        }

        const { site, error, status } = await resolveWritableSite(siteId, req.user);
        if (error) {
            return res.status(status).json({ message: error });
        }

        const companyId = req.user.companyId ?? null;

        // Mobile is optional -- only validate it when one was actually given.
        const mobileDigits = mobileDigitsOf(mobile);
        if (mobileDigits && (mobileDigits.length < MOBILE_MIN_DIGITS || mobileDigits.length > MOBILE_MAX_DIGITS)) {
            return res.status(400).json({
                message: `Mobile number must be between ${MOBILE_MIN_DIGITS} and ${MOBILE_MAX_DIGITS} digits`,
            });
        }

        const mobileKey = mobileKeyOf(mobile);

        // Checked here so the response says WHICH field clashed and who holds
        // it. The unique indexes are the real guarantee -- two simultaneous
        // creates can both pass this check.
        const idTaken = await Labour.findOne({
            companyId,
            labourIdKey: String(labourId).trim().toUpperCase(),
        }).select("fullName");

        if (idTaken) {
            return res.status(409).json({
                message: `Labour ID "${String(labourId).trim()}" is already used by ${idTaken.fullName}`,
            });
        }

        if (mobileKey) {
            const mobileTaken = await Labour.findOne({ companyId, mobileKey }).select("fullName labourId");

            if (mobileTaken) {
                return res.status(409).json({
                    message: `That mobile number is already registered to ${mobileTaken.fullName} (${mobileTaken.labourId})`,
                });
            }
        }

        const labour = await Labour.create({
            companyId,
            siteId: site._id,
            labourId,
            fullName,
            mobile: mobile || "",
            address: address || "",
            createdBy: req.user._id,
        });

        return res.status(201).json({
            message: "Labour added successfully",
            labour,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This labour ID or mobile number is already registered in your company",
            });
        }
        console.error("createLabour error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// GET LABOUR
// ==========================
exports.getLabour = async (req, res) => {
    try {
        const filter = { companyId: req.user.companyId ?? null };

        const siteIds = await accessibleSiteIds(req.user);
        if (siteIds !== null) {
            filter.siteId = { $in: siteIds };
        }

        // Narrowing to one site must stay inside whatever the user may already
        // see, so a supervisor can't read another site's labour by passing its id.
        if (req.query.siteId) {
            if (siteIds !== null && !siteIds.some((id) => String(id) === String(req.query.siteId))) {
                return res.status(403).json({
                    message: "You can only view labour on sites assigned to you",
                });
            }
            filter.siteId = String(req.query.siteId);
        }

        if (req.query.status === "active" || req.query.status === "inactive") {
            filter.status = req.query.status;
        }

        const { paginate, page, limit, skip } = getPagination(req.query);

        let queryBuilder = Labour.find(filter)
            .populate("siteId", "name code")
            .sort({ createdAt: -1 });

        if (paginate) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }

        const [labour, total] = await Promise.all([
            queryBuilder,
            Labour.countDocuments(filter),
        ]);

        return res.status(200).json({
            count: labour.length,
            total,
            page: paginate ? page : 1,
            labour,
        });

    } catch (error) {
        console.error("getLabour error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// GET LABOUR BY ID
// ==========================
exports.getLabourById = async (req, res) => {
    try {
        const filter = {
            _id: req.params.id,
            companyId: req.user.companyId ?? null,
        };

        const siteIds = await accessibleSiteIds(req.user);
        if (siteIds !== null) {
            filter.siteId = { $in: siteIds };
        }

        const labour = await Labour.findOne(filter)
            .populate("siteId", "name code")
            .catch(() => null);

        if (!labour) {
            return res.status(404).json({ message: "Labour not found" });
        }

        return res.status(200).json(labour);

    } catch (error) {
        console.error("getLabourById error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// UPDATE LABOUR
// ==========================
// Load-modify-save rather than findOneAndUpdate: the model's normalisation
// hook only runs on save, and skipping it would leave labourIdKey / mobileKey
// stale and let a duplicate past the unique indexes.
exports.updateLabour = async (req, res) => {
    try {
        const filter = {
            _id: req.params.id,
            companyId: req.user.companyId ?? null,
        };

        const siteIds = await accessibleSiteIds(req.user);
        if (siteIds !== null) {
            filter.siteId = { $in: siteIds };
        }

        const labour = await Labour.findOne(filter).catch(() => null);

        if (!labour) {
            return res.status(404).json({ message: "Labour not found" });
        }

        const companyId = req.user.companyId ?? null;
        const { siteId, labourId, fullName, mobile, address, status } = req.body;

        // Moving labour to another site: the destination must also be one the
        // user may write to, or a supervisor could push labour onto any site.
        if (siteId !== undefined && String(siteId) !== String(labour.siteId)) {
            const { site, error, status } = await resolveWritableSite(siteId, req.user);
            if (error) {
                return res.status(status).json({ message: error });
            }
            labour.siteId = site._id;
        }

        if (labourId !== undefined) {
            if (!String(labourId).trim()) {
                return res.status(400).json({ message: "Labour ID can't be empty" });
            }

            const clash = await Labour.findOne({
                companyId,
                labourIdKey: String(labourId).trim().toUpperCase(),
                _id: { $ne: labour._id },
            }).select("fullName");

            if (clash) {
                return res.status(409).json({
                    message: `Labour ID "${String(labourId).trim()}" is already used by ${clash.fullName}`,
                });
            }

            labour.labourId = labourId;
        }

        if (fullName !== undefined) {
            if (!String(fullName).trim()) {
                return res.status(400).json({ message: "Full name can't be empty" });
            }
            labour.fullName = fullName;
        }

        if (mobile !== undefined) {
            const mobileDigits = mobileDigitsOf(mobile);

            if (mobileDigits && (mobileDigits.length < MOBILE_MIN_DIGITS || mobileDigits.length > MOBILE_MAX_DIGITS)) {
                return res.status(400).json({
                    message: `Mobile number must be between ${MOBILE_MIN_DIGITS} and ${MOBILE_MAX_DIGITS} digits`,
                });
            }

            const mobileKey = mobileKeyOf(mobile);

            if (mobileKey) {
                const clash = await Labour.findOne({
                    companyId,
                    mobileKey,
                    _id: { $ne: labour._id },
                }).select("fullName labourId");

                if (clash) {
                    return res.status(409).json({
                        message: `That mobile number is already registered to ${clash.fullName} (${clash.labourId})`,
                    });
                }
            }

            labour.mobile = mobile || "";
        }

        if (address !== undefined) labour.address = address;

        if (status !== undefined) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({ message: "Status must be 'active' or 'inactive'" });
            }
            labour.status = status;
        }

        await labour.save();
        await labour.populate("siteId", "name code");

        return res.status(200).json({
            message: "Labour updated successfully",
            labour,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This labour ID or mobile number is already registered in your company",
            });
        }
        console.error("updateLabour error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
