const authService = require("../services/auth.service");

async function getAuthStatus(req, res, next) {
  try {
    const result = await authService.getAuthStatus();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

const { signupUser, loginUser } = authService;
const { generateToken } = require("../services/jwt.service");

const buildBusinessSummary = (user) => {
    if (!user?.businessId) {
        return null;
    }

    return {
        _id: user.businessId._id,
        businessCode: user.businessId.businessCode,
        name: user.businessId.name,
        type: user.businessId.type
    };
};

const normalizePhone = (phone) => {
    return String(phone || "").replace(/\s+/g, "").trim();
};

const normalizeEmail = (email) => {
    return String(email || "").trim().toLowerCase();
};

const normalizeName = (name) => {
    return String(name || "").trim();
};

const isValidPhone = (phone) => {
    return /^\+?[0-9]{10,15}$/.test(phone);
};

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const signup = async (req, res) => {
    try {
        const name = normalizeName(req.body.name);
        const email = normalizeEmail(req.body.email);
        const phone = normalizePhone(req.body.phone);
        const password = String(req.body.password || "");
        const businessMode = String(req.body.businessMode || "create").trim().toLowerCase();
        const businessCode = String(req.body.businessCode || "").trim().toUpperCase();
        const businessPassword = String(req.body.businessPassword || "");
        const businessName = normalizeName(req.body.businessName);
        const businessType = normalizeName(req.body.businessType || "general").toLowerCase();

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required"
            });
        }

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number is required"
            });
        }

        if (email && !isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid phone number"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        if (!["create", "join"].includes(businessMode)) {
            return res.status(400).json({
                success: false,
                message: "businessMode must be either create or join"
            });
        }

        if (businessPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Business password must be at least 6 characters long"
            });
        }

        if (businessMode === "join" && !businessCode) {
            return res.status(400).json({
                success: false,
                message: "Business ID is required to join an existing business"
            });
        }

        const user = await signupUser({
            name,
            email,
            phone,
            password,
            businessMode,
            businessCode,
            businessPassword,
            businessName,
            businessType
        });
        const token = generateToken(user);
        const business = buildBusinessSummary(user);

        return res.status(201).json({
            success: true,
            user,
            business,
            token
        });
    } catch (error) {
        const errorMessage = String(error.message || "");
        const statusCode = errorMessage.includes("already exists")
            ? 409
            : errorMessage.includes("not found")
                ? 404
                : errorMessage.includes("Invalid business password")
                    ? 401
                    : 500;

        return res.status(statusCode).json({
            success: false,
            message: errorMessage || "Signup failed"
        });
    }
};

const login = async (req, res) => {
    try {
        const identifier = String(
            req.body.identifier || req.body.email || req.body.phone || ""
        )
            .trim()
            .toLowerCase();
        const password = String(req.body.password || "");

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Identifier and password are required"
            });
        }

        const user = await loginUser({
            identifier,
            password
        });
        const token = generateToken(user);
        const business = buildBusinessSummary(user);

        return res.status(200).json({
            success: true,
            user,
            business,
            token
        });
    } catch (error) {
        const statusCode = error.message === "Invalid credentials" ? 401 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

const getBusinessDetails = async (req, res) => {
    try {
        const userId = String(req.query.userId || "").trim();
        const businessCode = String(req.query.businessCode || "").trim().toUpperCase();
        const businessId = String(req.query.businessId || "").trim();

        if (!userId && !businessCode && !businessId) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one of userId, businessCode, or businessId"
            });
        }

        const business = await authService.getBusinessSnapshot({
            userId,
            businessCode,
            businessId
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                message: "Business not found"
            });
        }

        return res.status(200).json({
            success: true,
            storedInDb: true,
            business
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load business details"
        });
    }
};

module.exports = {
  getAuthStatus,
  signup,
  login,
  getBusinessDetails
};
