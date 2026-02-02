const ui = {
	separability: document.getElementById("separability"),
	separabilityValue: document.getElementById("separabilityValue"),
	redSpread: document.getElementById("redSpread"),
	redSpreadValue: document.getElementById("redSpreadValue"),
	blueSpread: document.getElementById("blueSpread"),
	blueSpreadValue: document.getElementById("blueSpreadValue"),
	pointsPerClass: document.getElementById("pointsPerClass"),
	seed: document.getElementById("seed"),
	blueCluster: document.getElementById("blueCluster"),
	blueClusterOffset: document.getElementById("blueClusterOffset"),
	blueClusterOffsetValue: document.getElementById("blueClusterOffsetValue"),
	redShiftX: document.getElementById("redShiftX"),
	redShiftXValue: document.getElementById("redShiftXValue"),
	redShiftY: document.getElementById("redShiftY"),
	redShiftYValue: document.getElementById("redShiftYValue"),
	redShiftZ: document.getElementById("redShiftZ"),
	redShiftZValue: document.getElementById("redShiftZValue"),
	blueShiftX: document.getElementById("blueShiftX"),
	blueShiftXValue: document.getElementById("blueShiftXValue"),
	blueShiftY: document.getElementById("blueShiftY"),
	blueShiftYValue: document.getElementById("blueShiftYValue"),
	blueShiftZ: document.getElementById("blueShiftZ"),
	blueShiftZValue: document.getElementById("blueShiftZValue"),
	classifierType: document.getElementById("classifierType"),
	solverMode: document.getElementById("solverMode"),
	outlierObjective: document.getElementById("outlierObjective"),
	canvas: document.getElementById("plot"),
	metrics: document.getElementById("metrics"),
};

const state = {
	data: [],
	classifier: null,
	rng: null,
	candidateNormals: [],
	camera: {
		yaw: 0,
		pitch: 0.35,
		zoom: 1.1,
	},
	interaction: {
		dragging: false,
		lastX: 0,
		lastY: 0,
	},
};

const ctx = ui.canvas.getContext("2d");
const COLORS = {
	class0: "#f43f5e",
	class1: "#38bdf8",
};

const defaults = {
	separability: 1.5,
	redSpread: 1.0,
	blueSpread: 1.0,
	pointsPerClass: 160,
	seed: 42,
	blueCluster: false,
	blueClusterOffset: 0.8,
	redShiftX: 0,
	redShiftY: 0,
	redShiftZ: 0,
	blueShiftX: 0,
	blueShiftY: 0,
	blueShiftZ: 0,
};

function mulberry32(seed) {
	let t = seed >>> 0;
	return function () {
		t += 0x6d2b79f5;
		let result = Math.imul(t ^ (t >>> 15), t | 1);
		result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
		return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
	};
}

