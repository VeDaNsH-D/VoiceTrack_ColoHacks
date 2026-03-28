const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true,
            select: false
        },
        passwordSalt: {
            type: String,
            required: true,
            select: false
        },
        businessId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            default: null
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre("validate", function setIdentityValidation() {
    if (!this.phone && !this.email) {
        this.invalidate("phone", "Phone or email is required");
    }
});

userSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.passwordSalt;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
