import { Engine } from './core/Engine';

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', async () => {
  // Create the game engine
  const engine = new Engine();
  
  try {
    // Start the engine (this loads config)
    await engine.start();
  
    // Handle window resize events
    window.addEventListener('resize', () => {
      engine.resize();
    });
    
    console.log('Fungeon engine started successfully');
  } catch (error) {
    console.error('Failed to start engine:', error);
  }
}); 