function gaussian(rng) {
	let u = 0;
	let v = 0;
	while (u === 0) u = rng();
	while (v === 0) v = rng();
	return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function setDefaults() {
	ui.separability.value = defaults.separability;
	ui.separabilityValue.textContent = defaults.separability.toFixed(2);
	ui.redSpread.value = defaults.redSpread;
	ui.redSpreadValue.textContent = defaults.redSpread.toFixed(2);
	ui.blueSpread.value = defaults.blueSpread;
	ui.blueSpreadValue.textContent = defaults.blueSpread.toFixed(2);
	ui.pointsPerClass.value = defaults.pointsPerClass;
	ui.seed.value = defaults.seed;
	ui.blueCluster.checked = defaults.blueCluster;
	ui.blueClusterOffset.value = defaults.blueClusterOffset;
	ui.blueClusterOffsetValue.textContent = defaults.blueClusterOffset.toFixed(2);
	ui.redShiftX.value = defaults.redShiftX;
	ui.redShiftXValue.textContent = defaults.redShiftX.toFixed(2);
	ui.redShiftY.value = defaults.redShiftY;
	ui.redShiftYValue.textContent = defaults.redShiftY.toFixed(2);
	ui.redShiftZ.value = defaults.redShiftZ;
	ui.redShiftZValue.textContent = defaults.redShiftZ.toFixed(2);
	ui.blueShiftX.value = defaults.blueShiftX;
	ui.blueShiftXValue.textContent = defaults.blueShiftX.toFixed(2);
	ui.blueShiftY.value = defaults.blueShiftY;
	ui.blueShiftYValue.textContent = defaults.blueShiftY.toFixed(2);
	ui.blueShiftZ.value = defaults.blueShiftZ;
	ui.blueShiftZValue.textContent = defaults.blueShiftZ.toFixed(2);
}

function updateValueDisplays() {
	ui.separabilityValue.textContent = Number(ui.separability.value).toFixed(2);
	ui.redSpreadValue.textContent = Number(ui.redSpread.value).toFixed(2);
	ui.blueSpreadValue.textContent = Number(ui.blueSpread.value).toFixed(2);
	ui.blueClusterOffsetValue.textContent = Number(ui.blueClusterOffset.value).toFixed(2);
	ui.redShiftXValue.textContent = Number(ui.redShiftX.value).toFixed(2);
	ui.redShiftYValue.textContent = Number(ui.redShiftY.value).toFixed(2);
	ui.redShiftZValue.textContent = Number(ui.redShiftZ.value).toFixed(2);
	ui.blueShiftXValue.textContent = Number(ui.blueShiftX.value).toFixed(2);
	ui.blueShiftYValue.textContent = Number(ui.blueShiftY.value).toFixed(2);
	ui.blueShiftZValue.textContent = Number(ui.blueShiftZ.value).toFixed(2);
}

function generateData() {
	const separability = Number(ui.separability.value);
	const redSpread = Number(ui.redSpread.value);
	const blueSpread = Number(ui.blueSpread.value);
	const pointsPerClass = Number(ui.pointsPerClass.value);
	const seed = Number(ui.seed.value);
	const useBlueCluster = ui.blueCluster.checked;
	const blueClusterOffset = Number(ui.blueClusterOffset.value);
	const redShift = [
		Number(ui.redShiftX.value),
		Number(ui.redShiftY.value),
		Number(ui.redShiftZ.value),
	];
	const blueShift = [
		Number(ui.blueShiftX.value),
		Number(ui.blueShiftY.value),
		Number(ui.blueShiftZ.value),
	];
	const rng = mulberry32(seed);
	state.rng = rng;
	const data = [];
	const distance = separability * 3.2 + 0.2;
	const mean0 = [-distance / 2 + redShift[0], redShift[1], redShift[2]];
	const mean1 = [distance / 2 + blueShift[0], blueShift[1], blueShift[2]];

	for (let i = 0; i < pointsPerClass; i++) {
		data.push({
			x: mean0[0] + gaussian(rng) * redSpread,
			y: mean0[1] + gaussian(rng) * redSpread,
			z: mean0[2] + gaussian(rng) * redSpread,
			label: 0,
			outlier: false,
		});
		if (useBlueCluster) {
			const clusterShift = i % 2 === 0 ? blueClusterOffset : -blueClusterOffset;
			data.push({
				x: mean1[0] + gaussian(rng) * blueSpread,
				y: mean1[1] + clusterShift + gaussian(rng) * blueSpread,
				z: mean1[2] + gaussian(rng) * blueSpread,
				label: 1,
				outlier: false,
			});
		} else {
			data.push({
				x: mean1[0] + gaussian(rng) * blueSpread,
				y: mean1[1] + gaussian(rng) * blueSpread,
				z: mean1[2] + gaussian(rng) * blueSpread,
				label: 1,
				outlier: false,
			});
		}
	}

	state.data = data;
	state.candidateNormals = generateCandidateNormals(data, 80);
}

function trainClassifier() {
	const type = ui.classifierType.value;
	const mode = ui.solverMode.value;
	const objective = ui.outlierObjective.value;
	const model = findBestModel(state.data, type, objective, mode);
	state.model = model;
	state.classifier = (point) => isPointInRegion(point, model);
}

function meanVector(points) {
	const mean = [0, 0, 0];
	points.forEach((p) => {
		mean[0] += p.x;
		mean[1] += p.y;
		mean[2] += p.z;
	});
	return mean.map((v) => v / points.length);
}

function dot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function dotPoint(n, p) {
	return n[0] * p.x + n[1] * p.y + n[2] * p.z;
}

function cross(a, b) {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	];
}

function normalize(v) {
	const len = Math.hypot(v[0], v[1], v[2]);
	if (len < 1e-8) return null;
	return [v[0] / len, v[1] / len, v[2] / len];
}

