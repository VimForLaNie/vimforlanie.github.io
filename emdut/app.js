// State Variables
let pointsA = []; // Blue
let pointsB = []; // Orange
let blurRadius = 15;

// Canvas setup
const cPts = document.getElementById('canvas-points');
const ctxPts = cPts.getContext('2d');
const cKde = document.getElementById('canvas-kde');
const ctxKde = cKde.getContext('2d');

const width = cPts.width;
const height = cPts.height;

// Peak tracking
let peakTx = 0;
let peakTy = 0;

// Initialize
function init() {
    generatePoints();
    setupInteractions();
    updateAll();
}

function generatePoints() {
    pointsA = [];
    pointsB = [];
    
    const mode = document.getElementById('mode-select').value;
    const numA = parseInt(document.getElementById('num-points').value);
    
    // Base shape in center
    const baseX = width / 2;
    const baseY = height / 2;
    
    // Generate a random shape for A
    const shape = [];
    for (let i = 0; i < numA; i++) {
        shape.push({
            x: baseX + (Math.random() - 0.5) * 150,
            y: baseY + (Math.random() - 0.5) * 150
        });
    }

    // A is exactly the shape
    pointsA = shape.map(p => ({ x: p.x, y: p.y }));

    // B is the shape, translated randomly, with slight noise
    const trueTx = (Math.random() - 0.5) * 200;
    const trueTy = (Math.random() - 0.5) * 200;

    pointsB = shape.map(p => ({
        x: p.x + trueTx + (Math.random() - 0.5) * 20,
        y: p.y + trueTy + (Math.random() - 0.5) * 20
    }));

    // If asymmetric, add random distractor points to B
    if (mode === 'asymmetric') {
        const numDistractors = 7;
        for (let i = 0; i < numDistractors; i++) {
            pointsB.push({
                x: baseX + (Math.random() - 0.5) * 350,
                y: baseY + (Math.random() - 0.5) * 350
            });
        }
    }

    updateAll();
}

function updateAll() {
    drawPoints();
    drawKDE();
    computePeak();
}

// 1. Draw Discrete Points
function drawPoints() {
    ctxPts.clearRect(0, 0, width, height);

    const showOverlay = document.getElementById('overlay-toggle').checked;

    let cAx = 0, cAy = 0;
    if (pointsA.length > 0) {
        pointsA.forEach(p => { cAx += p.x; cAy += p.y; });
        cAx /= pointsA.length;
        cAy /= pointsA.length;
    }

    if (showOverlay && pointsA.length > 0) {
        ctxPts.globalCompositeOperation = 'screen';
        ctxPts.filter = `blur(${blurRadius}px)`;
        pointsA.forEach(a => {
            pointsB.forEach(b => {
                const targetX = cAx + (b.x - a.x);
                const targetY = cAy + (b.y - a.y);
                ctxPts.beginPath();
                ctxPts.arc(targetX, targetY, 15, 0, Math.PI * 2);
                ctxPts.fillStyle = 'rgba(16, 185, 129, 0.4)'; // Green target glow
                ctxPts.fill();
            });
        });
        ctxPts.filter = 'none';
        ctxPts.globalCompositeOperation = 'source-over';
    }

    // Draw lines connecting points of same color to show "shape"
    ctxPts.beginPath();
    pointsA.forEach((p, i) => {
        if(i===0) ctxPts.moveTo(p.x, p.y);
        else ctxPts.lineTo(p.x, p.y);
    });
    ctxPts.closePath();
    ctxPts.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctxPts.lineWidth = 2;
    ctxPts.stroke();

    ctxPts.beginPath();
    pointsB.forEach((p, i) => {
        if(i===0) ctxPts.moveTo(p.x, p.y);
        else ctxPts.lineTo(p.x, p.y);
    });
    ctxPts.closePath();
    ctxPts.strokeStyle = 'rgba(249, 115, 22, 0.3)';
    ctxPts.stroke();

    // Draw Points
    pointsB.forEach(p => {
        ctxPts.beginPath();
        ctxPts.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctxPts.fillStyle = '#f97316';
        ctxPts.fill();
        ctxPts.shadowBlur = 10;
        ctxPts.shadowColor = '#f97316';
    });

    pointsA.forEach(p => {
        ctxPts.beginPath();
        ctxPts.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctxPts.fillStyle = '#3b82f6';
        ctxPts.fill();
        ctxPts.shadowBlur = 10;
        ctxPts.shadowColor = '#3b82f6';
    });

    // Draw Centroid of A as a crosshair
    if (pointsA.length > 0) {
        ctxPts.shadowBlur = 0;
        ctxPts.beginPath();
        ctxPts.moveTo(cAx - 8, cAy);
        ctxPts.lineTo(cAx + 8, cAy);
        ctxPts.moveTo(cAx, cAy - 8);
        ctxPts.lineTo(cAx, cAy + 8);
        ctxPts.strokeStyle = '#fff';
        ctxPts.lineWidth = 2;
        ctxPts.stroke();
    }

    // Reset shadow
    ctxPts.shadowBlur = 0;
}

