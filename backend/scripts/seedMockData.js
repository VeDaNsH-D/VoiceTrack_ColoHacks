const mongoose = require("mongoose");
const data = require("./mockData.json");
const Transaction = require("../src/models/transaction.model");
const env = require("../src/config/env");

if (!env.mongoUri) {
    console.error(
        "MONGO_URI is not set. Please add it to backend/.env before seeding data."
    );
    process.exit(1);
}

async function seedMockData() {
    try {
        await mongoose.connect(env.mongoUri);

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("mockData.json is empty or invalid. Run generateMockData.js first.");
        }

        // Intentionally not deleting existing documents, per requirement.
        const inserted = await Transaction.insertMany(data, { ordered: false });
        console.log(`Mock data inserted successfully. Count: ${inserted.length}`);
    } catch (error) {
        console.error("Failed to seed mock data", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seedMockData();
