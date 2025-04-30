// @ts-nocheck We need this because CSS2DRenderer types are not perfectly aligned
'use client';

import type { FC } from 'react';
import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { generateTonnetzData, type TonnetzNode, type TonnetzEdge } from '@/lib/tonnetz-generator';
import type { IntonationLimit } from '@/types';
import { playTone } from '@/lib/audio'; // Import the audio playback function
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react'; // Icons for mute toggle
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // For mute button tooltip

interface TonnetzVisualizerProps {
  limit: IntonationLimit;
}

const NODE_COLOR = 0xEEEEEE; // Light gray nodes
const EDGE_COLOR = 0xEEEEEE; // Light gray lines
const HOVER_COLOR = 0x00ADB5; // Teal accent color
const CLICK_COLOR = 0x007A7F; // Darker teal for click feedback
const BACKGROUND_COLOR = 0x222831; // Dark blue background
const LABEL_COLOR = 'rgb(238, 238, 238)'; // Light gray #EEEEEE

const TonnetzVisualizer: FC<TonnetzVisualizerProps> = ({ limit }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null); // For CSS labels
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const tonnetzGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const intersectedRef = useRef<THREE.Mesh | null>(null); // Store the currently hovered node
  const [isMuted, setIsMuted] = useState(false);

  const { nodes, edges } = useMemo(() => generateTonnetzData(limit), [limit]);

  // --- Audio Playback ---
  const handleNodeClick = useCallback((nodeData: TonnetzNode) => {
      if (!isMuted) {
          playTone(nodeData.frequency);
      }
      // Visual feedback (briefly change color)
      const nodeObject = tonnetzGroupRef.current?.getObjectByName(nodeData.id);
      if (nodeObject instanceof THREE.Mesh) {
          const originalColor = (nodeObject.material as THREE.MeshPhongMaterial).color.getHex();
          (nodeObject.material as THREE.MeshPhongMaterial).color.setHex(CLICK_COLOR);
          setTimeout(() => {
              // Restore original color, considering hover state
              const currentIntersectedId = intersectedRef.current?.userData?.originalId ?? intersectedRef.current?.name;
              if (nodeObject.name === currentIntersectedId && intersectedRef.current) {
                (nodeObject.material as THREE.MeshPhongMaterial).color.setHex(HOVER_COLOR);
              } else {
                (nodeObject.material as THREE.MeshPhongMaterial).color.setHex(originalColor);
              }
          }, 150); // Duration of the click feedback color
      }
  }, [isMuted]);


  // --- Mouse Interaction (Hover & Click) ---
   const onPointerMove = useCallback((event: PointerEvent) => {
      if (!mountRef.current || !cameraRef.current || !tonnetzGroupRef.current) return;

      // calculate pointer position in normalized device coordinates
      // (-1 to +1) for both components
      const rect = mountRef.current.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(tonnetzGroupRef.current.children.filter(c => c instanceof THREE.Mesh), false); // Intersect only meshes

      if (intersects.length > 0) {
          const firstIntersect = intersects[0].object as THREE.Mesh;
          // Check if the intersected object is different from the previously intersected one
          if (intersectedRef.current !== firstIntersect) {
               // Restore previous intersected object's color if it exists
               if (intersectedRef.current) {
                   (intersectedRef.current.material as THREE.MeshPhongMaterial).color.setHex(intersectedRef.current.userData.originalColor ?? NODE_COLOR);
               }
               // Store new intersected object and its original color
               intersectedRef.current = firstIntersect;
               intersectedRef.current.userData.originalColor = (firstIntersect.material as THREE.MeshPhongMaterial).color.getHex();
               // Apply hover color
               (firstIntersect.material as THREE.MeshPhongMaterial).color.setHex(HOVER_COLOR);
               mountRef.current.style.cursor = 'pointer';
          }
      } else {
          // No intersection, restore previous object's color if it exists
          if (intersectedRef.current) {
              (intersectedRef.current.material as THREE.MeshPhongMaterial).color.setHex(intersectedRef.current.userData.originalColor ?? NODE_COLOR);
              mountRef.current.style.cursor = 'default';
          }
          intersectedRef.current = null;
      }

  }, []); // Dependencies: cameraRef, tonnetzGroupRef

  const onClick = useCallback((event: MouseEvent) => {
      if (intersectedRef.current) {
          const nodeData = nodes.find(n => n.id === (intersectedRef.current?.userData?.originalId ?? intersectedRef.current?.name) );
          if (nodeData) {
              handleNodeClick(nodeData);
          }
      }
  }, [nodes, handleNodeClick]); // Dependencies: nodes, handleNodeClick


  // --- Scene Setup Effect ---
  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // Scene setup
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(BACKGROUND_COLOR);

    // Camera setup
    cameraRef.current = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000); // Adjusted FOV slightly
    cameraRef.current.position.z = 20; // Start further back

    // Renderer setup (WebGL)
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(width, height);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(rendererRef.current.domElement);

    // Label Renderer Setup (CSS2D)
    labelRendererRef.current = new CSS2DRenderer();
    labelRendererRef.current.setSize(width, height);
    labelRendererRef.current.domElement.style.position = 'absolute';
    labelRendererRef.current.domElement.style.top = '0px';
    labelRendererRef.current.domElement.style.pointerEvents = 'none'; // Allow clicks to pass through
    currentMount.appendChild(labelRendererRef.current.domElement);


    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    sceneRef.current.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0xffffff, 0.6);
    pointLight1.position.set(15, 15, 15);
    sceneRef.current.add(pointLight1);
     const pointLight2 = new THREE.PointLight(0xffffff, 0.4);
    pointLight2.position.set(-15, -10, 10);
    sceneRef.current.add(pointLight2);

    // Orbit Controls
    controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.1;
    controlsRef.current.rotateSpeed = 0.6;
    controlsRef.current.zoomSpeed = 0.9;
    controlsRef.current.panSpeed = 0.6;
    controlsRef.current.minDistance = 3; // Prevent zooming too close
    controlsRef.current.maxDistance = 100; // Prevent zooming too far


    // Handle resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && labelRendererRef.current && currentMount) {
        const newWidth = currentMount.clientWidth;
        const newHeight = currentMount.clientHeight;
        rendererRef.current.setSize(newWidth, newHeight);
        labelRendererRef.current.setSize(newWidth, newHeight); // Resize label renderer
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);

    // Add interaction listeners
    currentMount.addEventListener('pointermove', onPointerMove);
    currentMount.addEventListener('click', onClick);


    // Animation loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controlsRef.current?.update();
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
      labelRendererRef.current?.render(sceneRef.current!, cameraRef.current!); // Render labels
    };
    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      currentMount.removeEventListener('pointermove', onPointerMove);
      currentMount.removeEventListener('click', onClick);

      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      controlsRef.current?.dispose();
      rendererRef.current?.dispose();
      labelRendererRef.current?.domElement.remove(); // Remove label renderer DOM

      if (currentMount && rendererRef.current) {
         if (currentMount.contains(rendererRef.current.domElement)) {
             currentMount.removeChild(rendererRef.current.domElement);
         }
      }

      // Dispose geometries and materials
      tonnetzGroupRef.current?.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else if (object.material) {
            object.material.dispose();
          }
        } else if (object instanceof THREE.Line) {
           object.geometry.dispose();
           if (Array.isArray(object.material)) {
             object.material.forEach(material => material.dispose());
           } else if (object.material){
             object.material.dispose();
           }
        } else if (object instanceof CSS2DObject) {
             // Labels are DOM elements managed by CSS2DRenderer, less direct disposal needed here
             // but ensure they are removed from the group.
        }
      });
       sceneRef.current?.remove(tonnetzGroupRef.current!); // Ensure group removal

       sceneRef.current = null;
       cameraRef.current = null;
       rendererRef.current = null;
       labelRendererRef.current = null;
       controlsRef.current = null;
       tonnetzGroupRef.current = null;
       intersectedRef.current = null; // Clear intersected ref
    };
  }, [onPointerMove, onClick]); // Include interaction handlers in dependencies

  // --- Tonnetz Update Effect ---
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current) return;

     // Clear previous Tonnetz
    if (tonnetzGroupRef.current) {
        // Dispose old geometries/materials/labels before removing
        tonnetzGroupRef.current.traverse((object) => {
             if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                 if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                 else if (object.material) object.material.dispose();
             } else if (object instanceof THREE.Line) {
                 object.geometry.dispose();
                 if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                 else if (object.material) object.material.dispose();
             } else if (object instanceof CSS2DObject) {
                 object.removeFromParent(); // Remove label from the scene graph
                 // DOM element removal is handled by CSS2DRenderer
             }
         });
        sceneRef.current.remove(tonnetzGroupRef.current);
        tonnetzGroupRef.current = null; // Ensure it's cleared
    }


    tonnetzGroupRef.current = new THREE.Group();
    tonnetzGroupRef.current.name = "TonnetzNetwork"; // Name for easier debugging

    // Create Nodes (Spheres)
    const nodeGeometry = new THREE.SphereGeometry(0.25, 20, 20); // Slightly larger, more detail
    const nodeMaterial = new THREE.MeshPhongMaterial({
        color: NODE_COLOR,
        shininess: 30, // Add some shine
       // flatShading: true, // Optional: different look
     });

    nodes.forEach((node: TonnetzNode) => {
      const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
      sphere.position.set(node.x, node.y, node.z);
      sphere.name = node.id; // Use the unique node ID as the object name
      sphere.userData = { originalId: node.id }; // Store original ID if name changes
      tonnetzGroupRef.current?.add(sphere);

      // Create Labels (CSS2DObject)
       const labelDiv = document.createElement('div');
       labelDiv.className = 'tonnetz-label'; // For potential CSS styling
       labelDiv.textContent = node.label;
       labelDiv.style.color = LABEL_COLOR;
       labelDiv.style.fontSize = '10px'; // Smaller font size
       labelDiv.style.fontFamily = 'sans-serif';
       labelDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.7)'; // Add shadow for readability
       labelDiv.style.pointerEvents = 'none'; // Make sure labels don't block clicks on spheres

       const nodeLabel = new CSS2DObject(labelDiv);
       nodeLabel.position.set(0, 0.35, 0); // Offset label slightly above the node center
       sphere.add(nodeLabel); // Attach label to the sphere mesh

    });

    // Create Edges (Lines)
    const edgeMaterial = new THREE.LineBasicMaterial({ color: EDGE_COLOR, linewidth: 1 });
    edges.forEach((edge: TonnetzEdge) => {
      const points = [
        new THREE.Vector3(edge.source.x, edge.source.y, edge.source.z),
        new THREE.Vector3(edge.target.x, edge.target.y, edge.target.z),
      ];
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(edgeGeometry, edgeMaterial.clone());
      line.userData = { type: edge.type }; // Store edge type if needed later
      tonnetzGroupRef.current?.add(line);
    });

    sceneRef.current.add(tonnetzGroupRef.current);

     // Auto-adjust camera to fit the new Tonnetz
     if (tonnetzGroupRef.current.children.length > 0) {
        const boundingBox = new THREE.Box3().setFromObject(tonnetzGroupRef.current);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)); // Calculate distance to fit
        cameraZ *= 1.6; // Add padding multiplier (adjust as needed)

        const targetPosition = new THREE.Vector3(center.x, center.y, center.z + Math.max(cameraZ, 8)); // Ensure min distance

        if (controlsRef.current) {
            controlsRef.current.target.copy(center);

            // Smooth camera transition (optional, can use a library like GSAP/Tween.js)
            const startPosition = cameraRef.current.position.clone();
            let t = 0;
            const duration = 0.6; // seconds for transition
            let lastTime: number | null = null;

            const animateCamera = (time: number) => {
                if (!startPosition || !cameraRef.current || !controlsRef.current) return;
                if (lastTime === null) lastTime = time;
                const delta = (time - lastTime) / 1000;
                lastTime = time;
                t += delta / duration;
                t = Math.min(t, 1); // Clamp t to 1

                cameraRef.current.position.lerpVectors(startPosition, targetPosition, t);
                cameraRef.current.lookAt(controlsRef.current.target); // Ensure looking at target during transition
                controlsRef.current.update(); // Update controls during animation

                if (t < 1) {
                    requestAnimationFrame(animateCamera);
                }
            };
            requestAnimationFrame(animateCamera);

        } else {
           cameraRef.current.position.copy(targetPosition);
           cameraRef.current.lookAt(center);
        }
     }


  }, [nodes, edges, limit]); // Re-run when data changes


  return (
      <div className="relative w-full h-full">
          <div ref={mountRef} className="w-full h-full" />
           <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-4 right-4 z-10 text-foreground hover:bg-accent/20 hover:text-accent"
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                       <span className="sr-only">{isMuted ? 'Unmute' : 'Mute'}</span>
                    </Button>
                </TooltipTrigger>
                 <TooltipContent side="left">
                    <p>{isMuted ? 'Unmute Sounds' : 'Mute Sounds'}</p>
                </TooltipContent>
             </Tooltip>
           </TooltipProvider>
      </div>
    );
};

export default TonnetzVisualizer;
