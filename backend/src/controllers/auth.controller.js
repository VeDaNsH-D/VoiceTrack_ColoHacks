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

        const user = await signupUser({
            name,
            email,
            phone,
            password
        });
        const token = generateToken(user);

        return res.status(201).json({
            success: true,
            user,
            token
        });
    } catch (error) {
        const statusCode = error.message.includes("already exists") ? 409 : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
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

        return res.status(200).json({
            success: true,
            user,
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

module.exports = {
  getAuthStatus,
  signup,
  login
};