function generateCandidateNormals(points, count) {
	const normals = [
		[1, 0, 0],
		[-1, 0, 0],
		[0, 1, 0],
		[0, -1, 0],
		[0, 0, 1],
		[0, 0, -1],
	];
	const reds = points.filter((p) => p.label === 0);
	const blues = points.filter((p) => p.label === 1);
	if (reds.length && blues.length) {
		const meanR = meanVector(reds);
		const meanB = meanVector(blues);
		const diff = normalize([meanB[0] - meanR[0], meanB[1] - meanR[1], meanB[2] - meanR[2]]);
		if (diff) normals.push(diff, [-diff[0], -diff[1], -diff[2]]);
		const maxPairs = 8;
		for (let i = 0; i < Math.min(maxPairs, reds.length); i++) {
			for (let j = 0; j < Math.min(maxPairs, blues.length); j++) {
				const v = normalize([
					blues[j].x - reds[i].x,
					blues[j].y - reds[i].y,
					blues[j].z - reds[i].z,
				]);
				if (!v) continue;
				normals.push(v, [-v[0], -v[1], -v[2]]);
			}
		}
	}
	const maxCount = Math.max(count, normals.length);
	const limit = Math.min(points.length, 20);
	for (let i = 0; i < limit && normals.length < maxCount; i++) {
		for (let j = i + 1; j < limit && normals.length < maxCount; j++) {
			for (let k = j + 1; k < limit && normals.length < maxCount; k++) {
				const p1 = points[i];
				const p2 = points[j];
				const p3 = points[k];
				const v1 = [p2.x - p1.x, p2.y - p1.y, p2.z - p1.z];
				const v2 = [p3.x - p1.x, p3.y - p1.y, p3.z - p1.z];
				const n = normalize(cross(v1, v2));
				if (!n) continue;
				normals.push(n, [-n[0], -n[1], -n[2]]);
			}
		}
	}
	return normals.slice(0, count);
}

function generateExactNormals(points) {
	const normals = [];
	const seen = new Set();
	const maxPoints = 50;
	if (points.length > maxPoints) {
		return { normals: generateCandidateNormals(points, 120), note: `Exact mode limited to ${maxPoints} points.` };
	}
	const addNormal = (n) => {
		const key = `${n[0].toFixed(4)}|${n[1].toFixed(4)}|${n[2].toFixed(4)}`;
		if (seen.has(key)) return;
		seen.add(key);
		normals.push(n);
	};
	for (let i = 0; i < points.length; i++) {
		for (let j = i + 1; j < points.length; j++) {
			for (let k = j + 1; k < points.length; k++) {
				const p1 = points[i];
				const p2 = points[j];
				const p3 = points[k];
				const v1 = [p2.x - p1.x, p2.y - p1.y, p2.z - p1.z];
				const v2 = [p3.x - p1.x, p3.y - p1.y, p3.z - p1.z];
				const n = normalize(cross(v1, v2));
				if (!n) continue;
				addNormal(n);
				addNormal([-n[0], -n[1], -n[2]]);
			}
		}
	}
	return { normals, note: "" };
}

function findBestModel(data, type, objective, mode) {
	let normals = state.candidateNormals.length ? state.candidateNormals : generateCandidateNormals(data, 60);
	let note = "";
	if (mode === "exact") {
		const exact = generateExactNormals(data);
		normals = exact.normals;
		note = exact.note;
	}
	let best = null;
	const consider = (model) => {
		if (!model) return;
		if (!best || model.score < best.score) best = model;
	};

	if (type === "halfplane" || type === "slice") {
		normals.forEach((n) => {
			const model =
				type === "halfplane"
					? bestHalfplane(data, n, objective)
					: bestSlice(data, n, objective);
			consider(model);
		});
	} else {
		const pairCount = Math.min(10, normals.length);
		for (let i = 0; i < pairCount; i++) {
			for (let j = i + 1; j < pairCount; j++) {
				const n1 = normals[i];
				const n2 = normals[j];
				const model =
					type === "wedge"
						? bestWedge(data, n1, n2, objective)
						: bestDiwedge(data, n1, n2, objective);
				consider(model);
			}
		}
	}

	if (!best) {
		return {
			type: "halfplane",
			n: [1, 0, 0],
			d: 0,
			score: Infinity,
			note: "No feasible solution found.",
		};
	}
	if (note && !best.note) {
		best.note = note;
	} else if (note) {
		best.note = `${best.note} ${note}`;
	}
	return best;
}

