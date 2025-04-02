import { BaseComponent } from '../Component';

/**
 * 3D Vector
 */
export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}
  
  /**
   * Clone this vector
   */
  public clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }
  
  /**
   * Copy values from another vector
   */
  public copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  
  /**
   * Set the values of this vector
   */
  public set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  
  /**
   * Add another vector to this one
   */
  public add(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  
  /**
   * Subtract another vector from this one
   */
  public subtract(v: Vector3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  
  /**
   * Multiply this vector by a scalar
   */
  public multiplyScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }
  
  /**
   * Multiply this vector component-wise by another vector
   */
  public multiply(v: Vector3): this {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }
  
  /**
   * Calculate the dot product with another vector
   */
  public dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  
  /**
   * Calculate the cross product with another vector
   */
  public cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }
  
  /**
   * Calculate the length (magnitude) of this vector
   */
  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  
  /**
   * Normalize this vector (set its length to 1)
   */
  public normalize(): this {
    const length = this.length();
    if (length > 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
    }
    return this;
  }
}

/**
 * Rotation as Euler angles (in degrees)
 */
export class Rotation {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}
  
  /**
   * Clone this rotation
   */
  public clone(): Rotation {
    return new Rotation(this.x, this.y, this.z);
  }
  
  /**
   * Copy values from another rotation
   */
  public copy(r: Rotation): this {
    this.x = r.x;
    this.y = r.y;
    this.z = r.z;
    return this;
  }
  
  /**
   * Set the values of this rotation
   */
  public set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  
  /**
   * Add another rotation to this one
   */
  public add(r: Rotation): this {
    this.x += r.x;
    this.y += r.y;
    this.z += r.z;
    return this;
  }
  
  /**
   * Subtract another rotation from this one
   */
  public subtract(r: Rotation): this {
    this.x -= r.x;
    this.y -= r.y;
    this.z -= r.z;
    return this;
  }
  
  /**
   * Normalize rotation values to -180 to 180 range
   */
  public normalize(): this {
    this.x = Rotation.normalizeAngle(this.x);
    this.y = Rotation.normalizeAngle(this.y);
    this.z = Rotation.normalizeAngle(this.z);
    return this;
  }
  
  /**
   * Convert this rotation to radians
   */
  public toRadians(): { x: number, y: number, z: number } {
    const toRad = (deg: number) => deg * (Math.PI / 180);
    return {
      x: toRad(this.x),
      y: toRad(this.y),
      z: toRad(this.z)
    };
  }
  
  /**
   * Normalize an angle to -180 to 180 range
   * @param angle The angle in degrees
   * @returns The normalized angle in -180 to 180 range
   */
  public static normalizeAngle(angle: number): number {
    angle = angle % 360;
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    return angle;
  }
}

/**
 * Transform component
 * Represents the position, rotation, and scale of an entity
 */
export class Transform extends BaseComponent {
  /**
   * Position in 3D space
   */
  public position: Vector3 = new Vector3();
  
  /**
   * Rotation in degrees (Euler angles)
   */
  public rotation: Rotation = new Rotation();
  
  /**
   * Scale in 3D space
   */
  public scale: Vector3 = new Vector3(1, 1, 1);
  
  /**
   * Direction vectors (calculated when needed)
   */
  private _forward: Vector3 | null = null;
  private _right: Vector3 | null = null;
  private _up: Vector3 | null = null;
  
