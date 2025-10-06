import { gsap } from 'gsap';
import * as PIXI from 'pixi.js';
import config from '../config';
import type { WinCell, WinLine } from '../types';
import { ReelView } from './ReelView';

export class GameView {
	readonly app = new PIXI.Application();
	private board = new PIXI.Container();
	private reels: ReelView[] = [];
	private texturesByKey: Record<string, PIXI.Texture> = {};
	private readonly cols = config.cols;
	private readonly symbolSize = config.symbolSize;
	private readonly gap = config.gap;

	constructor(
		private mount: HTMLElement,
		private readonly rowsVisible: number
	) {}

	async init(assets: { alias: string; src: string }[]) {
		await this.app.init({ background: '#0e0f14', resizeTo: window, antialias: true });
		this.mount.appendChild(this.app.canvas);

		const bundleMap: Record<string, string> = Object.fromEntries(
			assets.map((a) => [a.alias, a.src])
		);
		PIXI.Assets.addBundle('symbols', bundleMap);
		const bundle = (await PIXI.Assets.loadBundle('symbols')) as Record<string, PIXI.Texture>;
		this.texturesByKey = bundle;

		const totalW = this.cols * this.symbolSize + (this.cols - 1) * this.gap;
		const totalH = this.rowsVisible * this.symbolSize + (this.rowsVisible - 1) * this.gap;
		const panelPadding = 16;
		const panelW = totalW + panelPadding * 2;
		const panelH = totalH;

		const panel = new PIXI.Graphics();
		panel
			.roundRect(0, 0, panelW, panelH, 20)
			.fill({ color: 0x1a2030 })
			.stroke({ color: 0x2b3244, width: 2 });
		this.board.addChild(panel);

		const aliases = Object.keys(this.texturesByKey);
		for (let c = 0; c < this.cols; c++) {
			const rv = new ReelView(
				this.texturesByKey,
				this.symbolSize,
				this.rowsVisible,
				this.gap
			);
			const winLen = this.rowsVisible + 2;
			const start = c % aliases.length;
			const window = Array.from(
				{ length: winLen },
				(_, i) => aliases[(start + i) % aliases.length]
			);
			rv.setWindowSymbols(window);
			rv.container.x = panelPadding + c * (this.symbolSize + this.gap);
			this.board.addChild(rv.container);
			this.reels.push(rv);
		}

		this.centerBoard(panelW, panelH);
		this.app.stage.addChild(this.board);

		window.addEventListener('resize', () => this.centerBoard(panelW, panelH));
	}

	private centerBoard(panelW: number, panelH: number) {
		this.board.x = (this.app.renderer.width - panelW) / 2;
		this.board.y = (this.app.renderer.height - panelH) / 2;
	}

	public playSpin(stopWindows: string[][]): Promise<void> {
		const expected = this.rowsVisible + 2;
		const promises: Promise<void>[] = [];

		this.reels.forEach((rv, i) => {
			rv.startSpinCycle(100);
			const stopWindow = stopWindows[i].slice(0, expected);
			const delay = 0.4 + i * 0.25;
			promises.push(
				new Promise((resolve) => {
					gsap.delayedCall(delay, () => {
						rv.requestStop(stopWindow).then(resolve);
					});
				})
			);
		});

		return Promise.all(promises).then(() => void 0);
	}

	public highlightCells(cells: WinCell[]) {
		const grouped: number[][] = [];
		cells.forEach(({ reel, row }) => {
			if (!grouped[reel]) grouped[reel] = [];
			grouped[reel].push(row);
		});

		grouped.forEach((rows, index) => {
			this.reels[index]?.highlightVisibleRow(rows);
		});
	}

	public highlightLines(lines: WinLine[]) {
		let arrCells: WinCell[] = [];
		for (const line of lines) arrCells = arrCells.concat(line.cells);
		this.highlightCells(arrCells);
	}

	public clearHighlights() {
		this.reels.forEach((rv) => rv.clearHighlights());
	}
}
