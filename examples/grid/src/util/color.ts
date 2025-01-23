export const rgbToHsl = (rInt: number, gInt: number, bInt: number): [number, number, number] => {
	const r = rInt / 255;
	const g = gInt / 255;
	const b = bInt / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s: number;
	const l = (max + min) / 2; // Initialize h with a default value

	if (max === min) {
		h = s = 0; // achromatic
	} else {
		const chromaticity = max - min;
		s = l > 0.5 ? chromaticity / (2 - max - min) : chromaticity / (max + min);
		switch (max) {
			case r:
				h = (g - b) / chromaticity + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / chromaticity + 2;
				break;
			case b:
				h = (r - g) / chromaticity + 4;
				break;
		}
		h /= 6;
	}
	return [h * 360, s, l];
};

export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
	let r: number;
	let g: number;
	let b: number;

	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = (p: number, q: number, t_: number) => {
			let t = t_;
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h / 360 + 1 / 3);
		g = hue2rgb(p, q, h / 360);
		b = hue2rgb(p, q, h / 360 - 1 / 3);
	}

	return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

export const rgbToHex = (r: number, g: number, b: number): string => {
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
