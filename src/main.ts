import { GameEngine } from './engine/GameEngine';

// Create and start the game engine when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    game.start();
}); 