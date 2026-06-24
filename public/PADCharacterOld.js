/* =========================================================
    STATE
    ========================================================= */
let currentP = 0;
let currentA = 0;
let currentD = 0;

// Rive handles
let riveInstance   = null;
let pleasureBind   = null;
let arousalBind    = null;
let dominanceBind  = null;

/* =========================================================
    RIVE SETUP
    ========================================================= */
function initRive() {
    riveInstance = new rive.Rive({
    src: "pad_test.riv",
    canvas: document.getElementById("riveCanvas"),
    autoplay: true,
    autoBind: true,
    stateMachines: "State Machine 1",
    onLoad: () => {
        riveInstance.resizeDrawingSurfaceToCanvas();

        try {
        // Grab the default ViewModel instance that Rive exposes
        const vmi = riveInstance.viewModelInstance ??
            riveInstance.defaultViewModelInstance;;

        if (vmi) {
            pleasureBind  = vmi.number("pleasure");
            arousalBind   = vmi.number("arousal");
            dominanceBind = vmi.number("dominance");

            // Ensure we start at neutral
            if (pleasureBind)  pleasureBind.value  = 0;
            if (arousalBind)   arousalBind.value    = 0;
            if (dominanceBind) dominanceBind.value  = 0;

            console.log("Rive data binds connected ✓");
        } else {
            console.warn(
            "No ViewModel instance found – make sure your .riv " +
            "file has a ViewModel with pleasure / arousal / dominance numbers."
            );
        }
        
        } catch (err) {
        console.warn("Data‑bind init:", err);
        }
    },
    });
}

initRive();

/* =========================================================
    HELPERS — update values & animate
    ========================================================= */
function pushValues(p, a, d) {
    currentP = p;
    currentA = a;
    currentD = d;

    // Push to Rive
    if (pleasureBind)  pleasureBind.value  = p;
    if (arousalBind)   arousalBind.value    = a;
    if (dominanceBind) dominanceBind.value  = d;

    // Push to DOM
    document.getElementById("pVal").textContent = Math.round(p);
    document.getElementById("aVal").textContent = Math.round(a);
    document.getElementById("dVal").textContent = Math.round(d);
}

/** Ease‑out cubic lerp from current values → targets. */
function animateTo(targetP, targetA, targetD, ms = 1400) {
    return new Promise((resolve) => {
    const startP = currentP;
    const startA = currentA;
    const startD = currentD;
    const t0 = performance.now();

    function tick(now) {
        const progress = Math.min((now - t0) / ms, 1);
        // ease‑out cubic
        const e = 1 - Math.pow(1 - progress, 3);

        pushValues(
        startP + (targetP - startP) * e,
        startA + (targetA - startA) * e,
        startD + (targetD - startD) * e
        );

        if (progress < 1) {
        requestAnimationFrame(tick);
        } else {
        resolve();
        }
    }

    requestAnimationFrame(tick);
    });
}

/* =========================================================
    GEMINI API — structured JSON output (replaces regex)
    ========================================================= */
async function fetchPAD(backstory, apiKey) {
    const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/` +
    `models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
    system_instruction: {
        parts: [
        {
            text:
            "You assist a framework that turns journal entries into " +
            "PAD emotional‑state values. For each dimension (pleasure, " +
            "arousal, dominance) return an integer from −50 to 50 that " +
            "best represents the journal entry described. Return JSON only.",
        },
        ],
    },
    contents: [
        {
        parts: [
            {
            text:
                "Extract pleasure, arousal, and dominance values for " +
                "this journal entry:\n\n" +
                backstory,
            },
        ],
        },
    ],
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

    const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    });

    if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text); // { pleasure, arousal, dominance }
}

/* =========================================================
    BUTTON HANDLERS
    ========================================================= */
document
    .getElementById("createBtn")
    .addEventListener("click", async () => {
    const apiKey    = "AIzaSyDzlxwkJjap_nX1_9YaT1kUxNmxgdIo_yw";
    const backstory = document.getElementById("backstory").value.trim();
    const status    = document.getElementById("status");
    const btn       = document.getElementById("createBtn");

    /*
    if (!apiKey) {
        status.textContent = "⚠️  Please enter your Gemini API key.";
        return;
    }
    */

    if (!backstory) {
        status.textContent = "⚠️  Write an entry first!";
        return;
    }

    btn.disabled = true;
    status.textContent = "🔮  Analyzing backstory…";

    try {
        const pad = await fetchPAD(backstory, apiKey);

        // Clamp just in case the model overshoots
        const p = Math.max(-50, Math.min(50, pad.pleasure));
        const a = Math.max(-50, Math.min(50, pad.arousal));
        const d = Math.max(-50, Math.min(50, pad.dominance));

        console.log("PAD extracted →", { p, a, d });
        status.textContent = "✨  Bringing character to life…";

        await animateTo(p, a, d, 1400);

        status.textContent = "✅  Character created!";
    } catch (err) {
        console.error(err);
        status.textContent = `❌  ${err.message}`;
    } finally {
        btn.disabled = false;
    }
    });

document
    .getElementById("resetBtn")
    .addEventListener("click", async () => {
    document.getElementById("backstory").value = "";
    document.getElementById("status").textContent = "";
    await animateTo(0, 0, 0, 800);
    });