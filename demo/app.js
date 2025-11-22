const STEPS = [
    { id: "open", label: "Launch MT4 Terminal" },
    { id: "scan", label: "Scan Expert Advisors" },
    { id: "run", label: "Run Strategy Tester" },
    { id: "export", label: "Export Report" },
    { id: "reset", label: "Reset For Next Bot" }
];

const logEl = document.querySelector("#log");
const statBots = document.querySelector("#statBots");
const statReports = document.querySelector("#statReports");
const statTime = document.querySelector("#statTime");
const speedSlider = document.querySelector("#speed");
const stepper = document.querySelector("#stepper");
const mt4EaList = document.querySelector("#mt4EaList");
const mt4DatasetCount = document.querySelector("#mt4DatasetCount");
const mt4Toast = document.querySelector("#mt4Toast");
const mt4Cursor = document.querySelector("#mt4Cursor");
const mt4Quality = document.querySelector("#mt4Quality");
const mt4ActiveStep = document.querySelector("#mt4ActiveStep");
const mt4ProgressBar = document.querySelector("#mt4ProgressBar");
const tickCanvas = document.querySelector("#tickCanvas");
const tickSymbolEl = document.querySelector("#tickSymbol");
const tickBidEl = document.querySelector("#tickBid");
const tickAskEl = document.querySelector("#tickAsk");
const tickSpreadEl = document.querySelector("#tickSpread");
const tickFeedStatus = document.querySelector("#tickFeedStatus");
const priceTapeEl = document.querySelector("#priceTape");

const startBtn = document.querySelector("#startDemo");
const resetBtn = document.querySelector("#resetDemo");

let running = false;
let startTime = null;
let timerHandle = null;
let dataset = null;
let demoQueue = [];
const CURSOR_POSITIONS = {
    idle: { x: 40, y: 80 },
    catalog: { x: 30, y: 30 },
    start: { x: 150, y: 120 },
    report: { x: 210, y: 60 },
    export: { x: 200, y: 150 }
};
const QUALITY_RANGE = { min: 87, max: 99 };
const PRICE_SYMBOLS = [
    { pair: "EURUSD", bid: 1.0845, ask: 1.0847, pip: 0.0001, decimals: 5 },
    { pair: "GBPUSD", bid: 1.2742, ask: 1.2745, pip: 0.0001, decimals: 5 },
    { pair: "USDJPY", bid: 151.230, ask: 151.260, pip: 0.01, decimals: 3 },
    { pair: "XAUUSD", bid: 2351.2, ask: 2351.8, pip: 0.1, decimals: 2 },
    { pair: "NAS100", bid: 17420.5, ask: 17421.2, pip: 0.5, decimals: 1 }
];
const MAX_TICKS = 160;
let tickSeries = [];
let tickCtx = null;
let tickSize = { width: 0, height: 0 };
let tickInterval = null;
let resizeTimer = null;

function renderSteps() {
    const fragment = document.createDocumentFragment();
    STEPS.forEach(step => {
        const div = document.createElement("div");
        div.className = "step";
        div.dataset.state = "idle";
        div.id = `step-${step.id}`;

        const h3 = document.createElement("h3");
        h3.textContent = step.label;

        const status = document.createElement("span");
        status.className = "step__status";
        status.textContent = "Queued";

        div.appendChild(h3);
        div.appendChild(status);
        fragment.appendChild(div);
    });
    stepper.appendChild(fragment);
}

function log(message) {
    const item = document.createElement("li");
    const timestamp = document.createElement("time");
    timestamp.textContent = new Date().toLocaleTimeString();
    item.appendChild(timestamp);
    const text = document.createElement("div");
    text.textContent = message;
    item.appendChild(text);
    logEl.appendChild(item);
    logEl.scrollTop = logEl.scrollHeight;
}

function renderMt4List(list = []) {
    if (!mt4EaList) return;
    mt4EaList.innerHTML = "";
    list.forEach(({ ea_name, category }, idx) => {
        const li = document.createElement("li");
        li.dataset.index = idx;
        li.dataset.state = "idle";
        const name = document.createElement("span");
        name.textContent = ea_name;
        const pill = document.createElement("span");
        pill.className = "mt4__pill";
        pill.textContent = category;
        li.appendChild(name);
        li.appendChild(pill);
        mt4EaList.appendChild(li);
    });
}

