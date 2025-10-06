import { SYMBOL_ASSETS } from './assets';
import config from './config';
import { SlotMachineEngine } from './engine/SlotMachineEngine';
import type { EngineConfig, WinLine } from './types';
import { GameView } from './ui/GameView';

export class Game {
	private view: GameView;
	private engine: SlotMachineEngine;
	private msgEl = document.querySelector('#overlay .message') as HTMLDivElement;
	private spinBtn = document.getElementById('spin') as HTMLButtonElement;
	private lastResult: {
		windows: string[][];
		winRows: number[];
		isWin: boolean;
		winAmount?: number;
		winLines: WinLine[];
	} | null = null;

	constructor(mount: HTMLElement) {
		const VISIBLE = config.rows;
		const conf: EngineConfig = {
			visibleCount: VISIBLE,
			reels: config.startPositions as { symbols: string[] }[],
		};
		this.engine = new SlotMachineEngine(conf);
		this.view = new GameView(mount, VISIBLE);
	}

	async init() {
		await this.view.init(SYMBOL_ASSETS);

		this.engine.on('stateChanged', ({ newState }) => {
			if (newState === 'SPINNING') {
				this.spinBtn.disabled = true;
				this.msgEl.classList.remove('show');
				this.view.clearHighlights();
				this.lastResult = null;
			}
			if (newState === 'READY') {
				this.spinBtn.disabled = false;
			}
		});

		this.engine.on(
			'spinPrepared',
			({ display, isWin, winRows, winLines, winAmount, callback }) => {
				const windows = display.reels;
				this.lastResult = { windows, winRows, isWin, winAmount, winLines };

				this.view.playSpin(windows).then(() => {
					if (this.lastResult?.isWin) {
						this.view.highlightLines(this.lastResult.winLines);
						this.msgEl.textContent = `Congratulations! +${this.lastResult.winAmount}`;
						this.msgEl.classList.add('show');
					} else {
						this.msgEl.textContent = 'Try again!';
					}
					callback();
				});
			}
		);

		this.spinBtn.addEventListener('click', () => this.engine.spin());
	}
}