function bestHalfplane(data, n, objective) {
	const blue = data.filter((p) => p.label === 1);
	const red = data.filter((p) => p.label === 0);
	if (blue.length === 0 || red.length === 0) return null;
	const tBlue = blue.map((p) => dotPoint(n, p));
	const tRed = red.map((p) => dotPoint(n, p));
	const eps = 1e-6;

	let d = 0;
	if (objective === "minRed") {
		d = Math.min(...tBlue);
	} else if (objective === "minBlue") {
		d = Math.max(...tRed) + eps;
	} else {
		const sorted = data
			.map((p) => ({ t: dotPoint(n, p), label: p.label }))
			.sort((a, b) => a.t - b.t);
		let blueOut = tBlue.length;
		let redIn = 0;
		let bestScore = blueOut;
		let bestD = sorted[0]?.t ?? 0;
		for (let i = sorted.length - 1; i >= 0; i--) {
			const item = sorted[i];
			if (item.label === 1) {
				blueOut -= 1;
			} else {
				redIn += 1;
			}
			const score = blueOut + redIn;
			if (score < bestScore) {
				bestScore = score;
				bestD = item.t;
			}
		}
		d = bestD;
	}

	const model = { type: "halfplane", n, d };
	return finalizeModel(data, model, objective);
}

function bestSlice(data, n, objective) {
	const blue = data.filter((p) => p.label === 1);
	const red = data.filter((p) => p.label === 0);
	if (blue.length === 0 || red.length === 0) return null;
	const tBlue = blue.map((p) => dotPoint(n, p));
	const tRed = red.map((p) => dotPoint(n, p));

	let d1 = 0;
	let d2 = 0;
	if (objective === "minRed") {
		d1 = Math.min(...tBlue);
		d2 = Math.max(...tBlue);
	} else if (objective === "minBlue") {
		const sortedRed = [...tRed].sort((a, b) => a - b);
		const sortedBlue = [...tBlue].sort((a, b) => a - b);
		if (sortedRed.length === 0) {
			d1 = sortedBlue[0];
			d2 = sortedBlue[sortedBlue.length - 1];
		} else {
			const eps = 1e-6;
			let bestCount = -1;
			let bestInterval = [sortedRed[0] - 1, sortedRed[0] - 1];
			const intervals = [[-Infinity, sortedRed[0]]];
			for (let i = 0; i < sortedRed.length - 1; i++) {
				intervals.push([sortedRed[i], sortedRed[i + 1]]);
			}
			intervals.push([sortedRed[sortedRed.length - 1], Infinity]);
			intervals.forEach(([a, b]) => {
				const count = countInRange(sortedBlue, a, b);
				if (count > bestCount) {
					bestCount = count;
					bestInterval = [a, b];
				}
			});
			d1 = Number.isFinite(bestInterval[0]) ? bestInterval[0] + eps : bestInterval[0];
			d2 = Number.isFinite(bestInterval[1]) ? bestInterval[1] - eps : bestInterval[1];
			if (!Number.isFinite(d1)) d1 = Math.min(...tBlue);
			if (!Number.isFinite(d2)) d2 = Math.max(...tBlue);
		}
	} else {
		const sorted = data
			.map((p) => ({ t: dotPoint(n, p), label: p.label }))
			.sort((a, b) => a.t - b.t);
		const totalBlue = sorted.filter((p) => p.label === 1).length;
		const prefixRed = new Array(sorted.length + 1).fill(0);
		const prefixBlue = new Array(sorted.length + 1).fill(0);
		for (let i = 0; i < sorted.length; i++) {
			prefixRed[i + 1] = prefixRed[i] + (sorted[i].label === 0 ? 1 : 0);
			prefixBlue[i + 1] = prefixBlue[i] + (sorted[i].label === 1 ? 1 : 0);
		}
		let bestScore = Infinity;
		let bestD1 = sorted[0]?.t ?? 0;
		let bestD2 = sorted[0]?.t ?? 0;
		for (let i = 0; i < sorted.length; i++) {
			for (let j = i; j < sorted.length; j++) {
				const redIn = prefixRed[j + 1] - prefixRed[i];
				const blueIn = prefixBlue[j + 1] - prefixBlue[i];
				const blueOut = totalBlue - blueIn;
				const score = redIn + blueOut;
				if (score < bestScore) {
					bestScore = score;
					bestD1 = sorted[i].t;
					bestD2 = sorted[j].t;
				}
			}
		}
		d1 = bestD1;
		d2 = bestD2;
	}

	if (d1 > d2) [d1, d2] = [d2, d1];
	const model = { type: "slice", n, d1, d2 };
	return finalizeModel(data, model, objective);
}

