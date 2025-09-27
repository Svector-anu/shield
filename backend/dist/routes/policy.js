"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const shield_1 = __importDefault(require("../services/shield"));
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    try {
        const { expiry, maxAttempts } = req.body;
        const policyId = ethers_1.ethers.randomBytes(32);
        const tx = await shield_1.default.createPolicy(policyId, expiry, maxAttempts);
        await tx.wait();
        res.json({ policyId: ethers_1.ethers.hexlify(policyId) });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create policy' });
    }
});
exports.default = router;
