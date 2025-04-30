'use client';

import type { FC } from 'react';
import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateTonnetzData, type TonnetzNode, type TonnetzEdge } from '@/lib/tonnetz-generator';
import type { IntonationLimit } from '@/types';

interface TonnetzVisualizerProps {
  limit: IntonationLimit;
}

const TonnetzVisualizer: FC<TonnetzVisualizerProps> = ({ limit }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const tonnetzGroupRef = useRef<THREE.Group | null>(null);

  const { nodes, edges } = useMemo(() => generateTonnetzData(limit), [limit]);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // Scene setup
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0x222831); // Dark blue background

    // Camera setup
    cameraRef.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current.position.z = 15;

    // Renderer setup
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(width, height);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(rendererRef.current.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Light gray ambient light
    sceneRef.current.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(10, 10, 10);
    sceneRef.current.add(pointLight);

    // Orbit Controls
    controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.1;
    controlsRef.current.rotateSpeed = 0.5;
    controlsRef.current.zoomSpeed = 0.8;
    controlsRef.current.panSpeed = 0.5;


    // Handle resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && currentMount) {
        const newWidth = currentMount.clientWidth;
        const newHeight = currentMount.clientHeight;
        rendererRef.current.setSize(newWidth, newHeight);
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controlsRef.current?.update(); // required if enableDamping is set to true
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
    };
    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      controlsRef.current?.dispose();
      rendererRef.current?.dispose();
      if (currentMount && rendererRef.current) {
         // Check if the renderer's DOM element is still a child before removing
         if (currentMount.contains(rendererRef.current.domElement)) {
             currentMount.removeChild(rendererRef.current.domElement);
         }
      }
      // Dispose geometries and materials if necessary
      tonnetzGroupRef.current?.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          // Dispose material(s)
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        } else if (object instanceof THREE.Line) {
           object.geometry.dispose();
           if (Array.isArray(object.material)) {
             object.material.forEach(material => material.dispose());
           } else {
             object.material.dispose();
           }
        }
      });
       sceneRef.current = null;
       cameraRef.current = null;
       rendererRef.current = null;
       controlsRef.current = null;
       tonnetzGroupRef.current = null;
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    if (!sceneRef.current) return;

     // Clear previous Tonnetz if it exists
    if (tonnetzGroupRef.current) {
       // Dispose previous geometries and materials
        tonnetzGroupRef.current.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            } else if (object instanceof THREE.Line) {
                 object.geometry.dispose();
                 if (Array.isArray(object.material)) {
                   object.material.forEach(material => material.dispose());
                 } else {
                   object.material.dispose();
                 }
            }
        });
        sceneRef.current.remove(tonnetzGroupRef.current);
    }


    tonnetzGroupRef.current = new THREE.Group();

    // Create Nodes (Spheres)
    const nodeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const nodeMaterial = new THREE.MeshPhongMaterial({ color: 0xEEEEEE }); // Light gray nodes
    nodes.forEach((node: TonnetzNode) => {
      const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial.clone()); // Clone material to avoid sharing
      sphere.position.set(node.x, node.y, node.z);
      tonnetzGroupRef.current?.add(sphere);

       // Optional: Add labels (requires additional setup like CanvasTexture)
       // Consider performance implications for many labels
    });

    // Create Edges (Lines)
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xEEEEEE, linewidth: 1 }); // Light gray lines
    edges.forEach((edge: TonnetzEdge) => {
      const points = [
        new THREE.Vector3(edge.source.x, edge.source.y, edge.source.z),
        new THREE.Vector3(edge.target.x, edge.target.y, edge.target.z),
      ];
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(edgeGeometry, edgeMaterial.clone()); // Clone material
      tonnetzGroupRef.current?.add(line);
    });

    sceneRef.current.add(tonnetzGroupRef.current);

     // Adjust camera position based on the new Tonnetz bounds if needed
     // This is a simple approach; more sophisticated bounding box calculations might be better
     const boundingBox = new THREE.Box3().setFromObject(tonnetzGroupRef.current);
     const center = boundingBox.getCenter(new THREE.Vector3());
     const size = boundingBox.getSize(new THREE.Vector3());
     const maxDim = Math.max(size.x, size.y, size.z);
     const fov = cameraRef.current?.fov * (Math.PI / 180);
     let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
     cameraZ *= 1.5; // Add some padding

     if (controlsRef.current) {
       controlsRef.current.target.copy(center);
       // Animate camera position change smoothly
        const targetPosition = new THREE.Vector3(center.x, center.y, center.z + Math.max(cameraZ, 10) ); // Ensure min distance
        // Simple lerp animation - for more complex use GSAP or tween.js
        const startPosition = cameraRef.current?.position.clone();
        let t = 0;
        const duration = 0.5; // seconds
        const animateCamera = (time: number) => {
            if (!startPosition) return;
            const delta = (time - (lastTime || time)) / 1000;
            lastTime = time;
            t += delta / duration;
            if (t < 1) {
               cameraRef.current?.position.lerpVectors(startPosition, targetPosition, t);
               requestAnimationFrame(animateCamera);
            } else {
               cameraRef.current?.position.copy(targetPosition);
               controlsRef.current?.update();
            }
        }
        let lastTime: number | null = null;
        requestAnimationFrame(animateCamera);

     } else if (cameraRef.current){
        cameraRef.current.position.z = Math.max(cameraZ, 10); // Ensure a minimum distance
        cameraRef.current.lookAt(center);
     }


  }, [nodes, edges, limit]); // Re-run when nodes or edges change (due to limit change)


  return <div ref={mountRef} className="w-full h-full" />;
};

export default TonnetzVisualizer;
