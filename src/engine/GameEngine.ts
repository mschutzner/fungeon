import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Player } from './Player';
import { Room } from './Room';
import { Chest } from './Chest';
import { GameCamera } from './GameCamera';
import { GameConfig } from './GameConfig';

export interface GameState {
    playerPosition: THREE.Vector3;
    cameraAngle: number;
}

interface WallConfig {
    position: [number, number, number];
    rotation: [number, number, number];
}

export class GameEngine {
    private scene: THREE.Scene;
    private gameCamera: GameCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    private inputManager: InputManager;
    private player: Player;
    private room: Room;
    private chest: Chest;
    private lastTick: number = 0;
    private readonly TICK_RATE: number = 100; // ms
    private readonly config: GameConfig;
    private light: THREE.PointLight;
    private readonly FLICKER_SPEED: number = 8; // Base speed of flicker
    private readonly FLICKER_AMOUNT: number = 0.05; // How much to flicker (±10% of base intensity)
    private readonly BASE_LIGHT_INTENSITY: number = 1.5;

    constructor() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.inputManager = InputManager.getInstance();
        this.config = GameConfig.getInstance();
        
        // Setup camera
        this.gameCamera = new GameCamera(6);
        
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setClearColor(this.config.getColors().BACKGROUND);
        const resolution = this.config.getResolution();
        this.renderer.setSize(resolution.width, resolution.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        
        // Setup canvas container and styling
        const container = document.createElement('div');
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.backgroundColor = '#000';
        
        const canvas = this.renderer.domElement;
        canvas.style.width = 'min(100vw, 100vh)';
        canvas.style.height = 'min(100vw, 100vh)';
        canvas.style.imageRendering = 'pixelated';
        
        container.appendChild(canvas);
        document.body.appendChild(container);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add point light with shadows
        this.light = new THREE.PointLight(0xffffff, this.BASE_LIGHT_INTENSITY);
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 256;  // Reduced for sharper pixels
        this.light.shadow.mapSize.height = 256; // Reduced for sharper pixels
        this.light.shadow.camera.near = 0.1;
        this.light.shadow.camera.far = 20;
        this.light.shadow.bias = -0.002;        // Adjusted for hard shadows
        this.light.shadow.radius = 0;           // No blur radius for sharp shadows
        
        // Position light at origin
        const lightPos = new THREE.Vector3(0, 3.5, 0);
        this.light.position.copy(lightPos);
        this.scene.add(this.light);

        // Create game objects
        this.player = new Player(this);
        this.room = new Room(this);
        
        // Create chest and position it in the room
        const chestPosition = new THREE.Vector3(1.5, 0, 1.5); // Offset from center
        this.chest = new Chest(this, chestPosition);

        // Add objects to scene
        this.scene.add(this.player.getMesh());
        this.scene.add(this.room.getMesh());
        this.scene.add(this.chest.getMesh());
    }

