const express = require('express');
const path = require('path');
require('dotenv').config(); // Secures your API key locally

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve your frontend files from a directory named "public"
app.use(express.static(path.join(__dirname, 'public')));

/* =========================================================
    SECURE ENDPOINT FOR FRONTEND
   ========================================================= */
app.post('/api/analyze', async (req, res) => {
    try {
        const { backstory } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Server misconfiguration: API key is missing." });
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Exactly the same payload object structure you created
        const payload = {
            system_instruction: {
                parts: [{
                    text: "You assist a framework that turns journal entries into PAD emotional‑state values. " +
                          "For each dimension (pleasure, arousal, dominance) return an integer from −50 to 50 " +
                          "that best represents the journal entry described. Return JSON only."
                }]
            },
            contents: [{
                parts: [{
                    text: "Extract pleasure, arousal, and dominance values for this journal entry:\n\n" + backstory
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        pleasure:  { type: "INTEGER" },
                        arousal:   { type: "INTEGER" },
                        dominance: { type: "INTEGER" },
                    },
                    required: ["pleasure", "arousal", "dominance"],
                },
            },
        };

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errDetails = await response.json();
            return res.status(response.status).json({ error: errDetails.error?.message || "Gemini API Error" });
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        
        // Return the parsed JSON directly back to your frontend
        res.json(JSON.parse(text));

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server safely running at http://localhost:${PORT}`);
});