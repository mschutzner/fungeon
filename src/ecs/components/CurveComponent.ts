import * as THREE from 'three';
import { BaseComponent } from '../Component';
import { ComponentClass, IEntity } from '../types';
import { ThreeObject } from './ThreeObject';

/**
 * Component that creates and manages a chain of continuous CubicBezierCurve3 curves
 * Each curve in the chain shares control points with adjacent curves to ensure continuity
 */
export class CurveComponent extends BaseComponent {
  /**
   * The Three.js curve object representing the chain of cubic bezier curves
   */
  private curve: THREE.CurvePath<THREE.Vector3> | null = null;
  
  /**
   * The line representing the curve
   */
  private line: THREE.Line | null = null;
  
  /**
   * Points defining the curve chain
   * For n curve segments, we need n+1 points plus 2*(n-1) control points
   * For a single curve (n=1), we need 2 points (start, end) and 2 control points
   * For continuous chains, control points are shared between segments
   */
  private points: THREE.Vector3[] = [];
  
  /**
   * Control points for the curve
   * For each segment, we need 2 control points
   * For continuous chains, the second control point of one segment
   * and the first control point of the next segment are calculated
   * to ensure continuity
   */
  private controlPoints: THREE.Vector3[] = [];
  
  /**
   * Color of the curve line
   */
  public color: number = 0x00ffff;
  
  /**
   * Number of points to sample along each curve segment for rendering
   */
  public curveResolution: number = 12;

  /**
   * Whether to show the path line
   */
  public showPath: boolean = true;

  /**
   * Whether to show control points
   */
  public showControlPoints: boolean = false;

  /**
   * Control point helpers
   */
  private controlPointHelpers: THREE.Mesh[] = [];

  /**
   * Constructor
   * @param points Initial points defining the curve
   * @param controlPoints Initial control points (optional)
   * @param color Color of the curve line
   * @param showPath Whether to show the path line
   */
  constructor(
    points: THREE.Vector3[] = [],
    controlPoints: THREE.Vector3[] = [],
    color: number = 0x00ffff,
    showPath: boolean = true
  ) {
    super();
    this.points = points.map(p => p.clone());
    this.controlPoints = controlPoints.map(p => p.clone());
    this.color = color;
    this.showPath = showPath;
    
    // Calculate control points if not provided
    if (this.points.length > 1 && this.controlPoints.length === 0) {
      this.calculateDefaultControlPoints();
    }
  }
  
  /**
   * Define component dependencies
   */
  public static override getRequirements(): ComponentClass[] {
    return [ThreeObject];
  }
  
  /**
   * Called when the component is added to an entity
   * @param entity The entity this component was added to
   */
  public override onAttach(entity: IEntity): void {
    this.createCurve();
    this.createLine();
    
    // Check if the entity has a ThreeObject component
    if (entity.hasComponent(ThreeObject)) {
      // Get the ThreeObject and add our line to it
      const threeObject = entity.getComponent(ThreeObject)!;
      if (this.line && this.showPath) {
        threeObject.object.add(this.line);
        
        // Add control point helpers if enabled
        if (this.showControlPoints) {
          this.createControlPointHelpers();
          this.controlPointHelpers.forEach(helper => {
            threeObject.object.add(helper);
          });
        }
      }
    } else {
      // Auto-add ThreeObject component
      const threeObject = new ThreeObject(new THREE.Vector3(0, 0, 0));
      if (this.line && this.showPath) {
        threeObject.object.add(this.line);
        
        // Add control point helpers if enabled
        if (this.showControlPoints) {
          this.createControlPointHelpers();
          this.controlPointHelpers.forEach(helper => {
            threeObject.object.add(helper);
          });
        }
      }
      entity.addComponent(threeObject);
    }
  }
  
  /**
   * Called when the component is removed from an entity
   * @param entity The entity this component was removed from
   */
  public override onDetach(entity: IEntity): void {
    this.dispose();
  }
  
  /**
   * Set points defining the curve
   * @param points New points defining the curve
   * @param calculateControlPoints Whether to automatically calculate control points
   */
  public setPoints(points: THREE.Vector3[], calculateControlPoints: boolean = true): void {
    this.points = points.map(p => p.clone());
    
    if (calculateControlPoints) {
      this.calculateDefaultControlPoints();
    }
    
    this.updateCurve();
  }
  