function bestWedge(data, n1, n2, objective) {
	const t1 = data.map((p) => dotPoint(n1, p));
	const t2 = data.map((p) => dotPoint(n2, p));
	const redPoints = data.filter((p) => p.label === 0);
	const bluePoints = data.filter((p) => p.label === 1);
	if (bluePoints.length === 0 || redPoints.length === 0) return null;

	let d1 = 0;
	let d2 = 0;
	if (objective === "minRed") {
		const blueT1 = bluePoints.map((p) => dotPoint(n1, p));
		const blueT2 = bluePoints.map((p) => dotPoint(n2, p));
		d1 = Math.min(...blueT1);
		d2 = Math.min(...blueT2);
	} else if (objective === "minBlue") {
		const redPairs = redPoints.map((p) => [dotPoint(n1, p), dotPoint(n2, p)]);
		const candidates = [...new Set(redPairs.map((p) => p[0]))].sort(
			(a, b) => a - b
		);
		let bestBlue = -1;
		let best = [0, 0];
		const eps = 1e-6;
		candidates.forEach((c) => {
			let maxT2 = -Infinity;
			redPairs.forEach(([x, y]) => {
				if (x >= c) maxT2 = Math.max(maxT2, y);
			});
			const threshold2 = maxT2 === -Infinity ? -Infinity : maxT2 + eps;
			const blueInside = bluePoints.filter(
				(p) => dotPoint(n1, p) >= c && dotPoint(n2, p) >= threshold2
			).length;
			if (blueInside > bestBlue) {
				bestBlue = blueInside;
				best = [c, threshold2];
			}
		});
		d1 = best[0];
		d2 = best[1];
	} else {
		const { bestD1, bestD2 } = minimizeWedgeTotal(data, t1, t2);
		d1 = bestD1;
		d2 = bestD2;
	}

	const model = { type: "wedge", n1, n2, d1, d2 };
	return finalizeModel(data, model, objective);
}

function bestDiwedge(data, n1, n2, objective) {
	const t1 = data.map((p) => dotPoint(n1, p));
	const t2 = data.map((p) => dotPoint(n2, p));
	if (t1.length === 0) return null;
	const candidate1 = sampleValues(t1.slice().sort((a, b) => a - b), 14);
	const candidate2 = sampleValues(t2.slice().sort((a, b) => a - b), 14);
	let bestScore = Infinity;
	let best = [candidate1[0], candidate2[0]];
	candidate1.forEach((c1) => {
		candidate2.forEach((c2) => {
			const model = { type: "diwedge", n1, n2, d1: c1, d2: c2 };
			const { kR, kB } = countOutliers(data, model);
			let score = kR + kB;
			if (objective === "minRed" && kB > 0) score += 10000;
			if (objective === "minBlue" && kR > 0) score += 10000;
			if (score < bestScore) {
				bestScore = score;
				best = [c1, c2];
			}
		});
	});
	if (objective === "minTotal") {
		const { bestD1, bestD2 } = minimizeDiwedgeTotal(data, t1, t2);
		best = [bestD1, bestD2];
	}
	const model = { type: "diwedge", n1, n2, d1: best[0], d2: best[1] };
	return finalizeModel(data, model, objective);
}

function buildGrid(points, t1Vals, t2Vals, predicate) {
	const m = t1Vals.length;
	const n = t2Vals.length;
	const index1 = new Map(t1Vals.map((v, i) => [v, i]));
	const index2 = new Map(t2Vals.map((v, i) => [v, i]));
	const grid = Array.from({ length: m }, () => new Array(n).fill(0));
	points.forEach((p) => {
		if (!predicate(p)) return;
		const i = index1.get(p.t1);
		const j = index2.get(p.t2);
		grid[i][j] += 1;
	});
	const prefix = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			prefix[i][j] =
				grid[i - 1][j - 1] +
				prefix[i - 1][j] +
				prefix[i][j - 1] -
				prefix[i - 1][j - 1];
		}
	}
	return { prefix, total: prefix[m][n], grid };
}

function countUR(prefix, total, i, j, m, n) {
	const left = prefix[i][n];
	const below = prefix[m][j];
	const overlap = prefix[i][j];
	return total - left - below + overlap;
}

function countLL(prefix, i, j) {
	return prefix[i + 1][j + 1];
}

