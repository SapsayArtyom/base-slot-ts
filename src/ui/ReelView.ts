import { gsap } from 'gsap';
import * as PIXI from 'pixi.js';

export class ReelView {
	readonly container = new PIXI.Container();
	private maskG = new PIXI.Graphics();
	private track = new PIXI.Container();
	private sprites: PIXI.Sprite[] = [];
	private aliases: string[] = [];

	private spinTween?: gsap.core.Tween;
	private isSpinning = false;
	private cycleMs = 120;

	private stopPlan: {
		target: string[];
		queue: string[];
		fed: number;
		resolve?: () => void;
	} | null = null;

	constructor(
		private texturesByKey: Record<string, PIXI.Texture>,
		private readonly symbolSize: number,
		private readonly rowsVisible: number,
		private readonly gap: number
	) {
		this.container.addChild(this.maskG, this.track);
		this.track.mask = this.maskG;
	}

	private stepSize() {
		return this.symbolSize + this.gap;
	}

	private normalizeGrid() {
		const step = this.stepSize();
		this.sprites.forEach((spr, i) => {
			spr.y = i * step;
		});
		this.track.y = -step;
	}

	setWindowSymbols(windowTopToBottom: string[]) {
		const expected = this.rowsVisible + 2;
		if (windowTopToBottom.length !== expected)
			throw new Error(`ReelView.setWindowSymbols expects ${expected} symbols`);
		windowTopToBottom.forEach((key) => {
			if (!this.texturesByKey[key]) throw new Error(`Texture not loaded for key: ${key}`);
		});

		const step = this.stepSize();
		const maskH = step * this.rowsVisible - this.gap;
		this.maskG.clear().rect(0, 0, this.symbolSize, maskH).fill({ color: 0xffffff });

		this.track.removeChildren();
		this.sprites = [];
		this.aliases = windowTopToBottom.slice();
		this.aliases.forEach((key, i) => {
			const spr = new PIXI.Sprite(this.texturesByKey[key]);
			spr.width = spr.height = this.symbolSize;
			spr.x = 0;
			spr.y = i * step;
			this.track.addChild(spr);
			this.sprites.push(spr);
		});
		this.normalizeGrid();
	}

	startSpinCycle(cycleMs = 120) {
		this.killSpin();
		this.cycleMs = cycleMs;
		this.isSpinning = true;

		const step = this.stepSize();
		this.normalizeGrid();

		const W = this.sprites.length;

		const tick = () => {
			this.spinTween = gsap.to(this.sprites, {
				y: '+=' + step,
				duration: this.cycleMs / 1000,
				ease: 'none',
				onComplete: () => {
					const tailSpr = this.sprites.pop()!;
					tailSpr.y = this.sprites[0].y - step;
					this.sprites.unshift(tailSpr);

					const tailAlias = this.aliases.pop()!;
					this.aliases.unshift(tailAlias);

					if (this.stopPlan) {
						const { queue, fed } = this.stopPlan;
						if (fed < W) {
							const nextAlias = queue[fed];
							this.aliases[0] = nextAlias;
							this.sprites[0].texture = this.texturesByKey[nextAlias];
							this.stopPlan.fed++;
						}
					}

					this.sprites.forEach((spr, i) => {
						spr.y = i * step;
					});

					if (this.stopPlan && this.stopPlan.fed >= W) {
						const res = this.stopPlan.resolve;
						const target = this.stopPlan.target;
						this.stopPlan = null;
						this.isSpinning = false;
						this.performStopAligned(target, res);
					} else {
						tick();
					}
				},
			});
		};
		tick();
	}

	requestStop(finalWindow: string[]): Promise<void> {
		const expected = this.rowsVisible + 2;
		if (finalWindow.length !== expected)
			throw new Error(`requestStop expects ${expected} symbols`);
		finalWindow.forEach((key) => {
			if (!this.texturesByKey[key]) throw new Error(`Texture not loaded for key: ${key}`);
		});

		const queue = finalWindow.slice().reverse();

		return new Promise<void>((resolve) => {
			this.stopPlan = { target: finalWindow.slice(), queue, fed: 0, resolve };
			if (!this.isSpinning) {
				const res = this.stopPlan.resolve;
				const target = this.stopPlan.target;
				this.stopPlan = null;
				this.performStopAligned(target, res);
			}
		});
	}

	private performStopAligned(_target: string[], done?: () => void) {
		const step = this.stepSize();
		const bounce = Math.min(36, step * 0.28);

		const tl = gsap.timeline({
			onComplete: () => {
				this.normalizeGrid();
				done?.();
			},
		});
		this.sprites.forEach((spr) => {
			const y0 = spr.y;
			tl.fromTo(spr, { y: y0 + bounce }, { y: y0, duration: 0.3, ease: 'back.out(2.2)' }, 0);
		});
	}

	clearHighlights() {
		for (const spr of this.sprites) spr.tint = 0xffffff;
	}

	highlightVisibleRow(row: number[]) {
		this.sprites.forEach((s, i) => {
			if (!row.includes(i - 1)) s.tint = 0x2a2a2a;
		});
	}

	private killSpin() {
		this.spinTween?.kill();
		this.spinTween = undefined;
		this.isSpinning = false;
		this.stopPlan = null;
	}
}
