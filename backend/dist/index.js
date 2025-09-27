"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const policy_1 = __importDefault(require("./routes/policy"));
const verify_1 = __importDefault(require("./routes/verify"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Shield Backend API');
});
app.use('/api/policy', policy_1.default);
app.use('/api/verify', verify_1.default);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
