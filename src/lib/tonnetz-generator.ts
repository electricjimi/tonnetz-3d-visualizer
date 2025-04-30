import type { IntonationLimit, TonnetzNode, TonnetzEdge } from '@/types';

// --- Constants ---
const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const A4_MIDI_NOTE = 69; // MIDI note number for A4
const C4_MIDI_NOTE = 60; // MIDI note number for C4 (middle C)
const C4_FREQUENCY = 261.6255653006; // Frequency of C4
const C0_FREQUENCY = C4_FREQUENCY / 16; // Frequency of C0 approx 16.35 Hz

// Reference node: C4 (MIDI 60) corresponds to exponents (p3=0, p5=0, p7=0)
const REF_MIDI_NOTE = C4_MIDI_NOTE;
const REF_FREQUENCY = C4_FREQUENCY;
const REF_P3 = 0;
const REF_P5 = 0;
const REF_P7 = 0;

// --- Helper Functions ---

// Calculate Just Intonation frequency from exponents relative to reference
// p3: exponent of 3 (fifths)
// p5: exponent of 5 (major thirds)
// p7: exponent of 7 (harmonic sevenths)
function calculateFrequencyJI(p3: number, p5: number, p7: number): number {
    // Ratios relative to C4 (0,0,0)
    const ratio = Math.pow(3, p3) * Math.pow(5, p5) * Math.pow(7, p7);

    // Normalize the ratio by powers of 2 to bring it near 1 (within an octave of the reference)
    // Find n such that 0.5 <= ratio * 2^n < 1 for label consistency (or near 1)
    // More practically, find n to put it in a typical musical range near the reference freq.
    let normalizedFrequency = REF_FREQUENCY * ratio;

    // Simple normalization: Bring frequency into a central range (e.g., C3-C5)
    // Adjust this range/logic as needed for better octave distribution
    const lowerBound = C4_FREQUENCY / 2; // C3
    const upperBound = C4_FREQUENCY * 2; // C5
    while (normalizedFrequency < lowerBound) {
        normalizedFrequency *= 2;
    }
    while (normalizedFrequency >= upperBound) {
        normalizedFrequency /= 2;
    }

    return normalizedFrequency;
}


// Approximate MIDI note from frequency for labelling purposes
function frequencyToMidi(frequency: number): number {
    // Use C0 as the base for MIDI calculation (MIDI 12)
    return 12 * Math.log2(frequency / C0_FREQUENCY) + 12;
}

// Converts MIDI note number to note name (e.g., "C#4")
function midiToNoteName(midiNote: number, useSharps: boolean = true): string {
    const roundedMidi = Math.round(midiNote); // Round for clearer labels
    if (roundedMidi < 0 || roundedMidi > 127) return "N/A"; // Invalid MIDI range

    const octave = Math.floor(roundedMidi / 12) - 1; // Adjust octave (MIDI C4 is octave 4)
    const noteIndex = roundedMidi % 12;
    const names = useSharps ? NOTE_NAMES_SHARP : NOTE_NAMES_FLAT;
    // Handle potential out-of-bounds index just in case
    const safeIndex = (noteIndex + 12) % 12;
    const noteName = names[safeIndex];
    return `${noteName}${octave}`;
}

// Gets the display label (without octave)
function getNoteLabel(midiNote: number, useSharps: boolean = true): string {
     const roundedMidi = Math.round(midiNote);
    if (roundedMidi < 0 || roundedMidi > 127) return "?";
    const noteIndex = roundedMidi % 12;
    const names = useSharps ? NOTE_NAMES_SHARP : NOTE_NAMES_FLAT;
     const safeIndex = (noteIndex + 12) % 12;
    return names[safeIndex];
}

// Calculate 3D coordinates based on JI exponents
function calculateCoordinates(p3: number, p5: number, p7: number, scaleFactor: number, scaleFactorZ: number): { x: number, y: number, z: number } {
    // Standard projection for p3/p5 onto XY plane (hexagonal lattice)
    const x = (p3 * Math.sqrt(3) / 2 + p5 * Math.sqrt(3) / 2) * scaleFactor;
    const y = (p3 * 1 / 2 - p5 * 1 / 2) * scaleFactor;
    // Use p7 for the Z axis
    const z = p7 * scaleFactorZ;
    return { x, y, z };
}

// --- Main Generation Function ---