// 2. Draw KDE (Continuous)
function drawKDE() {
    // We use actual canvas blur to simulate Rasterization + Gaussian Kernel
    ctxKde.clearRect(0, 0, width, height);
    
    // Draw A (Blue)
    ctxKde.globalCompositeOperation = 'source-over';
    ctxKde.filter = `blur(${blurRadius}px)`;
    pointsA.forEach(p => {
        ctxKde.beginPath();
        ctxKde.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctxKde.fillStyle = 'rgba(59, 130, 246, 0.8)';
        ctxKde.fill();
    });

    // Draw B (Orange)
    ctxKde.globalCompositeOperation = 'screen';
    pointsB.forEach(p => {
        ctxKde.beginPath();
        ctxKde.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctxKde.fillStyle = 'rgba(249, 115, 22, 0.8)';
        ctxKde.fill();
    });

    ctxKde.filter = 'none';
}

// 3. Compute Peak (Simulation of FFT Cross Correlation)
function computePeak() {
    let diffs = [];
    
    pointsA.forEach(a => {
        pointsB.forEach(b => {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            diffs.push({x: dx, y: dy});
        });
    });
    
    // Find the mathematical peak by finding the densest cluster of difference vectors
    // (A quick proxy for the maximum of the sum of Gaussians)
    let bestScore = -1;
    let bestTx = 0;
    let bestTy = 0;

    // Search around all pairwise differences
    diffs.forEach(center => {
        let score = 0;
        diffs.forEach(p => {
            const d = Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2);
            score += Math.exp(-d / (2 * blurRadius * blurRadius));
        });
        if (score > bestScore) {
            bestScore = score;
            bestTx = center.x;
            bestTy = center.y;
        }
    });

    peakTx = bestTx;
    peakTy = bestTy;
}

// Interaction: Dragging A
let isDragging = false;
let startMouseX = 0;
let startMouseY = 0;

function setupInteractions() {
    cPts.addEventListener('mousedown', e => {
        isDragging = true;
        const rect = cPts.getBoundingClientRect();
        startMouseX = e.clientX - rect.left;
        startMouseY = e.clientY - rect.top;
        document.getElementById('pts-overlay').style.opacity = '0';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const rect = cPts.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const dx = mx - startMouseX;
        const dy = my - startMouseY;

        pointsA.forEach(p => {
            p.x += dx;
            p.y += dy;
        });

        startMouseX = mx;
        startMouseY = my;

        updateAll();
    });

    // Button: Generate
    document.getElementById('btn-generate').addEventListener('click', generatePoints);

    // Dropdown: Mode Select
    document.getElementById('mode-select').addEventListener('change', generatePoints);

    // Button: Snap to Peak
    document.getElementById('btn-snap').addEventListener('click', () => {
        // Move A by the peak translation
        pointsA.forEach(p => {
            p.x += peakTx;
            p.y += peakTy;
        });
        updateAll();
    });

    // Slider: Blur Radius
    document.getElementById('blur-radius').addEventListener('input', e => {
        blurRadius = parseInt(e.target.value);
        document.getElementById('blur-val').innerText = blurRadius + 'px';
        updateAll();
    });

    // Slider: Number of Points
    document.getElementById('num-points').addEventListener('input', e => {
        const val = parseInt(e.target.value);
        document.getElementById('num-val').innerText = val;
        generatePoints();
    });

    // Toggle: Overlay
    document.getElementById('overlay-toggle').addEventListener('change', updateAll);
}

// Start
init();
