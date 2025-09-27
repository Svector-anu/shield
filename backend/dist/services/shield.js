"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const Shield_json_1 = __importDefault(require("../abi/Shield.json"));
dotenv_1.default.config();
const provider = new ethers_1.ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || '');
const wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
const shieldContract = new ethers_1.ethers.Contract(process.env.SHIELD_CONTRACT_ADDRESS || '', Shield_json_1.default.abi, wallet);
exports.default = shieldContract;
