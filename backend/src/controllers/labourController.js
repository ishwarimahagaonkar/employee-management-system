const Labour = require("../models/Labour");
const { getPagination } = require("../utils/pagination");

// Labour is a COMPANY-WIDE master list. There is no site scoping anywhere in
// this controller: a labourer belongs to the company, and the site they worked
// on a given day lives on that day's attendance row instead. Supervisors can
// therefore search the whole list, which is what makes building a daily roster
// possible.

// The duplicate pre-check must use the SAME key the unique index is built on,
// so it comes from the model rather than being re-implemented here.
const mobileKeyOf = (mobile) => Labour.mobileKeyOf(mobile) || "";

// Length is checked against the raw digits, not the comparison key, so a
// number written with a country code isn't judged by its truncated form.
// Loose on purpose -- an international range rather than an India-only rule.
const mobileDigitsOf = (mobile) => String(mobile || "").replace(/\D/g, "");
const MOBILE_MIN_DIGITS = 7;
const MOBILE_MAX_DIGITS = 15;

// Escaped so a search for "a+b" or "(" can't blow up the regex or be used to
// craft an expensive pattern.
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


// ==========================
// CREATE LABOUR
// ==========================
exports.createLabour = async (req, res) => {
    try {
        const { labourId, fullName, mobile, address } = req.body;

        if (!labourId || !String(labourId).trim()) {
            return res.status(400).json({ message: "Labour ID is required" });
        }

        if (!fullName || !String(fullName).trim()) {
            return res.status(400).json({ message: "Full name is required" });
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
        // The whole company's master list -- every role that may see labour
        // sees all of it. A supervisor needs this to build a daily roster from
        // anyone available, not just people who happened to work their site
        // before. ?siteId is deliberately no longer accepted: labour has no
        // site, so filtering by one would be meaningless.
        const filter = { companyId: req.user.companyId ?? null };

        if (req.query.status === "active" || req.query.status === "inactive") {
            filter.status = req.query.status;
        }

        // Server-side search so the roster picker stays usable when the master
        // list runs to hundreds of names.
        if (req.query.search && String(req.query.search).trim()) {
            const term = new RegExp(escapeRegex(String(req.query.search).trim()), "i");
            filter.$or = [{ fullName: term }, { labourId: term }, { mobile: term }];
        }

        const { paginate, page, limit, skip } = getPagination(req.query);

        let queryBuilder = Labour.find(filter).sort({ fullName: 1 });

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
        const labour = await Labour.findOne({
            _id: req.params.id,
            companyId: req.user.companyId ?? null,
        }).catch(() => null);

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
        const labour = await Labour.findOne({
            _id: req.params.id,
            companyId: req.user.companyId ?? null,
        }).catch(() => null);

        if (!labour) {
            return res.status(404).json({ message: "Labour not found" });
        }

        const companyId = req.user.companyId ?? null;
        const { labourId, fullName, mobile, address, status } = req.body;

        // There is no "move labour to another site" any more, and that is the
        // point: moving a labourer used to rewrite where they had always
        // worked. Which site they work is decided per day, on the roster.

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
