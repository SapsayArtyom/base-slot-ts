import { EventEmitter } from '../core/EventEmitter';
import { FiniteStateMachine } from '../core/FiniteStateMachine';
import type { EngineConfig, EngineEvents, EngineState, SpinDisplay, WinLine } from '../types';

export class SlotMachineEngine {
	readonly config: Required<Pick<EngineConfig, 'visibleCount'>> &
		Omit<EngineConfig, 'visibleCount'>;
	private reels: string[][];
	private fsm: FiniteStateMachine<EngineState>;
	private notifier = new EventEmitter<EngineEvents>();
	private readonly visibleCount: number;

	constructor(config: EngineConfig) {
		const vc = Math.max(3, Math.min(5, config.visibleCount ?? 3));
		this.visibleCount = vc;
		this.config = { ...config, visibleCount: vc };

		this.reels = this.config.reels.map((r) => r.symbols);
		this.fsm = new FiniteStateMachine<EngineState>('READY', {
			READY: ['SPINNING'],
			SPINNING: ['EVALUATING'],
			EVALUATING: ['RESULT'],
			RESULT: ['READY'],
		});
	}

	on<K extends keyof EngineEvents & string>(name: K, cb: (p: EngineEvents[K]) => void) {
		this.notifier.subscribe(name, cb);
	}

	private changeState(s: EngineState) {
		this.fsm.transitionTo(s);
		this.notifier.notify('stateChanged', { newState: s });
	}

	spin() {
		if (this.fsm.getState() !== 'READY') return;
		try {
			this.changeState('SPINNING');
			const display = this.generateSpinDisplayWindow();
			const evalRes = this.evaluateWin(display);

			let done = false;
			const callback = () => {
				if (done) return;
				done = true;
				this.changeState('EVALUATING');
				this.changeState('RESULT');
				this.changeState('READY');
			};
			this.notifier.notify('spinPrepared', { display, callback, ...evalRes });
		} catch (e) {
			console.error(e);
			try {
				this.changeState('READY');
			} catch {
				console.log('Failed to recover state');
			}
		}
	}

	generateSpinDisplayWindow(): SpinDisplay {
		const V = this.visibleCount;
		const reels = this.reels.map((symbols) => {
			const len = symbols.length;
			const start = Math.floor(Math.random() * len);
			const window: string[] = new Array(V + 2);
			window[0] = symbols[(start - 1 + len) % len];
			for (let k = 0; k < V; k++) window[1 + k] = symbols[(start + k) % len];
			window[V + 1] = symbols[(start + V) % len];
			return window;
		});
		return { reels, visibleCount: V };
	}

	evaluateWin(display: SpinDisplay) {
		const V = display.visibleCount;
		const reels = display.reels;
		const rowWins: number[] = [];
		const lines: WinLine[] = [];

		for (let row = 0; row < V; row++) {
			const idx = row + 1;
			const first = reels[0][idx];
			const ok = reels.every((reel) => reel[idx] === first);
			if (ok) {
				rowWins.push(row);
				lines.push({ kind: 'row', row, cells: [0, 1, 2].map((c) => ({ reel: c, row })) });
			}
		}

		for (let s = 0; s + 2 < V; s++) {
			const a = reels[0][s + 1];
			const b = reels[1][s + 1 + 1];
			const c = reels[2][s + 1 + 2];
			if (a === b && b === c) {
				lines.push({
					kind: 'diag',
					diag: 'main',
					startRow: s,
					cells: [
						{ reel: 0, row: s },
						{ reel: 1, row: s + 1 },
						{ reel: 2, row: s + 2 },
					],
				});
			}
		}

		for (let s = 2; s < V; s++) {
			const a = reels[0][s + 1];
			const b = reels[1][s + 1 - 1];
			const c = reels[2][s + 1 - 2];
			if (a === b && b === c) {
				lines.push({
					kind: 'diag',
					diag: 'anti',
					startRow: s,
					cells: [
						{ reel: 0, row: s },
						{ reel: 1, row: s - 1 },
						{ reel: 2, row: s - 2 },
					],
				});
			}
		}

		const isWin = lines.length > 0;
		const winAmount = isWin ? 100 * lines.length : undefined;
		return { isWin, winRows: rowWins, winLines: lines, winAmount };
	}
}