function setMt4CountText(total = 0) {
    if (mt4DatasetCount) {
        mt4DatasetCount.textContent = `${total.toLocaleString()} items`;
    }
}

function setMt4Toast(message) {
    if (mt4Toast) {
        mt4Toast.textContent = message;
    }
}

function setMt4ActiveStep(text) {
    if (mt4ActiveStep) {
        mt4ActiveStep.textContent = text;
    }
}

function setQuality(value) {
    if (mt4Quality) {
        mt4Quality.textContent = value;
    }
}

function setProgress(fraction) {
    if (!mt4ProgressBar) return;
    const clamped = Math.max(0, Math.min(1, fraction || 0));
    mt4ProgressBar.style.width = `${(clamped * 100).toFixed(0)}%`;
}

function animateCursor(positionKey = "idle") {
    if (!mt4Cursor) return;
    const target = CURSOR_POSITIONS[positionKey] || CURSOR_POSITIONS.idle;
    mt4Cursor.style.transform = `translate(${target.x}px, ${target.y}px)`;
}

function markEaState(index, state) {
    if (!mt4EaList) return;
    const item = mt4EaList.querySelector(`li[data-index="${index}"]`);
    if (item) {
        item.dataset.state = state;
    }
}

function resetMt4Visuals() {
    if (mt4EaList) {
        mt4EaList.querySelectorAll("li").forEach(li => {
            li.dataset.state = "idle";
        });
    }
    setMt4Toast("Idle");
    setMt4ActiveStep("Waiting");
    setQuality("--%");
    setProgress(0);
    animateCursor("idle");
}

function formatPrice(value, decimals) {
    return Number(value).toFixed(decimals);
}

function updatePrimaryReadout(symbol) {
    if (!symbol) return;
    if (tickSymbolEl) tickSymbolEl.textContent = symbol.pair;
    if (tickBidEl) tickBidEl.textContent = formatPrice(symbol.bid, symbol.decimals);
    if (tickAskEl) tickAskEl.textContent = formatPrice(symbol.ask, symbol.decimals);
    if (tickSpreadEl) {
        const spread = (symbol.ask - symbol.bid) / symbol.pip;
        tickSpreadEl.textContent = `${spread.toFixed(1)} pips`;
    }
}

function renderPriceTape(symbols = PRICE_SYMBOLS) {
    if (!priceTapeEl) return;
    priceTapeEl.innerHTML = "";
    symbols.forEach(symbol => {
        const li = document.createElement("li");
        li.classList.add(symbol.direction === "down" ? "price--down" : "price--up");

        const label = document.createElement("strong");
        label.textContent = symbol.pair;

        const price = document.createElement("span");
        price.textContent = `${formatPrice(symbol.bid, symbol.decimals)} / ${formatPrice(symbol.ask, symbol.decimals)}`;

        const deltaPips = ((symbol.bid - (symbol.prevBid ?? symbol.bid)) / symbol.pip).toFixed(1);
        const delta = document.createElement("small");
        const arrow = symbol.direction === "down" ? "▼" : "▲";
        delta.textContent = `${arrow} ${deltaPips} pips`;

        li.appendChild(label);
        li.appendChild(price);
        li.appendChild(delta);
        priceTapeEl.appendChild(li);
    });
}

function resizeTickCanvas() {
    if (!tickCanvas) return;
    const rect = tickCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    tickCanvas.width = rect.width * dpr;
    tickCanvas.height = rect.height * dpr;
    tickCtx = tickCanvas.getContext("2d");
    tickCtx.setTransform(1, 0, 0, 1, 0, 0);
    tickCtx.scale(dpr, dpr);
    tickSize = { width: rect.width, height: rect.height };
    drawTicks();
}

