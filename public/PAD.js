/* =========================================================
    STATE & RIVE SETUP (Unchanged from your snippet)
   ========================================================= */
let currentP = 0; let currentA = 0; let currentD = 0;
let riveInstance = null; let pleasureBind = null; let arousalBind = null; let dominanceBind = null;

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
                const vmi = riveInstance.viewModelInstance ?? riveInstance.defaultViewModelInstance;
                if (vmi) {
                    pleasureBind  = vmi.number("pleasure");
                    arousalBind   = vmi.number("arousal");
                    dominanceBind = vmi.number("dominance");
                    if (pleasureBind)  pleasureBind.value  = 0;
                    if (arousalBind)   arousalBind.value    = 0;
                    if (dominanceBind) dominanceBind.value  = 0;
                    console.log("Rive data binds connected ✓");
                }
            } catch (err) { console.warn("Data‑bind init:", err); }
        },
    });
}
initRive();

function pushValues(p, a, d) {
    currentP = p; currentA = a; currentD = d;
    if (pleasureBind)  pleasureBind.value  = p;
    if (arousalBind)   arousalBind.value    = a;
    if (dominanceBind) dominanceBind.value  = d;
    document.getElementById("pVal").textContent = Math.round(p);
    document.getElementById("aVal").textContent = Math.round(a);
    document.getElementById("dVal").textContent = Math.round(d);
}

function animateTo(targetP, targetA, targetD, ms = 1400) {
    return new Promise((resolve) => {
        const startP = currentP; const startA = currentA; const startD = currentD;
        const t0 = performance.now();
        function tick(now) {
            const progress = Math.min((now - t0) / ms, 1);
            const e = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            pushValues(
                startP + (targetP - startP) * e,
                startA + (targetA - startA) * e,
                startD + (targetD - startD) * e
            );
            if (progress < 1) { requestAnimationFrame(tick); } else { resolve(); }
        }
        requestAnimationFrame(tick);
    });
}

/* =========================================================
    MODIFIED: TALK TO EXPRESS PROXY INSTEAD OF GOOGLE
   ========================================================= */
async function fetchPAD(backstory) {
    // Call your backend Express endpoint relatively
    const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backstory: backstory }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Server error ${res.status}`);
    }

    return await res.json(); // Clean JSON object: { pleasure, arousal, dominance }
}

/* =========================================================
    BUTTON HANDLERS (Slightly cleaned up)
   ========================================================= */
document.getElementById("createBtn").addEventListener("click", async () => {
    const backstory = document.getElementById("backstory").value.trim();
    const status    = document.getElementById("status");
    const btn       = document.getElementById("createBtn");

    if (!backstory) {
        status.textContent = "⚠️  Write an entry first!";
        return;
    }

    btn.disabled = true;
    status.textContent = "🔮  Analyzing entry…";

    try {
        // Look mom, no API key being leaked in the user's browser!
        const pad = await fetchPAD(backstory);

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

document.getElementById("resetBtn").addEventListener("click", async () => {
    document.getElementById("backstory").value = "";
    document.getElementById("status").textContent = "";
    await animateTo(0, 0, 0, 800);
});