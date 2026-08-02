const Site = require("../models/Site");
const User = require("../models/User");
const { getPagination } = require("../utils/pagination");
const { ROLES, can } = require("../config/roles");

// Supervisors only ever see the sites assigned to them. Admins and managers
// see every site in their company (company-wide scope, as agreed).
const scopeFilter = (user) => {
    const filter = { companyId: user.companyId ?? null };

    if (user.role === ROLES.SUPERVISOR) {
        filter.supervisorId = user._id;
    }

    return filter;
};


// Who may change a site: admins and managers anywhere in their company, a
// supervisor only on a site they actually run.
const canEditSite = (user, site) => {
    if (can(user.role, "site:manage")) return true;

    return (
        user.role === ROLES.SUPERVISOR &&
        String(site.supervisorId ?? "") === String(user._id)
    );
};


// The same normalisation the model applies, so the pre-check compares like
// with like instead of letting "abc  construction" through to the index.
const nameKeyOf = (name) => String(name).trim().replace(/\s+/g, " ").toLowerCase();
const codeOf = (code) => String(code).trim().toUpperCase();

// Letters, digits, dash and underscore. Spaces are excluded because the code
// is meant to be a short handle used as an identifier prefix.
const CODE_PATTERN = /^[A-Z0-9_-]{2,20}$/;


// ==========================
// CREATE SITE (SUPERVISOR)
// ==========================
exports.createSite = async (req, res) => {
    try {
        const { name, code, location, description } = req.body;

        if (!name || !code || !location) {
            return res.status(400).json({
                message: "Site name, code and location are required",
            });
        }

        if (!CODE_PATTERN.test(codeOf(code))) {
            return res.status(400).json({
                message: "Site code must be 2-20 characters, using letters, numbers, dashes or underscores only",
            });
        }

        const companyId = req.user.companyId ?? null;

        // Checked here so the response explains WHICH field clashed; the unique
        // indexes below are the actual guarantee (two concurrent creates can
        // both pass this check).
        const [nameTaken, codeTaken] = await Promise.all([
            Site.findOne({ companyId, nameKey: nameKeyOf(name) }).select("_id"),
            Site.findOne({ companyId, code: codeOf(code) }).select("_id"),
        ]);

        if (nameTaken) {
            return res.status(409).json({
                message: `A site named "${String(name).trim()}" already exists in your company`,
            });
        }

        if (codeTaken) {
            return res.status(409).json({
                message: `Site code "${codeOf(code)}" is already used by another site in your company`,
            });
        }

        const site = await Site.create({
            name,
            code,
            location,
            description: description || "",
            companyId,
            // A supervisor creating a site runs it. Admins and managers can
            // reassign it afterwards.
            supervisorId: req.user._id,
            createdBy: req.user._id,
        });

        return res.status(201).json({
            message: "Site created successfully",
            site,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A site with this name or code already exists in your company",
            });
        }
        console.error("createSite error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// GET SITES
// ==========================
exports.getSites = async (req, res) => {
    try {
        const filter = scopeFilter(req.user);

        if (req.query.status === "active" || req.query.status === "inactive") {
            filter.status = req.query.status;
        }

        const { paginate, page, limit, skip } = getPagination(req.query);

        let queryBuilder = Site.find(filter)
            .populate("supervisorId", "empID fullName email")
            .sort({ createdAt: -1 });

        if (paginate) {
            queryBuilder = queryBuilder.skip(skip).limit(limit);
        }

        const [sites, total] = await Promise.all([
            queryBuilder,
            Site.countDocuments(filter),
        ]);

        return res.status(200).json({
            count: sites.length,
            total,
            page: paginate ? page : 1,
            sites,
        });

    } catch (error) {
        console.error("getSites error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// GET SITE BY ID
// ==========================
exports.getSiteById = async (req, res) => {
    try {
        const site = await Site.findOne({
            _id: req.params.id,
            ...scopeFilter(req.user),
        }).populate("supervisorId", "empID fullName email").catch(() => null);

        if (!site) {
            return res.status(404).json({ message: "Site not found" });
        }

        return res.status(200).json(site);

    } catch (error) {
        console.error("getSiteById error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// UPDATE SITE
// ==========================
// Loaded and saved rather than findOneAndUpdate: the model's normalisation
// hook runs on save only, and skipping it would let an unnormalised name past
// the case-insensitive unique index.
exports.updateSite = async (req, res) => {
    try {
        const site = await Site.findOne({
            _id: req.params.id,
            ...scopeFilter(req.user),
        }).catch(() => null);

        if (!site) {
            return res.status(404).json({ message: "Site not found" });
        }

        if (!canEditSite(req.user, site)) {
            return res.status(403).json({
                message: "You can only edit sites assigned to you",
            });
        }

        const companyId = req.user.companyId ?? null;
        const { name, code, location, description, status } = req.body;

        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({ message: "Site name can't be empty" });
            }

            const clash = await Site.findOne({
                companyId,
                nameKey: nameKeyOf(name),
                _id: { $ne: site._id },
            }).select("_id");

            if (clash) {
                return res.status(409).json({
                    message: `A site named "${String(name).trim()}" already exists in your company`,
                });
            }

            site.name = name;
        }

        if (code !== undefined) {
            if (!CODE_PATTERN.test(codeOf(code))) {
                return res.status(400).json({
                    message: "Site code must be 2-20 characters, using letters, numbers, dashes or underscores only",
                });
            }

            const clash = await Site.findOne({
                companyId,
                code: codeOf(code),
                _id: { $ne: site._id },
            }).select("_id");

            if (clash) {
                return res.status(409).json({
                    message: `Site code "${codeOf(code)}" is already used by another site in your company`,
                });
            }

            site.code = code;
        }

        if (location !== undefined) {
            if (!String(location).trim()) {
                return res.status(400).json({ message: "Location can't be empty" });
            }
            site.location = location;
        }

        if (description !== undefined) site.description = description;

        if (status !== undefined) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({ message: "Status must be 'active' or 'inactive'" });
            }
            site.status = status;
        }

        await site.save();
        await site.populate("supervisorId", "empID fullName email");

        return res.status(200).json({
            message: "Site updated successfully",
            site,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "A site with this name or code already exists in your company",
            });
        }
        console.error("updateSite error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// ASSIGN SUPERVISOR (ADMIN / MANAGER)
// ==========================
exports.assignSupervisor = async (req, res) => {
    try {
        const { supervisorId } = req.body;

        const site = await Site.findOne({
            _id: req.params.id,
            companyId: req.user.companyId ?? null,
        }).catch(() => null);

        if (!site) {
            return res.status(404).json({ message: "Site not found" });
        }

        // Explicitly clearing the assignment is allowed -- a site can sit
        // unassigned between supervisors rather than being deleted.
        if (supervisorId === null || supervisorId === "") {
            site.supervisorId = null;
            await site.save();

            return res.status(200).json({
                message: "Site is now unassigned",
                site,
            });
        }

        const supervisor = await User.findOne({
            _id: String(supervisorId),
            companyId: req.user.companyId ?? null,
            role: ROLES.SUPERVISOR,
            isActive: { $ne: false },
        }).select("empID fullName email").catch(() => null);

        if (!supervisor) {
            return res.status(400).json({
                message: "Assigned supervisor must be an active supervisor in your company",
            });
        }

        site.supervisorId = supervisor._id;
        await site.save();
        await site.populate("supervisorId", "empID fullName email");

        return res.status(200).json({
            message: `${supervisor.fullName} now runs ${site.name}`,
            site,
        });

    } catch (error) {
        console.error("assignSupervisor error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