  /**
   * Add a point to the curve
   * @param point The point to add
   * @param updateControlPoints Whether to update control points
   */
  public addPoint(point: THREE.Vector3, updateControlPoints: boolean = true): void {
    this.points.push(point.clone());
    
    if (updateControlPoints) {
      this.calculateDefaultControlPoints();
    }
    
    this.updateCurve();
  }
  
  /**
   * Set control points for the curve
   * @param controlPoints New control points
   */
  public setControlPoints(controlPoints: THREE.Vector3[]): void {
    this.controlPoints = controlPoints.map(p => p.clone());
    this.updateCurve();
  }
  
  /**
   * Set whether to show the path line
   * @param show Whether to show the path
   */
  public setShowPath(show: boolean): void {
    if (this.showPath === show) return;
    
    this.showPath = show;
    
    // If attached to an entity, update the path visibility
    if (this.entity?.hasComponent(ThreeObject)) {
      const threeObject = this.entity.getComponent(ThreeObject)!;
      
      if (this.line) {
        if (show) {
          threeObject.object.add(this.line);
        } else {
          threeObject.object.remove(this.line);
        }
      }
    }
  }
  
  /**
   * Toggle visibility of control point helpers
   * @param show Whether to show control points
   */
  public setShowControlPoints(show: boolean): void {
    this.showControlPoints = show;
    
    // If attached to an entity, update the helpers
    if (this.entity?.hasComponent(ThreeObject)) {
      const threeObject = this.entity.getComponent(ThreeObject)!;
      
      // Remove existing helpers
      this.controlPointHelpers.forEach(helper => {
        threeObject.object.remove(helper);
      });
      this.controlPointHelpers = [];
      
      // Create new helpers if needed
      if (show) {
        this.createControlPointHelpers();
        this.controlPointHelpers.forEach(helper => {
          threeObject.object.add(helper);
        });
      }
    }
  }

  /**
   * Calculate default control points for a smooth curve
   * This uses a simple algorithm to create continuous cubic bezier curves
   */
  private calculateDefaultControlPoints(): void {
    const numPoints = this.points.length;
    
    // We need at least 2 points to create a curve
    if (numPoints < 2) {
      this.controlPoints = [];
      return;
    }
    
    // For n points (n-1 curve segments), we need 2*(n-1) control points
    this.controlPoints = [];
    
    // For each segment (between point i and i+1)
    for (let i = 0; i < numPoints - 1; i++) {
      const p0 = this.points[i];
      const p3 = this.points[i + 1];
      
      // Calculate the distance between points
      const distance = p0.distanceTo(p3);
      
      // Create control points at 1/3 and 2/3 of the distance along the segment
      // This is a simple way to ensure smooth curves
      const direction = new THREE.Vector3().subVectors(p3, p0).normalize();
      
      // First control point
      const p1 = new THREE.Vector3().copy(p0).addScaledVector(direction, distance / 3);
      
      // Second control point
      const p2 = new THREE.Vector3().copy(p0).addScaledVector(direction, distance * 2 / 3);
      
      this.controlPoints.push(p1, p2);
    }
  }
  
  /**
   * Create the composite curve from points and control points
   */
  private createCurve(): void {
    this.curve = new THREE.CurvePath<THREE.Vector3>();
    
    const numPoints = this.points.length;
    
    // We need at least 2 points and enough control points to create a curve
    if (numPoints < 2 || this.controlPoints.length < 2 * (numPoints - 1)) {
      return;
    }
    
    // For each segment (between point i and i+1)
    for (let i = 0; i < numPoints - 1; i++) {
      const p0 = this.points[i];
      const p3 = this.points[i + 1];
      const p1 = this.controlPoints[i * 2];
      const p2 = this.controlPoints[i * 2 + 1];
      
      // Create a cubic bezier curve for this segment
      const bezierCurve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
      
      // Add it to the curve path
      this.curve.add(bezierCurve);
    }
  }
  
  /**
   * Create a line representing the curve
   */
  private createLine(): void {
    // If we don't have a valid curve, don't create a line
    if (!this.curve) {
      return;
    }
    
    // Sample points along the curve
    const points = this.curve.getPoints(this.curveResolution * (this.points.length - 1));
    
    // Create a line geometry from these points
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Create a material for the line
    const material = new THREE.LineBasicMaterial({ color: this.color });
    
    // Create the line
    this.line = new THREE.Line(geometry, material);
  }
  