function minimizeWedgeTotal(data, t1, t2) {
	const points = data.map((p, idx) => ({
		label: p.label,
		t1: t1[idx],
		t2: t2[idx],
	}));
	const t1Vals = [...new Set(t1)].sort((a, b) => a - b);
	const t2Vals = [...new Set(t2)].sort((a, b) => a - b);
	const redGrid = buildGrid(points, t1Vals, t2Vals, (p) => p.label === 0);
	const blueGrid = buildGrid(points, t1Vals, t2Vals, (p) => p.label === 1);
	let bestScore = Infinity;
	let bestD1 = t1Vals[0];
	let bestD2 = t2Vals[0];
	for (let i = 0; i < t1Vals.length; i++) {
		for (let j = 0; j < t2Vals.length; j++) {
			const redIn = countUR(redGrid.prefix, redGrid.total, i, j, t1Vals.length, t2Vals.length);
			const blueIn = countUR(blueGrid.prefix, blueGrid.total, i, j, t1Vals.length, t2Vals.length);
			const blueOut = blueGrid.total - blueIn;
			const score = redIn + blueOut;
			if (score < bestScore) {
				bestScore = score;
				bestD1 = t1Vals[i];
				bestD2 = t2Vals[j];
			}
		}
	}
	return { bestD1, bestD2 };
}

function minimizeDiwedgeTotal(data, t1, t2) {
	const points = data.map((p, idx) => ({
		label: p.label,
		t1: t1[idx],
		t2: t2[idx],
	}));
	const t1Vals = [...new Set(t1)].sort((a, b) => a - b);
	const t2Vals = [...new Set(t2)].sort((a, b) => a - b);
	const redGrid = buildGrid(points, t1Vals, t2Vals, (p) => p.label === 0);
	const blueGrid = buildGrid(points, t1Vals, t2Vals, (p) => p.label === 1);
	let bestScore = Infinity;
	let bestD1 = t1Vals[0];
	let bestD2 = t2Vals[0];
	for (let i = 0; i < t1Vals.length; i++) {
		for (let j = 0; j < t2Vals.length; j++) {
			const redUR = countUR(redGrid.prefix, redGrid.total, i, j, t1Vals.length, t2Vals.length);
			const blueUR = countUR(blueGrid.prefix, blueGrid.total, i, j, t1Vals.length, t2Vals.length);
			const redLL = countLL(redGrid.prefix, i, j);
			const blueLL = countLL(blueGrid.prefix, i, j);
			const redOverlap = redGrid.grid[i][j];
			const blueOverlap = blueGrid.grid[i][j];
			const redIn = redUR + redLL - redOverlap;
			const blueIn = blueUR + blueLL - blueOverlap;
			const blueOut = blueGrid.total - blueIn;
			const score = redIn + blueOut;
			if (score < bestScore) {
				bestScore = score;
				bestD1 = t1Vals[i];
				bestD2 = t2Vals[j];
			}
		}
	}
	return { bestD1, bestD2 };
}

function finalizeModel(data, model, objective) {
	const { kR, kB } = countOutliers(data, model);
	let score = kR + kB;
	let note = "";
	if (objective === "minRed") {
		if (kB > 0) note = "No feasible kB=0 solution.";
		score = kB === 0 ? kR : score + 10000;
	} else if (objective === "minBlue") {
		if (kR > 0) note = "No feasible kR=0 solution.";
		score = kR === 0 ? kB : score + 10000;
	}
	return { ...model, kR, kB, score, note };
}

function isPointInRegion(point, model) {
	if (model.type === "halfplane") {
		return dotPoint(model.n, point) >= model.d;
	}
	if (model.type === "slice") {
		const t = dotPoint(model.n, point);
		return t >= model.d1 && t <= model.d2;
	}
	if (model.type === "wedge") {
		return dotPoint(model.n1, point) >= model.d1 && dotPoint(model.n2, point) >= model.d2;
	}
	if (model.type === "diwedge") {
		const t1 = dotPoint(model.n1, point) - model.d1;
		const t2 = dotPoint(model.n2, point) - model.d2;
		return t1 * t2 >= 0;
	}
	return false;
}

function countOutliers(data, model) {
	let kR = 0;
	let kB = 0;
	data.forEach((p) => {
		const inside = isPointInRegion(p, model);
		if (p.label === 1) {
			if (!inside) kB += 1;
		} else if (inside) {
			kR += 1;
		}
	});
	return { kR, kB };
}

function countInRange(sortedValues, a, b) {
	const left = upperBound(sortedValues, a);
	const right = lowerBound(sortedValues, b);
	return Math.max(0, right - left);
}

