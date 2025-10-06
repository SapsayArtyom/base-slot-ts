import { Game } from './Game';

const mount = document.getElementById('app')!;
const game = new Game(mount);
await game.init();