function drawTicks() {
    if (!tickCtx || !tickSize.width || !tickSeries.length) return;
    const { width, height } = tickSize;
    tickCtx.clearRect(0, 0, width, height);

    tickCtx.strokeStyle = "var(--chart-grid)";
    tickCtx.lineWidth = 1;
    const horizontalLines = 4;
    for (let i = 0; i <= horizontalLines; i++) {
        const y = (i / horizontalLines) * height;
        tickCtx.beginPath();
        tickCtx.moveTo(0, y);
        tickCtx.lineTo(width, y);
        tickCtx.stroke();
    }

    const min = Math.min(...tickSeries);
    const max = Math.max(...tickSeries);
    const range = max - min || 0.0001;

    tickCtx.beginPath();
    tickSeries.forEach((value, index) => {
        const x = (index / (tickSeries.length - 1 || 1)) * width;
        const normalized = 1 - (value - min) / range;
        const y = normalized * height;
        if (index === 0) {
            tickCtx.moveTo(x, y);
        } else {
            tickCtx.lineTo(x, y);
        }
    });
    tickCtx.strokeStyle = "#4fddff";
    tickCtx.lineWidth = 2;
    tickCtx.stroke();
}

function pushTickPoint(value) {
    tickSeries.push(value);
    if (tickSeries.length > MAX_TICKS) {
        tickSeries.shift();
    }
    drawTicks();
}

function simulateSymbols() {
    let leader = null;
    PRICE_SYMBOLS.forEach((symbol, idx) => {
        const volatility = symbol.pip * (idx === 0 ? 4 : 2.5);
        const delta = (Math.random() - 0.5) * volatility;
        symbol.prevBid = symbol.bid;
        symbol.bid = Number((symbol.bid + delta).toFixed(symbol.decimals));
        const spreadPips = symbol.pip * (1 + Math.random() * 2);
        symbol.ask = Number((symbol.bid + spreadPips).toFixed(symbol.decimals));
        symbol.direction = symbol.bid >= (symbol.prevBid ?? symbol.bid) ? "up" : "down";
        if (idx === 0) {
            leader = symbol;
        }
    });
    if (leader) {
        updatePrimaryReadout(leader);
        pushTickPoint(leader.bid);
    }
    renderPriceTape();
}

function startTickLoop() {
    if (tickInterval || !tickCanvas) {
        return;
    }
    tickFeedStatus && (tickFeedStatus.textContent = "LIVE");
    resizeTickCanvas();
    if (!tickSeries.length && PRICE_SYMBOLS.length) {
        tickSeries = Array.from({ length: 60 }, () => PRICE_SYMBOLS[0].bid);
    }
    simulateSymbols();
    tickInterval = setInterval(simulateSymbols, 1200);
}

async function loadDataset() {
    if (dataset) {
        return dataset;
    }
    try {
        const response = await fetch("data/cyberfx_export.json");
        dataset = await response.json();
        statBots.textContent = dataset.summary.total_expert_advisors.toLocaleString();
        statReports.textContent = dataset.summary.total_reviews.toLocaleString();
        demoQueue = dataset.advisors.slice(0, 12);
        log(`Loaded ${dataset.summary.total_expert_advisors} legacy test runs with ${dataset.summary.total_reviews} human reviews.`);
        renderMt4List(demoQueue);
        setMt4CountText(dataset.summary.total_expert_advisors);
    } catch (error) {
        console.error(error);
        log("Failed to load CyberFX dataset. Falling back to sample data.");
        dataset = {
            summary: {
                total_expert_advisors: 5,
                total_reviews: 0,
            },
            advisors: [
                { ea_name: "AlphaScalper", category: "Testing", personal_review: "Fallback demo", sample_reviews: [] },
                { ea_name: "TokyoBreakout", category: "Testing", personal_review: "Fallback demo", sample_reviews: [] },
                { ea_name: "Cyberspyde", category: "Testing", personal_review: "Fallback demo", sample_reviews: [] },
                { ea_name: "VolatilityShield", category: "Testing", personal_review: "Fallback demo", sample_reviews: [] },
                { ea_name: "IndexArbitrage", category: "Testing", personal_review: "Fallback demo", sample_reviews: [] }
            ]
        };
        statBots.textContent = dataset.summary.total_expert_advisors.toString();
        statReports.textContent = dataset.summary.total_reviews.toString();
        demoQueue = dataset.advisors;
        renderMt4List(demoQueue);
        setMt4CountText(dataset.summary.total_expert_advisors);
    }
    return dataset;
}

