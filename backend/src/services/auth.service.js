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

const normalizeObjectId = (value) => {
    const normalized = String(value || "").trim();
    return mongoose.Types.ObjectId.isValid(normalized) ? normalized : "";
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

const resolveJoinBusiness = async ({ businessCode, businessPassword }) => {
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

    return business;
};

const joinBusinessForUser = async (user, { businessCode, businessPassword }) => {
    ensureDatabaseReady();
    const business = await resolveJoinBusiness({ businessCode, businessPassword });

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

    if (businessMode === "join") {
        await resolveJoinBusiness({ businessCode, businessPassword });
    }

    const user = await User.create({
        name,
        email: email || undefined,
        phone: phone || undefined,
        passwordHash,
        passwordSalt: salt
    });

    try {
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
    } catch (error) {
        await User.deleteOne({ _id: user._id });
        throw error;
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

const getBusinessSnapshot = async ({ userId, businessCode, businessId }) => {
    ensureDatabaseReady();

    const normalizedBusinessCode = normalizeBusinessCode(businessCode);
    const normalizedBusinessId = normalizeObjectId(businessId);
    const normalizedUserId = normalizeObjectId(userId);

    let resolvedBusinessId = normalizedBusinessId;

    if (!resolvedBusinessId && normalizedUserId) {
        const user = await User.findById(normalizedUserId).select("businessId").lean();
        if (user?.businessId) {
            resolvedBusinessId = String(user.businessId);
        }
    }

    let business = null;

    if (resolvedBusinessId) {
        business = await Business.findById(resolvedBusinessId)
            .populate("owner", "_id name email phone role")
            .populate("members", "_id name email phone role")
            .lean();
    } else if (normalizedBusinessCode) {
        business = await Business.findOne({ businessCode: normalizedBusinessCode })
            .populate("owner", "_id name email phone role")
            .populate("members", "_id name email phone role")
            .lean();
    }

    if (!business) {
        return null;
    }

    const members = Array.isArray(business.members) ? business.members : [];

    return {
        _id: business._id,
        businessCode: business.businessCode,
        name: business.name,
        type: business.type,
        owner: business.owner || null,
        members,
        membersCount: members.length,
        collaborationEnabled: members.length > 1,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
    };
};

module.exports = {
    getAuthStatus,
    signupUser,
    loginUser,
    getBusinessSnapshot
};
