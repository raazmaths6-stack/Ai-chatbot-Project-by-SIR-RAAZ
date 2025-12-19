
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));


const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// 🔗 MongoDB connect
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));

app.post("/chat", async (req, res) => {
    try {
        const { message, history } = req.body;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
            process.env.GEMINI_API_KEY,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        ...(history || []),
                        {
                            role: "user",
                            parts: [{ text: message }]
                        }
                    ]
                })
            }
        );

        const data = await response.json();
        console.log("Gemini API response:", data);
        const reply = data.candidates[0].content.parts[0].text;

        res.json({ reply });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gemini API error" });
    }
});

// 🧠 Schema
const chatSchema = new mongoose.Schema({
    role: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model("Chat", chatSchema);

// 📥 Save message
app.post("/save-chat", async (req, res) => {
    try {
        await Chat.create(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📤 Get chat history
app.get("/get-chat", async (req, res) => {
    const chats = await Chat.find().sort({ createdAt: 1 });
    res.json(chats);
});

app.listen(process.env.PORT, () =>
    console.log(`🚀 Server running on port ${process.env.PORT}`)
);

