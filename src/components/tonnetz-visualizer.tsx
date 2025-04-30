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
import TonnetzLegend from '@/components/tonnetz-legend';

interface TonnetzVisualizerProps {
  limit: IntonationLimit;
}

const DEFAULT_NODE_COLOR = 0xFF0000; // Red (Keep node colors, but adjust background/labels)
const HOVER_COLOR = 0x00ADB5; // Teal accent color
const CLICK_COLOR = 0x007A7F; // Darker teal for click feedback
const BACKGROUND_COLOR = 0x222831; // Dark blue background
const LABEL_COLOR = 'rgb(238, 238, 238)'; // Light gray label color


const TonnetzVisualizer: FC<TonnetzVisualizerProps> = ({ limit }) => {


    // Function to get the color for a given note label

  const getNodeColor = (label: string): number => {
    // Keep distinct node colors for visual clarity
    switch (label) {
      case 'C': return 0xFF0000; // Red
      case 'C#': return 0xFFA500; // Orange
      case 'D': return 0xFFFF00; // Yellow
      case 'D#': return 0x32CD32; // LimeGreen (Brighter Green)
      case 'E': return 0x0000FF; // Blue
      case 'F': return 0x4B0082; // Indigo
      case 'F#': return 0x8A2BE2; // BlueViolet
      case 'G': return 0xFF1493; // DeepPink
      case 'G#': return 0xFF69B4; // HotPink
      case 'A': return 0x00CED1; // DarkTurquoise
      case 'A#': return 0x4682B4; // SteelBlue
      case 'B': return 0xD2691E; // Chocolate (Brown)
      default: return 0x808080; // Gray for unknowns
    }
  };

    const noteColors = {
        'C': getNodeColor('C'),
        'C#': getNodeColor('C#'),
        'D': getNodeColor('D'),
        'D#': getNodeColor('D#'),
        'E': getNodeColor('E'),
        'F': getNodeColor('F'),
        'F#': getNodeColor('F#'),
        'G': getNodeColor('G'),
        'G#': getNodeColor('G#'),
        'A': getNodeColor('A'),
        'A#': getNodeColor('A#'),
        'B': getNodeColor('B'),
    };
  // Function to get the color for a given edge type
    const getEdgeColor = (type: TonnetzEdge['type']): number => {
        switch (type) {
            case 'majorThird': return 0x0000FF; // Light Gray for major thirds
            case 'minorThird': return 0x0000FF; // Slightly darker gray for minor thirds
            case 'perfectFifth': return 0xFF1493; // Medium light gray for fifths
            case 'harmonicSeventh': return 0x00ADB5; // Teal for harmonic sevenths
            default: return 0x696969; // DimGray for any unexpected types
        }
    };
    const edgeColors = {
        'Major Third': getEdgeColor('majorThird'),
        'Minor Third': getEdgeColor('minorThird'),
        'Perfect Fifth': getEdgeColor('perfectFifth'),
        'Harmonic Seventh': getEdgeColor('harmonicSeventh'), // Only relevant for limit 7
    };

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
          const originalColor = nodeObject.userData.originalColor ?? getNodeColor(nodeData.label);
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
  }, [isMuted]); // Removed getNodeColor from deps as it's stable


  // --- Mouse Interaction (Hover & Click) ---
   const onPointerMove = useCallback((event: PointerEvent) => {
      if (!mountRef.current || !cameraRef.current || !tonnetzGroupRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(tonnetzGroupRef.current.children.filter(c => c instanceof THREE.Mesh), false);

      if (intersects.length > 0) {
          const firstIntersect = intersects[0].object as THREE.Mesh;
          if (intersectedRef.current !== firstIntersect) {
               if (intersectedRef.current) {
                   const originalColor = intersectedRef.current.userData.originalColor;
                   (intersectedRef.current.material as THREE.MeshPhongMaterial).color.setHex(originalColor );
               }
               intersectedRef.current = firstIntersect;
               // Store original color if not already stored
               if(intersectedRef.current.userData.originalColor === undefined) {
                 intersectedRef.current.userData.originalColor = (firstIntersect.material as THREE.MeshPhongMaterial).color.getHex();
               }
               (firstIntersect.material as THREE.MeshPhongMaterial).color.setHex(HOVER_COLOR);
               mountRef.current.style.cursor = 'pointer';
          }
      } else {
          if (intersectedRef.current) {
              const originalColor = intersectedRef.current.userData.originalColor;
              (intersectedRef.current.material as THREE.MeshPhongMaterial).color.setHex(originalColor );
              mountRef.current.style.cursor = 'default';
          }
          intersectedRef.current = null;
      }

  }, []); // Dependencies: cameraRef, tonnetzGroupRef

  const onClick = useCallback((event: MouseEvent) => {
      if (intersectedRef.current) {
          // Find node using the stored originalId from userData
          const nodeData = nodes.find(n => n.id === intersectedRef.current?.userData?.originalId);
          if (nodeData) {
              handleNodeClick(nodeData);
          }
      }
  }, [nodes, handleNodeClick]);


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
    cameraRef.current = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    cameraRef.current.position.z = 20;

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
    labelRendererRef.current.domElement.style.pointerEvents = 'none'; // Labels don't block clicks
    currentMount.appendChild(labelRendererRef.current.domElement);


    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Adjust intensity as needed
    sceneRef.current.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0xffffff, 0.6, 100); // Slightly less intense point light
    pointLight1.position.set(15, 15, 15);
    sceneRef.current.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0xffffff, 0.4, 100);
    pointLight2.position.set(-15, -10, 10);
    sceneRef.current.add(pointLight2);


    // Orbit Controls
    controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.1;
    controlsRef.current.rotateSpeed = 0.6;
    controlsRef.current.zoomSpeed = 0.9;
    controlsRef.current.panSpeed = 0.6;
    controlsRef.current.minDistance = 3;
    controlsRef.current.maxDistance = 100;


    // Handle resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && labelRendererRef.current && currentMount) {
        const newWidth = currentMount.clientWidth;
        const newHeight = currentMount.clientHeight;
        rendererRef.current.setSize(newWidth, newHeight);
        labelRendererRef.current.setSize(newWidth, newHeight);
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
      labelRendererRef.current?.domElement.remove(); // Remove label renderer's element

      if (currentMount && rendererRef.current) {
         if (currentMount.contains(rendererRef.current.domElement)) {
             currentMount.removeChild(rendererRef.current.domElement);
         }
      }

      // Dispose geometries and materials
      tonnetzGroupRef.current?.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material?.dispose());
          } else if (object.material) {
            object.material?.dispose();
          }
        } else if (object instanceof THREE.Line) {
           object.geometry?.dispose();
           if (Array.isArray(object.material)) {
             object.material.forEach(material => material?.dispose());
           } else if (object.material){
             object.material?.dispose();
           }
        } else if (object instanceof CSS2DObject) {
           // CSS2DObjects manage their own DOM elements, remove parent cleans up
           object.removeFromParent();
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
        tonnetzGroupRef.current.traverse((object) => {
             if (object instanceof THREE.Mesh) {
                object.geometry?.dispose();
                 if (Array.isArray(object.material)) object.material.forEach(m => m?.dispose());
                 else if (object.material) object.material?.dispose();
             } else if (object instanceof THREE.Line) {
                 object.geometry?.dispose();
                 if (Array.isArray(object.material)) object.material.forEach(m => m?.dispose());
                 else if (object.material) object.material?.dispose();
             } else if (object instanceof CSS2DObject) {
                  // Remove the DOM element associated with the label
                 if (object.element.parentNode) {
                    object.element.parentNode.removeChild(object.element);
                 }
                 object.removeFromParent();
             }
         });
        sceneRef.current.remove(tonnetzGroupRef.current);
        tonnetzGroupRef.current = null; // Ensure it's cleared
    }


    tonnetzGroupRef.current = new THREE.Group();
    tonnetzGroupRef.current.name = "TonnetzNetwork";

    // Create Nodes (Spheres)
    const nodeGeometry = new THREE.SphereGeometry(0.25, 20, 20); // Good size/detail balance
    // Material is cloned per node to allow individual color changes
    const nodeMaterial = new THREE.MeshPhongMaterial({
        shininess: 30, // Adjust shininess for dark background
        //flatShading: true, // Can uncomment for a different look
     });

    nodes.forEach((node: TonnetzNode) => {
      const sphereMaterialInstance = nodeMaterial.clone();
      const nodeColor = getNodeColor(node.label); // Get color based on label
      sphereMaterialInstance.color.setHex(nodeColor);

      const sphere = new THREE.Mesh(nodeGeometry, sphereMaterialInstance);
      sphere.position.set(node.x, node.y, node.z);
      sphere.name = node.id; // Use the unique node ID
      sphere.userData = { originalId: node.id, originalColor: nodeColor }; // Store ID and original color
      tonnetzGroupRef.current?.add(sphere);

      // Create Labels (CSS2DObject)
       const labelDiv = document.createElement('div');
       labelDiv.className = 'tonnetz-label'; // Use class from globals.css
       labelDiv.textContent = node.label;
       // Styles are now primarily handled by CSS class
       // labelDiv.style.color = LABEL_COLOR; // Set by CSS
       // labelDiv.style.fontWeight = 'bold'; // Set by CSS
       // labelDiv.style.textShadow = ... // Set by CSS

       const nodeLabel = new CSS2DObject(labelDiv);
       nodeLabel.position.set(0, 0.35, 0); // Offset label slightly above
       sphere.add(nodeLabel); // Attach label to the sphere
    });

    // Create Edges (Lines)
    const edgeMaterialBase = new THREE.LineBasicMaterial({
        linewidth: 1, // Thinner lines for better contrast
        vertexColors: false, // Use single color per line
        transparent: true,
        opacity: 0.8 // Slightly transparent lines
     });
    edges.forEach((edge: TonnetzEdge) => {
      const points = [
        new THREE.Vector3(edge.source.x, edge.source.y, edge.source.z),
        new THREE.Vector3(edge.target.x, edge.target.y, edge.target.z),
      ];
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterialInstance = edgeMaterialBase.clone();
      lineMaterialInstance.color.setHex(getEdgeColor(edge.type)); // Set color based on type
      const line = new THREE.Line(edgeGeometry, lineMaterialInstance);
      line.userData = { type: edge.type };
      tonnetzGroupRef.current?.add(line);
    });

    sceneRef.current.add(tonnetzGroupRef.current);

     // Auto-adjust camera to fit the new Tonnetz
     if (tonnetzGroupRef.current.children.length > 0 && cameraRef.current && controlsRef.current) {
        const boundingBox = new THREE.Box3().setFromObject(tonnetzGroupRef.current);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
        cameraZ = Math.max(cameraZ * 1.6, 8); // Ensure min distance and add padding

        const targetPosition = new THREE.Vector3(center.x, center.y, center.z + cameraZ);

        // Smooth camera transition
        const startPosition = cameraRef.current.position.clone();
        const startTarget = controlsRef.current.target.clone();
        let t = 0;
        const duration = 0.6; // seconds
        let lastTime: number | null = null;

        const animateCamera = (time: number) => {
            if (!startPosition || !cameraRef.current || !controlsRef.current) return;
            if (lastTime === null) lastTime = time;
            const delta = (time - lastTime) / 1000;
            lastTime = time;
            t += delta / duration;
            t = Math.min(t, 1);

            cameraRef.current.position.lerpVectors(startPosition, targetPosition, t);
            controlsRef.current.target.lerpVectors(startTarget, center, t); // Smooth target transition too
            controlsRef.current.update();

            if (t < 1) {
                requestAnimationFrame(animateCamera);
            }
        };
        requestAnimationFrame(animateCamera);

     }


  }, [nodes, edges, limit]); // Re-run when data or limit changes


  return (
      <div className="relative w-full h-full">
          <div ref={mountRef} className="w-full h-full" />
          <TonnetzLegend noteColors={noteColors} edgeColors={limit === 7 ? edgeColors : { // Only show H7 for limit 7
              'Major Third': edgeColors['Major Third'],
              'Minor Third': edgeColors['Minor Third'],
              'Perfect Fifth': edgeColors['Perfect Fifth']
          }} />
           <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      // Adjust button appearance for dark background
                      className="absolute bottom-4 right-4 z-10 text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
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
