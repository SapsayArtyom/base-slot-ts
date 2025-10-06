export type SymbolId = number;

export interface SpinDisplay {
	reels: string[][];
	visibleCount: number;
}

export interface EngineConfig {
	reels: { symbols: string[] }[];
	visibleCount?: number;
}

export interface WinCell {
	reel: number;
	row: number;
}

export type WinLine =
	| { kind: 'row'; row: number; cells: WinCell[] }
	| { kind: 'diag'; diag: 'main' | 'anti'; startRow: number; cells: WinCell[] };

export interface SpinResult {
	display: SpinDisplay;
	winRows: number[];
	winLines: WinLine[];
	isWin: boolean;
	winAmount?: number;
}

export type EngineState = 'READY' | 'SPINNING' | 'EVALUATING' | 'RESULT';

export interface EngineEvents {
	stateChanged: { newState: EngineState };
	spinPrepared: {
		display: SpinDisplay;
		isWin: boolean;
		winRows: number[];
		winLines: WinLine[];
		winAmount?: number;
		callback: () => void;
	};
}