export function generateTonnetzData(limit: IntonationLimit): { nodes: TonnetzNode[], edges: TonnetzEdge[] } {
  const nodes: TonnetzNode[] = [];
  const edges: TonnetzEdge[] = [];
  const nodeMap = new Map<string, TonnetzNode>(); // Key: "p3_p5_p7"

  // Generation parameters
  const rangeP3 = 2; // How many fifth steps away from center
  const rangeP5 = 2; // How many third steps away from center
  const rangeP7 = (limit === 7) ? 1 : 0; // Limit 7: p7 = -1, 0, 1. Limit 5: p7 = 0 only.
  const scaleFactor = 3.0; // Spacing in XY plane
  const scaleFactorZ = 3.5; // Spacing along Z axis for Limit 7

  // Iterate through exponent combinations
  for (let p3 = -rangeP3; p3 <= rangeP3; p3++) {
    for (let p5 = -rangeP5; p5 <= rangeP5; p5++) {
        // Limit p7 range based on the selected intonation limit
        const p7Start = (limit === 7) ? -rangeP7 : 0;
        const p7End = (limit === 7) ? rangeP7 : 0;

        for (let p7 = p7Start; p7 <= p7End; p7++) {
             // **Constraint for Limit 7:** Only include nodes where p7 is NOT 0 if the limit is 7.
             // For Limit 5, p7 is always 0 anyway.
             // We want to *keep* p7=0 nodes for Limit 7 as the base layer.
             // The request was to *only* show p7=-1 and p7=1 layers *in addition* to p7=0.
             // The existing logic correctly includes p7=0, p7=-1, p7=1 for Limit 7.

             const nodeId = `node_${p3}_${p5}_${p7}`;
             const nodeKey = `${p3}_${p5}_${p7}`;

             // Skip if node already exists (though iteration should prevent this)
             if (nodeMap.has(nodeKey)) continue;

             // Calculate properties
             const frequency = calculateFrequencyJI(p3, p5, p7);
             const approxMidi = frequencyToMidi(frequency);
             const noteName = midiToNoteName(approxMidi, true); // Use sharps for consistency
             const label = getNoteLabel(approxMidi, true);
             const { x, y, z } = calculateCoordinates(p3, p5, p7, scaleFactor, scaleFactorZ);

             // Determine node type (heuristic) - refined
             let nodeType: TonnetzNode['type'];
             if (p7 !== 0) {
                 nodeType = 'harmonicSeventhRelated'; // Node explicitly involves the 7th harmonic
             } else if ((p3 + p5) % 2 === 0) {
                 nodeType = 'majorTriadComponent'; // Typically part of major triads in 5-limit
             } else {
                 nodeType = 'minorTriadComponent'; // Typically part of minor triads in 5-limit
             }


             // Create and store the node
             const newNode: TonnetzNode = {
                 id: nodeId,
                 p3, p5, p7, // Store exponents
                 label,
                 noteName,
                 x, y, z,
                 frequency,
                 type: nodeType // Assign the calculated nodeType
             };
             nodes.push(newNode);
             nodeMap.set(nodeKey, newNode);
        }
    }
  }

   // Helper function to add edges, avoiding duplicates
   const edgeSet = new Set<string>(); // Store edge signatures "nodeId1_nodeId2"
   const addEdge = (sourceNode: TonnetzNode, targetNode: TonnetzNode, edgeType: TonnetzEdge['type']) => { // Renamed parameter here
       // Ensure consistent order for the key
       const key = [sourceNode.id, targetNode.id].sort().join('_');
       if (!edgeSet.has(key)) {
           edges.push({ source: sourceNode, target: targetNode, type: edgeType }); // Use the parameter name
           edgeSet.add(key);
       }
   };

   // Add Edges connecting adjacent nodes in the exponent lattice
   nodes.forEach(sourceNode => {
       const { p3, p5, p7 } = sourceNode;

       // Define potential neighbors by changing one exponent by +/- 1
       const neighbors = [
           // 5-Limit Intervals (always present)
           { dp3: 1, dp5: 0, dp7: 0, type: 'perfectFifth' as const },      // P5 up
           { dp3: -1, dp5: 0, dp7: 0, type: 'perfectFifth' as const },     // P5 down (P4 up)
           { dp3: 0, dp5: 1, dp7: 0, type: 'majorThird' as const },       // M3 up
           { dp3: 0, dp5: -1, dp7: 0, type: 'majorThird' as const },      // M3 down (m6 up)
           // Derived 5-limit (often shown): m3 = P5 up + M3 down
           { dp3: 1, dp5: -1, dp7: 0, type: 'minorThird' as const },      // m3 up
           { dp3: -1, dp5: 1, dp7: 0, type: 'minorThird' as const },      // m3 down (M6 up)

           // 7-Limit Intervals (only if limit === 7)
           ...(limit === 7 ? [
               { dp3: 0, dp5: 0, dp7: 1, type: 'harmonicSeventh' as const }, // H7 up (ratio 7/4)
               { dp3: 0, dp5: 0, dp7: -1, type: 'harmonicSeventh' as const },// H7 down (ratio 4/7 or 8/7)
                // Add other 7-limit intervals if desired (e.g., Septimal Tritone 7/5)
                // { dp3: 0, dp5: -1, dp7: 1, type: 'septimalTritone' } // 7/5 = 7 * 1/5
           ] : [])
       ];

       neighbors.forEach(neighborInfo => {
           const targetKey = `${p3 + neighborInfo.dp3}_${p5 + neighborInfo.dp5}_${p7 + neighborInfo.dp7}`;
           const targetNode = nodeMap.get(targetKey);

           if (targetNode) {
                // Pass neighborInfo.type as the edgeType argument
               addEdge(sourceNode, targetNode, neighborInfo.type);
           }
       });
   });


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
    