function setStepState(id, state, statusText) {
    const el = document.querySelector(`#step-${id}`);
    if (!el) return;
    el.dataset.state = state;
    const status = el.querySelector(".step__status");
    status.textContent = statusText;
}

function delay(multiplier) {
    const base = 900;
    const speed = Number(speedSlider.value);
    return new Promise(resolve => setTimeout(resolve, base * multiplier / speed));
}

function updateTimer() {
    if (!startTime) {
        statTime.textContent = "0s";
        return;
    }
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    statTime.textContent = `${elapsed}s`;
}

async function runDemo() {
    if (running) return;
    running = true;
    startTime = Date.now();
    timerHandle = setInterval(updateTimer, 500);
    startBtn.disabled = true;
    log("Bootstrapping automation sandbox...");
    if (!dataset) {
        await loadDataset();
    }

    for (const step of STEPS) {
        setStepState(step.id, "active", "In Progress");
        log(step.label);
        await delay(1);
        setStepState(step.id, "done", "Done");
    }

    let processed = 0;
    const queue = demoQueue.length ? demoQueue : dataset.advisors.slice(0, 8);
    renderMt4List(queue);
    resetMt4Visuals();
    setMt4Toast("Dataset hydrated. Ready to run strategy tester.");
    animateCursor("catalog");
    for (const advisor of queue) {
        processed += 1;
        const shortReview = advisor.personal_review
            ? advisor.personal_review.slice(0, 140) + (advisor.personal_review.length > 140 ? "…" : "")
            : "No personal review logged.";
        log(`[${processed}/${queue.length}] ${advisor.ea_name} (${advisor.category}) → ${shortReview}`);
        markEaState(processed - 1, "active");
        setMt4ActiveStep("Select Expert Advisor");
        setMt4Toast(`Selecting ${advisor.ea_name}`);
        animateCursor("catalog");
        setStepState("run", "active", "Running test");
        await delay(0.9);
        setMt4ActiveStep("Start Tester");
        setMt4Toast("Triggering Strategy Tester");
        animateCursor("start");
        await delay(0.9);
        setStepState("run", "done", "Completed");

        setStepState("export", "active", "Saving report");
        setMt4ActiveStep("Read Report");
        setMt4Toast("Parsing results & modeling quality");
        animateCursor("report");
        const quality = (QUALITY_RANGE.min + Math.random() * (QUALITY_RANGE.max - QUALITY_RANGE.min)).toFixed(1);
        setQuality(`${quality}%`);
        await delay(0.8);
        setMt4ActiveStep("Export Report");
        setMt4Toast("Saving HTML summary");
        animateCursor("export");
        setStepState("export", "done", "Saved");

        setStepState("reset", "active", "Resetting");
        await delay(0.6);
        setStepState("reset", "done", "Ready");
        markEaState(processed - 1, "done");
        setProgress(processed / queue.length);

        if (advisor.sample_reviews && advisor.sample_reviews.length) {
            log(`└ Review snippet: "${advisor.sample_reviews[0].slice(0, 160)}${advisor.sample_reviews[0].length > 160 ? "…" : ""}"`);
        }
    }

    setMt4Toast("Automation cycle finished. Reports synced to results/.");
    setMt4ActiveStep("Complete");
    animateCursor("idle");
    log("Automation cycle finished. Reports synced to results/. Legacy notes stay archived in CyberFX.");
    finishDemo();
}

function finishDemo() {
    running = false;
    startBtn.disabled = false;
    clearInterval(timerHandle);
    updateTimer();
}

function resetDemo() {
    running = false;
    startBtn.disabled = false;
    clearInterval(timerHandle);
    startTime = null;
    statTime.textContent = "0s";
    logEl.innerHTML = "";
    document.querySelectorAll(".step").forEach(step => {
        step.dataset.state = "idle";
        step.querySelector(".step__status").textContent = "Queued";
    });
    resetMt4Visuals();
    log("Demo reset. Ready for the next run.");
}

renderSteps();
resetDemo();
loadDataset();
startTickLoop();

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeTickCanvas, 150);
});

startBtn.addEventListener("click", runDemo);
resetBtn.addEventListener("click", resetDemo);
