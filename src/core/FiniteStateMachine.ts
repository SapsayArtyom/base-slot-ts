export class FiniteStateMachine<State extends string> {
	private currentState: State;
	private transitions: Map<State, State[]>;

	constructor(initialState: State, transitions: Record<State, State[]>) {
		this.currentState = initialState;
		this.transitions = new Map(Object.entries(transitions) as [State, State[]][]);
	}

	getState() {
		return this.currentState;
	}

	transitionTo(newState: State): State {
		const valid = this.transitions.get(this.currentState) || [];
		if (!valid.includes(newState)) {
			throw new Error(`Invalid state transition from ${this.currentState} to ${newState}.`);
		}
		this.currentState = newState;
		return this.currentState;
	}
}