  /**
   * Create small spheres to visualize control points
   */
  private createControlPointHelpers(): void {
    // Clear existing helpers
    this.controlPointHelpers = [];
    
    // Create a small sphere for each control point
    const geometry = new THREE.SphereGeometry(0.05);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    this.controlPoints.forEach(point => {
      const helper = new THREE.Mesh(geometry, material);
      helper.position.copy(point);
      this.controlPointHelpers.push(helper);
    });
  }
  
  /**
   * Update the curve and line after changing points or control points
   */
  private updateCurve(): void {
    // Re-create the curve and line
    this.createCurve();
    
    // If we have a line and the entity is attached to a ThreeObject
    if (this.entity?.hasComponent(ThreeObject)) {
      const threeObject = this.entity.getComponent(ThreeObject)!;
      
      // Remove the old line
      if (this.line) {
        threeObject.object.remove(this.line);
        this.line.geometry.dispose();
        (this.line.material as THREE.Material).dispose();
      }
      
      // Create a new line
      this.createLine();
      
      // Add the new line if showPath is true
      if (this.line && this.showPath) {
        threeObject.object.add(this.line);
      }
      
      // Update control point helpers if they're visible
      if (this.showControlPoints) {
        // Remove old helpers
        this.controlPointHelpers.forEach(helper => {
          threeObject.object.remove(helper);
        });
        
        // Create new helpers
        this.createControlPointHelpers();
        
        // Add new helpers
        this.controlPointHelpers.forEach(helper => {
          threeObject.object.add(helper);
        });
      }
    }
  }
  
  /**
   * Get the curve object
   */
  public getCurve(): THREE.CurvePath<THREE.Vector3> | null {
    return this.curve;
  }

  /**
   * Get a point along the curve
   * @param t Parameter from 0 to 1 representing position along the curve
   */
  public getPointAt(t: number): THREE.Vector3 | null {
    if (!this.curve) {
      return null;
    }
    
    return this.curve.getPointAt(t);
  }

  /**
   * Get the total length of the curve
   */
  public getLength(): number {
    if (!this.curve) {
      return 0;
    }
    
    return this.curve.getLength();
  }
  
  /**
   * Clean up resources
   */
  private dispose(): void {
    if (this.line) {
      this.line.geometry.dispose();
      (this.line.material as THREE.Material).dispose();
      this.line = null;
    }
    
    // Dispose control point helpers
    this.controlPointHelpers.forEach(helper => {
      helper.geometry.dispose();
      (helper.material as THREE.Material).dispose();
    });
    this.controlPointHelpers = [];
  }
  
  /**
   * Serialize this component to a plain object
   */
  public override serialize(): unknown {
    const pointsData = this.points.map(p => ({ x: p.x, y: p.y, z: p.z }));
    const controlPointsData = this.controlPoints.map(p => ({ x: p.x, y: p.y, z: p.z }));
    
    return {
      points: pointsData,
      controlPoints: controlPointsData,
      color: this.color,
      curveResolution: this.curveResolution,
      showPath: this.showPath,
      showControlPoints: this.showControlPoints
    };
  }
  
  /**
   * Deserialize this component from a plain object
   * @param data The data to deserialize from
   */
  public override deserialize(data: unknown): void {
    const curveData = data as any;
    
    if (curveData.points && Array.isArray(curveData.points)) {
      this.points = curveData.points.map((p: any) => 
        new THREE.Vector3(p.x, p.y, p.z)
      );
    }
    
    if (curveData.controlPoints && Array.isArray(curveData.controlPoints)) {
      this.controlPoints = curveData.controlPoints.map((p: any) => 
        new THREE.Vector3(p.x, p.y, p.z)
      );
    }
    
    if (typeof curveData.color === 'number') {
      this.color = curveData.color;
    }
    
    if (typeof curveData.curveResolution === 'number') {
      this.curveResolution = curveData.curveResolution;
    }
    
    if (typeof curveData.showPath === 'boolean') {
      this.showPath = curveData.showPath;
    }
    
    if (typeof curveData.showControlPoints === 'boolean') {
      this.showControlPoints = curveData.showControlPoints;
    }
    
    // Recreate the curve and line
    this.createCurve();
    this.createLine();
  }
} 