    public createPaletteMaterial(diffuseColor: THREE.Color, objectPalette: number[]): THREE.Material {
        // Convert hex colors to THREE.Color array and flatten for uniform
        const paletteColors = objectPalette.map(hex => new THREE.Color(hex));
        const paletteArray = new Float32Array(paletteColors.flatMap(color => [color.r, color.g, color.b]));
        
        // Create shader material that uses THREE.js lighting and applies palette dithering
        const material = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib.lights,
                {
                    diffuse: { value: diffuseColor },
                    palette: { value: paletteArray },
                    paletteSize: { value: objectPalette.length }
                }
            ]),
            vertexShader: `
                #include <common>
                #include <shadowmap_pars_vertex>
                #include <lights_pars_begin>
                
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec4 vWorldPosition;
                
                void main() {
                    vUv = uv;
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPos;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    vNormal = normalMatrix * normal;
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Handle shadow mapping
                    #ifdef USE_SHADOWMAP
                    #if NUM_POINT_LIGHT_SHADOWS > 0
                    vPointShadowCoord[0] = pointShadowMatrix[0] * worldPos;
                    #endif
                    #endif
                }
            `,
            fragmentShader: `
                #include <common>
                #include <packing>
                #include <lights_pars_begin>
                #include <shadowmap_pars_fragment>
                #include <shadowmask_pars_fragment>
                
                uniform vec3 diffuse;
                uniform float palette[96]; // 32 colors * 3 components
                uniform int paletteSize;
                
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                varying vec4 vWorldPosition;
                
                vec3 getPaletteColor(int index) {
                    return vec3(
                        palette[index * 3],
                        palette[index * 3 + 1],
                        palette[index * 3 + 2]
                    );
                }
                
                // Get the threshold using a 4x4 Bayer matrix for dithering
                float getBayerThreshold(vec2 position) {
                    const float bayerMatrix[16] = float[16](
                        0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
                        12.0/16.0, 4.0/16.0, 14.0/16.0,  6.0/16.0,
                        3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
                        15.0/16.0, 7.0/16.0, 13.0/16.0,  5.0/16.0
                    );
                    
                    int x = int(mod(position.x, 4.0));
                    int y = int(mod(position.y, 4.0));
                    return bayerMatrix[y * 4 + x];
                }
                
                float colorDistance(vec3 color1, vec3 color2) {
                    float dr = (color1.r - color2.r);
                    float dg = (color1.g - color2.g);
                    float db = (color1.b - color2.b);
                    return sqrt(dr*dr*0.3 + dg*dg*0.59 + db*db*0.11);
                }
                
                float getBrightness(vec3 color) {
                    return dot(color, vec3(0.299, 0.587, 0.114));
                }
                
                vec3 findClosestColor(vec3 targetColor) {
                    vec3 closestColor = getPaletteColor(0);
                    float minDist = colorDistance(targetColor, closestColor);
                    
                    for(int i = 1; i < 32; i++) {
                        if(i >= paletteSize) break;
                        vec3 currentColor = getPaletteColor(i);
                        float dist = colorDistance(targetColor, currentColor);
                        if(dist < minDist) {
                            closestColor = currentColor;
                            minDist = dist;
                        }
                    }
                    return closestColor;
                }
                
                void findBestDitherPair(vec3 targetColor, out vec3 color1, out vec3 color2, out float mixRatio) {
                    // Find closest color first
                    color1 = getPaletteColor(0);
                    float minDist = colorDistance(targetColor, color1);
                    
                    for(int i = 1; i < 32; i++) {
                        if(i >= paletteSize) break;
                        vec3 currentColor = getPaletteColor(i);
                        float dist = colorDistance(targetColor, currentColor);
                        if(dist < minDist) {
                            color1 = currentColor;
                            minDist = dist;
                        }
                    }
                    
                    // Get brightness of target and closest color
                    float targetBrightness = getBrightness(targetColor);
                    float closestBrightness = getBrightness(color1);
                    
                    // Determine if we need a brighter or darker second color
                    bool needBrighter = targetBrightness > closestBrightness;
                    
                    // Find the closest color in the right brightness direction
                    color2 = color1;
                    float minDist2 = 1000.0;
                    bool foundSecondColor = false;
                    
                    for(int i = 0; i < 32; i++) {
                        if(i >= paletteSize) break;
                        vec3 currentColor = getPaletteColor(i);
                        float currentBrightness = getBrightness(currentColor);
                        
                        // Check if color is in the right direction
                        bool isRightDirection = needBrighter ? 
                            (currentBrightness > closestBrightness) : 
                            (currentBrightness < closestBrightness);
                        
                        if(isRightDirection) {
                            float dist = colorDistance(targetColor, currentColor);
                            if(dist < minDist2) {
                                color2 = currentColor;
                                minDist2 = dist;
                                foundSecondColor = true;
                            }
                        }
                    }
                    
                    // If we found a second color, calculate mix ratio
                    if(foundSecondColor) {
                        float color1Brightness = getBrightness(color1);
                        float color2Brightness = getBrightness(color2);
                        mixRatio = (targetBrightness - color1Brightness) / (color2Brightness - color1Brightness);
                        mixRatio = clamp(mixRatio, 0.0, 1.0);
                    } else {
                        // No appropriate second color found, don't dither
                        color2 = color1;
                        mixRatio = 0.0;
                    }
                }
                
                void main() {
                    vec3 normal = normalize(vNormal);
                    vec3 litColor = vec3(0.0);
                    
                    // Calculate shadow using THREE.js built-in functions
                    float shadow = 1.0;
                    
                    #ifdef USE_SHADOWMAP
                    #if NUM_POINT_LIGHT_SHADOWS > 0
                    shadow = getPointShadow(pointShadowMap[0], pointLightShadows[0].shadowMapSize, pointLightShadows[0].shadowBias, pointLightShadows[0].shadowRadius, vPointShadowCoord[0], pointLightShadows[0].shadowCameraNear, pointLightShadows[0].shadowCameraFar);
                    #endif
                    #endif
                    
                    // Calculate lighting using THREE.js light uniforms
                    #if NUM_DIR_LIGHTS > 0
                    DirectionalLight directionalLight;
                    vec3 directionalDiffuse;
                    for(int i = 0; i < NUM_DIR_LIGHTS; i++) {
                        directionalLight = directionalLights[i];
                        float dirDiff = max(dot(normal, directionalLight.direction), 0.0);
                        directionalDiffuse = directionalLight.color * dirDiff;
                        litColor += directionalDiffuse;
                    }
                    #endif

                    #if NUM_POINT_LIGHTS > 0
                    PointLight pointLight;
                    vec3 pointDiffuse;
                    for(int i = 0; i < NUM_POINT_LIGHTS; i++) {
                        pointLight = pointLights[i];
                        vec3 lightDir = normalize(pointLight.position - (-vViewPosition));
                        float dist = length(pointLight.position - (-vViewPosition));
                        float attenuation = 1.0 / (1.0 + 0.05 * dist * dist);
                        float diff = max(dot(normal, lightDir), 0.0);
                        pointDiffuse = pointLight.color * diff * attenuation;
                        litColor += pointDiffuse * shadow;
                    }
                    #endif

                    // Add ambient light
                    litColor += ambientLightColor;
                    
                    // Apply diffuse color (allow overbright)
                    litColor *= diffuse;
                    
                    // Allow overbright but prevent extreme values
                    litColor = clamp(litColor, 0.0, 2.0);
                    
                    // Get screen position for dithering
                    vec2 screenPos = gl_FragCoord.xy;
                    
                    // Find closest palette color
                    vec3 closestColor = findClosestColor(litColor);
                    
                    // Check if we need dithering
                    const float DITHER_THRESHOLD = 0.0175;
                    float closestDist = colorDistance(litColor, closestColor);
                    
                    vec3 finalColor;
                    if(closestDist <= DITHER_THRESHOLD) {
                        finalColor = closestColor;
                    } else {
                        vec3 color1, color2;
                        float mixRatio;
                        findBestDitherPair(litColor, color1, color2, mixRatio);
                        
                        if(mixRatio > 0.0) {
                            float threshold = getBayerThreshold(screenPos);
                            finalColor = (threshold > mixRatio) ? color1 : color2;
                        } else {
                            finalColor = color1;
                        }
                    }
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            lights: true,
            transparent: false,
            shadowSide: THREE.FrontSide,
            toneMapped: false
        });
        
        return material;
    }
    
    // Helper to calculate color distance in RGB space
    private colorDistance(color1: THREE.Color, color2: THREE.Color): number {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    public getCameraAngle(): number {
        return this.gameCamera.getAngle();
    }

    public getColors(): { [key: string]: THREE.Color } {
        return this.config.getColors();
    }

    public getChest(): Chest {
        return this.chest;
    }

    private update(): void {
        const currentTime = this.clock.getElapsedTime() * 1000;
        const deltaTime = currentTime - this.lastTick;
        
        // Add subtle flicker to the point light
        const time = this.clock.getElapsedTime();
        const flicker = Math.sin(time * this.FLICKER_SPEED) * 0.3 +
                       Math.sin(time * this.FLICKER_SPEED * 2.7) * 0.2 +
                       Math.sin(time * this.FLICKER_SPEED * 4.1) * 0.1;
        this.light.intensity = this.BASE_LIGHT_INTENSITY + (flicker * this.FLICKER_AMOUNT);
        
        // Check if it's time for a game tick
        if (deltaTime >= this.TICK_RATE) {
            // Update game objects
            this.player.update(deltaTime);
            this.room.update(deltaTime);
            this.chest.update(deltaTime);
            this.gameCamera.update(deltaTime);
            
            // Update camera target to follow player
            this.gameCamera.setTarget(this.player.getPosition());
            
            // Update input state
            this.inputManager.update();
            
            this.lastTick = currentTime;
        }

        this.renderer.render(this.scene, this.gameCamera.getCamera());
        requestAnimationFrame(() => this.update());
    }

    public start(): void {
        this.update();
    }
} 