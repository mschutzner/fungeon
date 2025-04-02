import * as THREE from 'three';
import { State } from './State';
import { Renderer } from '../../rendering/Renderer';
import { TextBox } from '../../ui/elements/TextBox';
import { Engine } from '../Engine';
import { EventSystem } from '../events/EventSystem';
import { InputEventType } from '../input/InputManager';
import { ConstraintType } from '../../ecs';

/**
 * Menu state for navigating to different constraint demos
 */
export class DemoMenuState extends State {
  private engine: Engine;
  private scene: THREE.Scene | null = null;
  private eventSystem: EventSystem;
  private eventUnsubscribe: (() => void)[] = [];
  
  // UI elements
  private titleText: TextBox | null = null;
  private menuItems: TextBox[] = [];
  private selectedItemIndex: number = 0;
  
  // Map of constraint types to demo state IDs
  private demoStateMap: Record<ConstraintType, string> = {
    [ConstraintType.TRACK_TO]: 'trackToDemo',
    [ConstraintType.LOOK_AT]: 'lookAtDemo',
    [ConstraintType.COPY_TRANSFORM]: 'copyTransformDemo',
    [ConstraintType.LIMIT]: 'limitDemo',
    [ConstraintType.DISTANCE]: 'distanceDemo',
    [ConstraintType.LOCK]: 'lockDemo',
    [ConstraintType.PATH_FOLLOW]: 'pathFollowDemo',
    [ConstraintType.ORIENT]: 'orientDemo',
    [ConstraintType.PIVOT]: 'pivotDemo',
    [ConstraintType.SPRING]: 'springDemo',
    [ConstraintType.FLOOR]: 'floorDemo'
  };
  
  // Store constraint types for easier access
  private menuConstraintTypes: ConstraintType[] = [];
  
  constructor(engine: Engine) {
    super('menu');
    this.engine = engine;
    this.eventSystem = EventSystem.getInstance();
  }
  
  /**
   * Set up the menu state
   */
  async enter(): Promise<void> {
    console.log('Entering menu state');
    
    // Create a simple scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222244);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    // Subscribe to input events
    this.subscribeToEvents();
    
    return Promise.resolve();
  }
  
  /**
   * Clean up the menu state
   */
  async exit(): Promise<void> {
    console.log('Exiting menu state');
    
    // Clean up event subscriptions
    this.unsubscribeFromEvents();
    
    // Clean up UI elements
    this.menuItems = [];
    this.selectedItemIndex = 0;
    
    // Clear the scene if it exists
    if (this.scene) {
      this.disposeSceneObjects(this.scene);
      this.scene = null;
    }
    
    return Promise.resolve();
  }
  
  /**
   * Update the menu state
   */
  update(deltaTime: number): void {
    // Update menu item appearance based on selection
    this.updateMenuItemHighlights();
  }
  
  /**
   * Setup rendering data for the renderer
   */
  setupRenderingData(renderer: Renderer): void {
    // Create UI elements
    this.createUIElements(renderer);
  }
  
  /**
   * Subscribe to keyboard events for menu navigation
   */
  private subscribeToEvents(): void {
    // Subscribe to keyboard events for navigation
    const keyDownUnsub = this.eventSystem.subscribe(InputEventType.KEY_DOWN, (data) => {
      switch (data.key) {
        case 'ArrowUp':
        case 'arrowup':
        case 'w':
          this.navigateMenu(-1);
          break;
        case 'ArrowDown':
        case 'arrowdown':
        case 's':
          this.navigateMenu(1);
          break;
        case 'Enter':
        case 'enter':
        case ' ':
        case 'space':
          this.selectCurrentMenuItem();
          console.log('Attempting to select menu item:', this.selectedItemIndex);
          break;
      }
    });
    
    this.eventUnsubscribe.push(keyDownUnsub);
  }
  
  /**
   * Navigate through menu items
   * @param direction 1 for down, -1 for up
   */
  private navigateMenu(direction: number): void {
    const itemCount = this.menuItems.length;
    if (itemCount === 0) return;
    
    // Update selected index with wrapping
    this.selectedItemIndex = (this.selectedItemIndex + direction + itemCount) % itemCount;
    
    console.log(`Selected menu item: ${this.selectedItemIndex}`);
  }
  
  /**
   * Select the currently highlighted menu item
   */
  private selectCurrentMenuItem(): void {
    if (this.selectedItemIndex < 0 || this.selectedItemIndex >= this.menuConstraintTypes.length) {
      console.error('Invalid menu item index:', this.selectedItemIndex);
      return;
    }
    
    const constraintType = this.menuConstraintTypes[this.selectedItemIndex];
    console.log('Selected constraint type:', constraintType);
    
    const demoStateId = this.demoStateMap[constraintType];
    console.log('Demo state ID:', demoStateId);
    
    if (demoStateId) {
      const stateManager = this.engine.getStateManager();
      if (stateManager) {
        console.log('Switching to state:', demoStateId);
        stateManager.switchState(demoStateId);
      } else {
        console.error('State manager not found!');
      }
    } else {
      console.error('No demo state ID found for constraint type:', constraintType);
    }
  }
  
