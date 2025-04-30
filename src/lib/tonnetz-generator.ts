import type { IntonationLimit, TonnetzNode, TonnetzEdge } from '@/types';

// --- Constants ---
const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const A4_FREQUENCY = 440.0;
const A4_MIDI_NOTE = 69; // MIDI note number for A4
const C0_MIDI_NOTE = 12; // MIDI note number for C0

// --- Helper Functions ---

// Calculates MIDI note number from offsets (simple ET approximation for structure)
// i = fifths, j = major thirds, k = minor sevenths (optional)
// Reference: C4 (MIDI 60) at (0,0,0)
function calculateMidiNote(i: number, j: number, k: number = 0, limit: IntonationLimit): number {
  const C4_MIDI = 60;
  // Use ET semitone steps for simplicity in mapping structure to MIDI
  const fifthSemitones = 7; // P5
  const thirdSemitones = 4; // M3
  const seventhSemitones = 10; // m7 (approx. for 7/4)

  let midiNote = C4_MIDI + (i * fifthSemitones) + (j * thirdSemitones);
  if (limit === 7) {
    midiNote += (k * seventhSemitones);
  }
  return midiNote;
}

// Converts MIDI note number to frequency (Equal Temperament)
function midiToFrequency(midiNote: number): number {
  return A4_FREQUENCY * Math.pow(2, (midiNote - A4_MIDI_NOTE) / 12);
}

// Converts MIDI note number to note name (e.g., "C#4")
function midiToNoteName(midiNote: number, useSharps: boolean = true): string {
    const octave = Math.floor(midiNote / 12) - 1; // Adjust octave (MIDI C4 is octave 4)
    const noteIndex = midiNote % 12;
    const noteName = useSharps ? NOTE_NAMES_SHARP[noteIndex] : NOTE_NAMES_FLAT[noteIndex];
    return `${noteName}${octave}`;
}

// Gets the display label (without octave)
function getNoteLabel(midiNote: number, useSharps: boolean = true): string {
    const noteIndex = (midiNote % 12 + 12) % 12; // Ensure positive index
    return useSharps ? NOTE_NAMES_SHARP[noteIndex] : NOTE_NAMES_FLAT[noteIndex];
}

// --- Main Generation Function ---

export function generateTonnetzData(limit: IntonationLimit): { nodes: TonnetzNode[], edges: TonnetzEdge[] } {
  const nodes: TonnetzNode[] = [];
  const edges: TonnetzEdge[] = [];
  const nodeMap = new Map<string, TonnetzNode>(); // Use MIDI note number as key for uniqueness check

  const addNode = (midiNote: number, i: number, j: number, k: number, x: number, y: number, z: number, type: TonnetzNode['type']) => {
      const nodeId = `node_${i}_${j}_${k}`; // Keep spatial ID
      const nodeKey = midiNote.toString(); // Use MIDI for uniqueness map key

      if (!nodeMap.has(nodeKey)) {
        const frequency = midiToFrequency(midiNote);
        const noteName = midiToNoteName(midiNote, true); // Use sharps for consistency
        const label = getNoteLabel(midiNote, true);

        const newNode: TonnetzNode = { id: nodeId, label, noteName, x, y, z, frequency, type };
        nodes.push(newNode);
        nodeMap.set(nodeKey, newNode); // Map MIDI note to node data
      }
      return nodeMap.get(nodeKey)!;
  };

  const addEdge = (sourceNode: TonnetzNode | undefined, targetNode: TonnetzNode | undefined, type: TonnetzEdge['type']) => {
    if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
        // Avoid duplicate edges (check both directions using node IDs)
        const exists = edges.some(e =>
            (e.source.id === sourceNode.id && e.target.id === targetNode.id) ||
            (e.source.id === targetNode.id && e.target.id === sourceNode.id)
        );
        if (!exists) {
            edges.push({ source: sourceNode, target: targetNode, type });
        }
    }
  };


  // --- Tonnetz Generation Logic ---
  const range = 3; // How far out to generate from the center (adjust as needed)
  const scaleFactor = 2.5; // Spacing between nodes

  for (let i = -range; i <= range; i++) { // Fifths axis
    for (let j = -range; j <= range; j++) { // Thirds axis

        // Limit 5 base node
        const midiBase = calculateMidiNote(i, j, 0, 5);
        const x = (i * Math.sqrt(3) / 2 + j * Math.sqrt(3) / 2) * scaleFactor;
        const y = (i * 1 / 2 - j * 1 / 2) * scaleFactor;
        const z = 0;
        // Assign type based on structure (e.g., relative major/minor feel)
        // This is heuristic; Tonnetz nodes are just pitches.
        const nodeType: TonnetzNode['type'] = ((i + j) % 2 === 0) ? 'major' : 'minor';
        const currentNode = addNode(midiBase, i, j, 0, x, y, z, nodeType);

        // Connect Neighbors (Limit 5)
        const fifthNeighborMidi = calculateMidiNote(i + 1, j, 0, 5);
        const majorThirdNeighborMidi = calculateMidiNote(i, j + 1, 0, 5);
        const minorThirdNeighborMidi = calculateMidiNote(i + 1, j - 1, 0, 5); // P5 + m3 = M3 down

        addEdge(currentNode, nodeMap.get(fifthNeighborMidi.toString()), 'perfectFifth');
        addEdge(currentNode, nodeMap.get(majorThirdNeighborMidi.toString()), 'majorThird');
        addEdge(currentNode, nodeMap.get(minorThirdNeighborMidi.toString()), 'minorThird'); // Representing the M3 downwards connection

        // Limit 7 additions
        if (limit === 7) {
             // Generate nodes related to the 7th harmonic
             // Simple approach: Offset in z, represent dominant quality
             for (let k = -1; k <= 1; k += 2) { // Could represent +/- 7th relationship
                 if (Math.abs(i) + Math.abs(j) + Math.abs(k) <= range) { // Keep within overall range
                    const midi7 = calculateMidiNote(i, j, k, 7);
                    const z_7 = k * scaleFactor * 1.2; // Arbitrary Z offset for 7th dimension
                    const x_7 = x;
                    const y_7 = y;
                    const seventhNodeType: TonnetzNode['type'] = 'dominant7'; // Heuristic type

                    const seventhNode = addNode(midi7, i, j, k, x_7, y_7, z_7, seventhNodeType);

                    // Connect the 5-limit node to its 7-limit 'variant'
                    // The interval isn't strictly m7 in ET if based on C4(0,0,0) and C7(0,0,1)
                    addEdge(currentNode, seventhNode, 'minorSeventh');

                    // Connect neighbors within the 7-limit 'layer'
                    const fifthNeighbor7Midi = calculateMidiNote(i + 1, j, k, 7);
                    const majorThirdNeighbor7Midi = calculateMidiNote(i, j + 1, k, 7);

                    addEdge(seventhNode, nodeMap.get(fifthNeighbor7Midi.toString()), 'perfectFifth');
                    addEdge(seventhNode, nodeMap.get(majorThirdNeighbor7Midi.toString()), 'majorThird');

                    // Add connections between different k-layers if needed (more complex topology)
                    // Example: Connect (i,j,k) to (i',j', -k) based on some interval logic
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
