const mongoose = require("mongoose");
async function getAuthStatus() {
  return {
    authenticated: false,
    message: "Auth service placeholder",
  };
}
const crypto = require("crypto");

const User = require("../models/user.model");
const Business = require("../models/business.model");

const ensureDatabaseReady = () => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("Authentication requires MongoDB. Configure MONGO_URI and restart the backend.");
    }
};

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
    const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return {
        salt,
        passwordHash
    };
};

const verifyPassword = (password, passwordHash, salt) => {
    const hashedInput = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
        Buffer.from(hashedInput, "hex"),
        Buffer.from(passwordHash, "hex")
    );
};

const buildBusinessName = (name) => {
    return `${name}'s Business`;
};

const normalizeBusinessCode = (value) => {
    return String(value || "").trim().toUpperCase();
};

const generateBusinessCodeCandidate = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";

    for (let index = 0; index < 6; index += 1) {
        suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    return `BIZ-${suffix}`;
};

const generateUniqueBusinessCode = async () => {
    ensureDatabaseReady();

    for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = generateBusinessCodeCandidate();
        const existing = await Business.findOne({ businessCode: candidate }).select("_id");

        if (!existing) {
            return candidate;
        }
    }

    throw new Error("Unable to generate unique business code. Please try again.");
};

const buildIdentityQuery = ({ email, phone }) => {
    if (email && phone) {
        return {
            $or: [{ email }, { phone }]
        };
    }

    if (email) {
        return { email };
    }

    return { phone };
};

const createBusinessForUser = async (user, { businessName, businessType, businessPassword }) => {
    ensureDatabaseReady();
    const businessCode = await generateUniqueBusinessCode();
    const { salt, passwordHash } = hashPassword(businessPassword);
    const business = await Business.create({
        businessCode,
        accessPasswordHash: passwordHash,
        accessPasswordSalt: salt,
        name: businessName || buildBusinessName(user.name),
        type: businessType || "general",
        owner: user._id,
        members: [user._id]
    });

    user.businessId = business._id;
    user.role = "owner";
    await user.save();

    return business;
};

const joinBusinessForUser = async (user, { businessCode, businessPassword }) => {
    ensureDatabaseReady();
    const normalizedCode = normalizeBusinessCode(businessCode);

    const business = await Business.findOne({ businessCode: normalizedCode })
        .select("+accessPasswordHash +accessPasswordSalt");

    if (!business) {
        throw new Error("Business ID not found");
    }

    const validAccessPassword = verifyPassword(
        businessPassword,
        business.accessPasswordHash,
        business.accessPasswordSalt
    );

    if (!validAccessPassword) {
        throw new Error("Invalid business password");
    }

    user.businessId = business._id;
    user.role = "staff";
    await user.save();

    await Business.updateOne(
        { _id: business._id },
        { $addToSet: { members: user._id } }
    );

    return business;
};

const signupUser = async ({
    name,
    email,
    phone,
    password,
    businessMode,
    businessCode,
    businessPassword,
    businessName,
    businessType
}) => {
    ensureDatabaseReady();
    const existingUser = await User.findOne(buildIdentityQuery({ email, phone }));

    if (existingUser) {
        throw new Error("User already exists with this email or phone");
    }

    const { salt, passwordHash } = hashPassword(password);

    const user = await User.create({
        name,
        email: email || undefined,
        phone: phone || undefined,
        passwordHash,
        passwordSalt: salt
    });

    if (businessMode === "join") {
        await joinBusinessForUser(user, {
            businessCode,
            businessPassword
        });
    } else {
        await createBusinessForUser(user, {
            businessName,
            businessType,
            businessPassword
        });
    }

    return User.findById(user._id).populate("businessId");
};

const loginUser = async ({ identifier, password }) => {
    ensureDatabaseReady();
    const query = identifier.includes("@")
        ? { email: identifier }
        : { phone: identifier };

    const user = await User.findOne(query)
        .select("+passwordHash +passwordSalt")
        .populate("businessId");

    if (!user) {
        throw new Error("Invalid credentials");
    }

    const isPasswordValid = verifyPassword(password, user.passwordHash, user.passwordSalt);

    if (!isPasswordValid) {
        throw new Error("Invalid credentials");
    }

    return user;
};

module.exports = {
    getAuthStatus,
    signupUser,
    loginUser
};