  /**
   * Constructor
   * @param x X position
   * @param y Y position
   * @param z Z position
   */
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    super();
    this.position.set(x, y, z);
  }
  
  /**
   * Translate the transform in world space or by the given direction
   * @param amount The amount to translate by (x, y, z) or an array [x, y, z]
   * @param direction Optional direction to translate along, uses world axes if not provided
   * @returns This transform for chaining
   */
  public translate(amount: Vector3 | [number, number, number], direction?: Vector3): this {
    // Convert array to Vector3 if needed
    const translationAmount = Array.isArray(amount) 
      ? new Vector3(amount[0], amount[1], amount[2]) 
      : amount;
      
    if (direction) {
      // Translate along the provided direction
      this.position.x += direction.x * translationAmount.x;
      this.position.y += direction.y * translationAmount.y;
      this.position.z += direction.z * translationAmount.z;
    } else {
      // Translate in world space
      this.position.add(translationAmount);
    }
    return this;
  }
  
  /**
   * Translate the transform along its local forward axis
   * @param distance The distance to move or an array with one value [distance]
   * @returns This transform for chaining
   */
  public moveForward(distance: number | [number]): this {
    const moveDistance = Array.isArray(distance) ? distance[0] : distance;
    const forward = this.getForward();
    this.position.x += forward.x * moveDistance;
    this.position.y += forward.y * moveDistance;
    this.position.z += forward.z * moveDistance;
    return this;
  }
  
  /**
   * Translate the transform along its local right axis
   * @param distance The distance to move or an array with one value [distance]
   * @returns This transform for chaining
   */
  public moveRight(distance: number | [number]): this {
    const moveDistance = Array.isArray(distance) ? distance[0] : distance;
    const right = this.getRight();
    this.position.x += right.x * moveDistance;
    this.position.y += right.y * moveDistance;
    this.position.z += right.z * moveDistance;
    return this;
  }
  
  /**
   * Translate the transform along its local up axis
   * @param distance The distance to move or an array with one value [distance]
   * @returns This transform for chaining
   */
  public moveUp(distance: number | [number]): this {
    const moveDistance = Array.isArray(distance) ? distance[0] : distance;
    const up = this.getUp();
    this.position.x += up.x * moveDistance;
    this.position.y += up.y * moveDistance;
    this.position.z += up.z * moveDistance;
    return this;
  }
  
  /**
   * Rotate the transform by the given angles
   * @param rotation The rotation to apply (x, y, z) in degrees or an array [x, y, z]
   * @param local Whether to rotate in local space (true) or world space (false)
   * @returns This transform for chaining
   */
  public rotate(rotation: Rotation | [number, number, number], local: boolean = true): this {
    // Convert array to Rotation if needed
    const rotationAmount = Array.isArray(rotation)
      ? new Rotation(rotation[0], rotation[1], rotation[2])
      : rotation;
      
    // Invalidate cached direction vectors
    this._forward = null;
    this._right = null;
    this._up = null;
    
    if (local) {
      // Apply rotation in local space (order matters)
      // Apply in Z, X, Y order (typical for Euler angles)
      
      // Apply rotation around local Z axis
      if (rotationAmount.z !== 0) {
        this.rotation.z += rotationAmount.z;
      }
      
      // Apply rotation around local X axis
      if (rotationAmount.x !== 0) {
        this.rotation.x += rotationAmount.x;
      }
      
      // Apply rotation around local Y axis
      if (rotationAmount.y !== 0) {
        this.rotation.y += rotationAmount.y;
      }
    } else {
      // Simple addition for world space rotation
      this.rotation.add(rotationAmount);
    }
    
    // Normalize rotation values to -180 to 180 range
    this.rotation.normalize();
    
    return this;
  }
  
  /**
   * Scale the transform
   * @param scale The scale to apply (x, y, z) or an array [x, y, z]
   * @param local Whether to scale relative to current scale (true) or set absolute (false)
   * @returns This transform for chaining
   */
  public scaleBy(scale: Vector3 | [number, number, number], local: boolean = true): this {
    // Convert array to Vector3 if needed
    const scaleAmount = Array.isArray(scale)
      ? new Vector3(scale[0], scale[1], scale[2])
      : scale;
      
    if (local) {
      // Multiply current scale
      this.scale.x *= scaleAmount.x;
      this.scale.y *= scaleAmount.y;
      this.scale.z *= scaleAmount.z;
    } else {
      // Set absolute scale
      this.scale.x = scaleAmount.x;
      this.scale.y = scaleAmount.y;
      this.scale.z = scaleAmount.z;
    }
    return this;
  }
  
  /**
   * Uniform scale on all axes
   * @param factor The scale factor to apply or an array with one value [factor]
   * @returns This transform for chaining
   */
  public scaleUniform(factor: number | [number]): this {
    const scaleValue = Array.isArray(factor) ? factor[0] : factor;
    this.scale.multiplyScalar(scaleValue);
    return this;
  }
  
  /**
   * Get the forward direction vector
   * @returns A normalized vector pointing in the forward direction
   */
  public getForward(): Vector3 {
    if (!this._forward) {
      this._forward = this.calculateForward();
    }
    return this._forward.clone();
  }
  
  /**
   * Get the right direction vector
   * @returns A normalized vector pointing in the right direction
   */
  public getRight(): Vector3 {
    if (!this._right) {
      this._right = this.calculateRight();
    }
    return this._right.clone();
  }
  
  /**
   * Get the up direction vector
   * @returns A normalized vector pointing in the up direction
   */
  public getUp(): Vector3 {
    if (!this._up) {
      this._up = this.calculateUp();
    }
    return this._up.clone();
  }
  
  /**
   * Calculate the forward direction vector based on current rotation
   * @returns A normalized vector pointing in the forward direction
   */
  private calculateForward(): Vector3 {
    // Convert rotation to radians
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const xRad = toRad(this.rotation.x);
    const yRad = toRad(this.rotation.y);
    
    // Calculate direction vector (negative Z is forward in standard coordinate systems)
    return new Vector3(
      Math.sin(yRad), 
      -Math.sin(xRad) * Math.cos(yRad),
      -Math.cos(xRad) * Math.cos(yRad)
    ).normalize();
  }
  
  /**
   * Calculate the right direction vector based on current rotation
   * @returns A normalized vector pointing in the right direction
   */
  private calculateRight(): Vector3 {
    // Convert rotation to radians
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const yRad = toRad(this.rotation.y);
    
    // Calculate right vector (cross product of world up and forward)
    return new Vector3(
      Math.cos(yRad),
      0,
      -Math.sin(yRad)
    ).normalize();
  }
  
  /**
   * Calculate the up direction vector based on current rotation
   * @returns A normalized vector pointing in the up direction
   */
  private calculateUp(): Vector3 {
    // Cross product of forward and right
    const forward = this.getForward();
    const right = this.getRight();
    
    return forward.cross(right).normalize();
  }
  
  /**
   * Serialize this component
   */
  public override serialize(): unknown {
    return {
      position: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      },
      rotation: {
        x: this.rotation.x,
        y: this.rotation.y,
        z: this.rotation.z
      },
      scale: {
        x: this.scale.x,
        y: this.scale.y,
        z: this.scale.z
      }
    };
  }
  
  /**
   * Deserialize this component
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    if (typeof data !== 'object' || data === null) return;
    
    const transformData = data as Record<string, any>;
    
    // Deserialize position
    if (transformData.position) {
      const pos = transformData.position;
      if (typeof pos.x === 'number') this.position.x = pos.x;
      if (typeof pos.y === 'number') this.position.y = pos.y;
      if (typeof pos.z === 'number') this.position.z = pos.z;
    }
    
    // Deserialize rotation
    if (transformData.rotation) {
      const rot = transformData.rotation;
      if (typeof rot.x === 'number') this.rotation.x = rot.x;
      if (typeof rot.y === 'number') this.rotation.y = rot.y;
      if (typeof rot.z === 'number') this.rotation.z = rot.z;
    }
    
    // Deserialize scale
    if (transformData.scale) {
      const scale = transformData.scale;
      if (typeof scale.x === 'number') this.scale.x = scale.x;
      if (typeof scale.y === 'number') this.scale.y = scale.y;
      if (typeof scale.z === 'number') this.scale.z = scale.z;
    }
    
    // Invalidate cached vectors after deserialization
    this._forward = null;
    this._right = null;
    this._up = null;
  }
} 