function lowerBound(arr, target) {
	let lo = 0;
	let hi = arr.length;
	while (lo < hi) {
		const mid = Math.floor((lo + hi) / 2);
		if (arr[mid] < target) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

function upperBound(arr, target) {
	let lo = 0;
	let hi = arr.length;
	while (lo < hi) {
		const mid = Math.floor((lo + hi) / 2);
		if (arr[mid] <= target) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

function sampleValues(sortedValues, maxSamples) {
	if (sortedValues.length <= maxSamples) return sortedValues;
	const step = (sortedValues.length - 1) / (maxSamples - 1);
	const sampled = [];
	for (let i = 0; i < maxSamples; i++) {
		sampled.push(sortedValues[Math.round(i * step)]);
	}
	return sampled;
}

function rotatePoint(point, yaw, pitch) {
	const cy = Math.cos(yaw);
	const sy = Math.sin(yaw);
	const cp = Math.cos(pitch);
	const sp = Math.sin(pitch);
	const x1 = point.x * cy - point.z * sy;
	const z1 = point.x * sy + point.z * cy;
	const y2 = point.y * cp - z1 * sp;
	const z2 = point.y * sp + z1 * cp;
	return { x: x1, y: y2, z: z2 };
}

function normalizePlane(n, d) {
	const len = Math.hypot(n[0], n[1], n[2]);
	if (len < 1e-8) return null;
	return { n: [n[0] / len, n[1] / len, n[2] / len], d: d / len };
}

function planeBasis(n) {
	const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
	const u = normalize(cross(n, ref));
	const v = normalize(cross(n, u));
	return { u, v };
}

function computeExtent(points) {
	let maxR = 1;
	points.forEach((p) => {
		const r = Math.hypot(p.x, p.y, p.z);
		if (r > maxR) maxR = r;
	});
	return maxR;
}

function draw() {
	const { width, height } = ui.canvas;
	const { yaw, pitch, zoom } = state.camera;
	const center = meanVector(state.data);
	const extent = computeExtent(state.data);
	const cameraDist = extent * 3;

	ctx.fillStyle = "#0a0f1a";
	ctx.fillRect(0, 0, width, height);

	const projectPoint = (world) => {
		const centered = { x: world.x - center[0], y: world.y - center[1], z: world.z - center[2] };
		const rotated = rotatePoint(centered, yaw, pitch);
		const depth = cameraDist + rotated.z;
		const scale = (width * 0.45 * zoom) / depth;
		return {
			x: rotated.x * scale + width / 2,
			y: -rotated.y * scale + height / 2,
			z: rotated.z,
		};
	};

	drawDecisionBoundary(projectPoint, extent * 1.2);

	const projected = state.data.map((p) => {
		const projectedPoint = projectPoint(p);
		return {
			...projectedPoint,
			label: p.label,
		};
	});

	projected.sort((a, b) => a.z - b.z);
	projected.forEach((p) => {
		const radius = 3.4;
		ctx.beginPath();
		ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
		ctx.fillStyle = p.label === 1 ? COLORS.class1 : COLORS.class0;
		ctx.fill();
	});

	renderMetrics();
}

function drawDecisionBoundary(projectPoint, size) {
	if (!state.model) return;
	const model = state.model;
	const planes = [];
	if (model.type === "halfplane") {
		planes.push({ n: model.n, d: model.d, color: "rgba(255,255,255,0.35)" });
	} else if (model.type === "slice") {
		planes.push({ n: model.n, d: model.d1, color: "rgba(255,255,255,0.35)" });
		planes.push({ n: model.n, d: model.d2, color: "rgba(255,255,255,0.35)" });
	} else if (model.type === "wedge" || model.type === "diwedge") {
		planes.push({ n: model.n1, d: model.d1, color: "rgba(255,255,255,0.3)" });
		planes.push({ n: model.n2, d: model.d2, color: "rgba(255,255,255,0.3)" });
	}

	planes.forEach((plane) => drawPlaneGrid(plane, projectPoint, size));
}

function drawPlaneGrid(plane, projectPoint, size) {
	const normalized = normalizePlane(plane.n, plane.d);
	if (!normalized) return;
	const { n, d } = normalized;
	const basis = planeBasis(n);
	if (!basis || !basis.u || !basis.v) return;
	const { u, v } = basis;
	const step = size / 6;
	ctx.strokeStyle = plane.color;
	ctx.lineWidth = 1;

	for (let i = -3; i <= 3; i++) {
		const offset = i * step;
		const lineStart = pointOnPlane(n, d, u, v, -size, offset);
		const lineEnd = pointOnPlane(n, d, u, v, size, offset);
		drawProjectedLine(lineStart, lineEnd, projectPoint);
	}
	for (let j = -3; j <= 3; j++) {
		const offset = j * step;
		const lineStart = pointOnPlane(n, d, u, v, offset, -size);
		const lineEnd = pointOnPlane(n, d, u, v, offset, size);
		drawProjectedLine(lineStart, lineEnd, projectPoint);
	}
}

function pointOnPlane(n, d, u, v, a, b) {
	return {
		x: n[0] * d + u[0] * a + v[0] * b,
		y: n[1] * d + u[1] * a + v[1] * b,
		z: n[2] * d + u[2] * a + v[2] * b,
	};
}

function drawProjectedLine(a, b, projectPoint) {
	const pa = projectPoint(a);
	const pb = projectPoint(b);
	ctx.beginPath();
	ctx.moveTo(pa.x, pa.y);
	ctx.lineTo(pb.x, pb.y);
	ctx.stroke();
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function setupInteraction() {
	ui.canvas.addEventListener("pointerdown", (event) => {
		state.interaction.dragging = true;
		state.interaction.lastX = event.clientX;
		state.interaction.lastY = event.clientY;
		ui.canvas.setPointerCapture(event.pointerId);
	});

	ui.canvas.addEventListener("pointermove", (event) => {
		if (!state.interaction.dragging) return;
		const dx = event.clientX - state.interaction.lastX;
		const dy = event.clientY - state.interaction.lastY;
		state.interaction.lastX = event.clientX;
		state.interaction.lastY = event.clientY;

		state.camera.yaw += dx * 0.008;
		state.camera.pitch = clamp(state.camera.pitch + dy * 0.008, -1.4, 1.4);
		draw();
	});

	ui.canvas.addEventListener("pointerup", (event) => {
		state.interaction.dragging = false;
		ui.canvas.releasePointerCapture(event.pointerId);
	});

	ui.canvas.addEventListener("pointerleave", () => {
		state.interaction.dragging = false;
	});

	ui.canvas.addEventListener("wheel", (event) => {
		event.preventDefault();
		const delta = Math.sign(event.deltaY) * 0.1;
		state.camera.zoom = clamp(state.camera.zoom - delta, 0.6, 2.4);
		draw();
	});
}

function renderMetrics() {
	const classifier = state.classifier;
	let correct = 0;
	state.data.forEach((p) => {
		const pred = classifier(p) ? 1 : 0;
		if (pred === p.label) correct += 1;
	});
	const accuracy = (correct / state.data.length) * 100;
	const modelOutliers = state.model ? countOutliers(state.data, state.model) : { kR: 0, kB: 0 };
	const note = state.model?.note ? `<div class="note">${state.model.note}</div>` : "";
	ui.metrics.innerHTML = `
		<div><strong>Accuracy:</strong> ${accuracy.toFixed(1)}%</div>
		<div><strong>Total points:</strong> ${state.data.length}</div>
		<div><strong>kR (red inside):</strong> ${modelOutliers.kR}</div>
		<div><strong>kB (blue outside):</strong> ${modelOutliers.kB}</div>
		${note}
	`;
}

function recomputeAll() {
	updateValueDisplays();
	setClusterVisibility();
	trainClassifier();
	draw();
}

function regenerateAll() {
	updateValueDisplays();
	setClusterVisibility();
	generateData();
	trainClassifier();
	draw();
}

function setClusterVisibility() {
	document.querySelectorAll("[data-blue-cluster]").forEach((el) => {
		el.style.display = ui.blueCluster.checked ? "grid" : "none";
	});
}

setDefaults();
setClusterVisibility();
generateData();
trainClassifier();
draw();

[
	ui.separability,
	ui.redSpread,
	ui.blueSpread,
	ui.pointsPerClass,
	ui.seed,
	ui.blueCluster,
	ui.blueClusterOffset,
	ui.redShiftX,
	ui.redShiftY,
	ui.redShiftZ,
	ui.blueShiftX,
	ui.blueShiftY,
	ui.blueShiftZ,
].forEach((input) => input.addEventListener("input", regenerateAll));


[ui.classifierType, ui.solverMode, ui.outlierObjective].forEach((input) =>
	input.addEventListener("input", recomputeAll)
);

setupInteraction();
