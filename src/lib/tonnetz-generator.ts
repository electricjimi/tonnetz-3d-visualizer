import type { IntonationLimit } from '@/types';

// Define node and edge types
export interface TonnetzNode {
  id: string; // e.g., "C", "G", "E", "Bb7", etc.
  label: string;
  x: number;
  y: number;
  z: number;
  type: 'major' | 'minor' | 'dominant7' | 'other'; // Helps in styling or identification
}

export interface TonnetzEdge {
  source: TonnetzNode;
  target: TonnetzNode;
  type: 'perfectFifth' | 'majorThird' | 'minorThird' | 'minorSeventh'; // Type of interval connection
}

// Function to generate Tonnetz data
export function generateTonnetzData(limit: IntonationLimit): { nodes: TonnetzNode[], edges: TonnetzEdge[] } {
  const nodes: TonnetzNode[] = [];
  const edges: TonnetzEdge[] = [];
  const nodeMap = new Map<string, TonnetzNode>();

  // --- Helper Functions ---
  const addNode = (id: string, label: string, x: number, y: number, z: number, type: TonnetzNode['type']) => {
    if (!nodeMap.has(id)) {
      const newNode: TonnetzNode = { id, label, x, y, z, type };
      nodes.push(newNode);
      nodeMap.set(id, newNode);
    }
    return nodeMap.get(id)!;
  };

  const addEdge = (sourceId: string, targetId: string, type: TonnetzEdge['type']) => {
    const sourceNode = nodeMap.get(sourceId);
    const targetNode = nodeMap.get(targetId);
    if (sourceNode && targetNode) {
        // Avoid duplicate edges (check both directions)
        const exists = edges.some(e =>
            (e.source.id === sourceId && e.target.id === targetId) ||
            (e.source.id === targetId && e.target.id === sourceId)
        );
        if (!exists) {
            edges.push({ source: sourceNode, target: targetNode, type });
        }
    }
  };


  // --- Tonnetz Generation Logic ---
  // This is a simplified generation. A real Tonnetz wraps around topologically.
  // We'll generate a flat section for visualization.
  const range = 3; // How far out to generate from the center (C)
  const scaleFactor = 2.5; // Spacing between nodes

  for (let i = -range; i <= range; i++) { // Represents fifths axis (roughly x)
    for (let j = -range; j <= range; j++) { // Represents thirds axis (roughly y)
        // Basic Limit 5 (Fifths and Major Thirds)
        const fifthOffset = i;
        const thirdOffset = j;

        // Calculate position (simplified planar projection for now)
        // A true 3D Tonnetz embedding is more complex
        const x = (fifthOffset * Math.sqrt(3) / 2 + thirdOffset * Math.sqrt(3) / 2) * scaleFactor;
        const y = (fifthOffset * 1 / 2 - thirdOffset * 1 / 2) * scaleFactor;
        const z = 0; // Keep it planar initially for simplicity, expand later if needed

        // Determine the note name based on offsets from C (0,0)
        // This requires a more robust music theory calculation involving interval stacking.
        // Placeholder note names for now:
        const noteId = `note_${i}_${j}`;
        const noteLabel = `(${i},${j})`; // Replace with actual note name later
        const nodeType: TonnetzNode['type'] = ( (i + j) % 2 === 0 ) ? 'major' : 'minor'; // Arbitrary type assignment

        const currentNode = addNode(noteId, noteLabel, x, y, z, nodeType);

        // Connect with neighbors based on intervals
        // Connect Perfect Fifth (move along i)
        const fifthNeighborId = `note_${i + 1}_${j}`;
        if (i < range) addEdge(noteId, fifthNeighborId, 'perfectFifth');

        // Connect Major Third (move along j)
        const majorThirdNeighborId = `note_${i}_${j + 1}`;
         if (j < range) addEdge(noteId, majorThirdNeighborId, 'majorThird');

        // Connect Minor Third (diagonal connection) - often represented
        const minorThirdNeighborId = `note_${i + 1}_${j - 1}`;
         if (i < range && j > -range) addEdge(noteId, minorThirdNeighborId, 'minorThird');


        // Limit 7 additions (connections involving the Minor Seventh)
        if (limit === 7) {
            // Add connections related to the harmonic seventh (ratio 7/4)
            // This requires defining how the 7th dimension interacts with the 5-limit plane.
            // A common approach projects it, creating additional connections.

            // Example: Connect to a node representing the dominant seventh quality
            // Let's assume moving in a 'k' direction (z-axis for simplicity) relates to the 7th limit
             for (let k = -1; k <= 1; k+=2) { // Simple +/- z offset for 7th limit
                if (Math.abs(i) + Math.abs(j) + Math.abs(k) <= range) { // Keep within overall range
                    const z_7 = k * scaleFactor * 1.2; // Adjust z based on 'k'
                    const x_7 = x; // Keep x, y same for this simple projection
                    const y_7 = y;
                    const seventhNodeId = `note_${i}_${j}_${k}`;
                    const seventhNodeLabel = `(${i},${j},${k})`; // Indicate 7th limit
                    const seventhNodeType: TonnetzNode['type'] = 'dominant7';

                    const seventhNode = addNode(seventhNodeId, seventhNodeLabel, x_7, y_7, z_7, seventhNodeType);

                    // Connect the 5-limit node to its 7-limit counterpart
                    addEdge(noteId, seventhNodeId, 'minorSeventh'); // Or a specific 'harmonicSeventh' type

                    // Add connections between 7-limit nodes if desired (more complex)
                     // Connect Perfect Fifth in the 7-limit layer
                    const fifthNeighbor7Id = `note_${i + 1}_${j}_${k}`;
                    if (i < range && nodeMap.has(fifthNeighbor7Id)) addEdge(seventhNodeId, fifthNeighbor7Id, 'perfectFifth');

                    // Connect Major Third in the 7-limit layer
                    const majorThirdNeighbor7Id = `note_${i}_${j + 1}_${k}`;
                    if (j < range && nodeMap.has(majorThirdNeighbor7Id)) addEdge(seventhNodeId, majorThirdNeighbor7Id, 'majorThird');
                }
             }
        }
    }
  }


  // Post-processing: Center the geometry
  if (nodes.length > 0) {
        let centerX = 0, centerY = 0, centerZ = 0;
        nodes.forEach(node => {
            centerX += node.x;
            centerY += node.y;
            centerZ += node.z;
        });
        centerX /= nodes.length;
        centerY /= nodes.length;
        centerZ /= nodes.length;

        nodes.forEach(node => {
            node.x -= centerX;
            node.y -= centerY;
            node.z -= centerZ;
        });
   }


  return { nodes, edges };
}