  /**
   * Update the appearance of menu items based on selection
   */
  private updateMenuItemHighlights(): void {
    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i];
      const constraintType = this.menuConstraintTypes[i];
      const displayName = this.formatConstraintTypeName(constraintType);
      
      if (i === this.selectedItemIndex) {
        // Highlight selected item with yellow color and arrow indicator
        item.setText(`> ${displayName} <`);
        item.setTextColor('#ffff00'); // Yellow for selected
      } else {
        // Normal color and no indicator for unselected items
        item.setText(displayName);
        item.setTextColor('#ffffff');
      }
    }
  }
  
  /**
   * Unsubscribe from events
   */
  private unsubscribeFromEvents(): void {
    // Call all unsubscribe functions
    for (const unsub of this.eventUnsubscribe) {
      unsub();
    }
    
    // Clear the array
    this.eventUnsubscribe = [];
  }
  
  /**
   * Create UI elements
   */
  private createUIElements(renderer: Renderer): void {
    const uiSystem = renderer.getUISystem();
    if (!uiSystem) return;
    
    // Title text
    this.titleText = new TextBox(
      0,
      4,
      224,
      12, // Smaller height for tiny font
      'Constraint System Demos',
      'vga', // Use tiny font instead of vga
      1, // Slightly larger scale for title
      '#ffff00',
      'center'
    );
    uiSystem.addElement(this.titleText);
    
    // Instructions
    const instructions = new TextBox(
      22,
      24,
      180,
      20, // Smaller height for tiny font
      'Use arrow keys to navigate and Enter to select',
      'tiny', // Use tiny font instead of vga
      1,
      '#8080ff',
      'center',
      2,
    );
    uiSystem.addElement(instructions);
    
    // Create menu items for constraint types
    this.createMenuItems(renderer, uiSystem);
  }
  
  /**
   * Create menu items for each constraint type
   */
  private createMenuItems(renderer: Renderer, uiSystem: any): void {
    const startX = 0;
    const startY = 48;
    const itemWidth = 224;
    const itemHeight = 6; // Smaller height for tiny font
    const itemSpacing = 2;  // Only 2 pixels of spacing between items
    let itemY = startY;
    
    // Clear existing menu items
    this.menuItems = [];
    this.menuConstraintTypes = [];
    
    // Get all constraint types that have demo states
    const constraintTypes = Object.keys(this.demoStateMap)
      .filter(key => this.demoStateMap[key as ConstraintType])
      .map(key => key as ConstraintType);
    
    // Save for later use
    this.menuConstraintTypes = constraintTypes;
    
    // Create a TextBox for each constraint type
    for (const constraintType of constraintTypes) {
      const displayName = this.formatConstraintTypeName(constraintType);
      
      const menuItem = new TextBox(
        startX,
        itemY,
        itemWidth,
        itemHeight,
        displayName,
        'tiny',     // Use tiny font instead of vga
        1,
        '#ffffff', // Default white
        'center'
      );
      
      uiSystem.addElement(menuItem);
      this.menuItems.push(menuItem);
      
      // Move down for the next item
      itemY += itemHeight + itemSpacing;
    }
    
    // Initially highlight the first item
    if (this.menuItems.length > 0) {
      this.selectedItemIndex = 0;
      this.updateMenuItemHighlights();
    }
  }
  
  /**
   * Format constraint type name for display
   */
  private formatConstraintTypeName(constraintType: ConstraintType): string {
    // Convert from camelCase to display format
    // e.g., "TRACK_TO" -> "Track To"
    const words = constraintType.split('_');
    return words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Dispose of scene objects to prevent memory leaks
   */
  private disposeSceneObjects(scene: THREE.Scene): void {
    scene.traverse((object) => {
      // Dispose of geometries
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        // Dispose of materials
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(object.material);
          }
        }
      }
    });
  }
  
  /**
   * Dispose of a material and its textures
   */
  private disposeMaterial(material: THREE.Material): void {
    // Dispose of textures
    if (material instanceof THREE.MeshBasicMaterial) {
      if (material.map) material.map.dispose();
      if (material.aoMap) material.aoMap.dispose();
    } else if (material instanceof THREE.MeshStandardMaterial) {
      if (material.map) material.map.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
    }
    
    // Dispose the material itself
    material.dispose();
  }
} 