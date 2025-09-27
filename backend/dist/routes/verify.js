"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shield_1 = __importDefault(require("../services/shield"));
const router = (0, express_1.Router)();
router.post('/:policyId', async (req, res) => {
    try {
        const { policyId } = req.params;
        const { success } = req.body; // This will come from the face verification service
        // First, check if the policy is valid
        const isValid = await shield_1.default.isPolicyValid(policyId);
        if (!isValid) {
            return res.status(400).json({ error: 'Policy is not valid' });
        }
        // Log the verification attempt
        const tx = await shield_1.default.logAttempt(policyId, success);
        await tx.wait();
        if (success) {
            // In a real application, this is where you would grant access to the resource
            res.json({ success: true, message: 'Verification successful' });
        }
        else {
            res.status(401).json({ success: false, message: 'Verification failed' });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process verification' });
    }
});
exports.default = router;
