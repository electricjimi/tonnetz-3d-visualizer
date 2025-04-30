// Defines shared types used across the application

export type IntonationLimit = 5 | 7;

// Define node and edge types
export interface TonnetzNode {
  id: string; // e.g., "node_0_0_0" representing C4
  p3: number; // Exponent for prime 3 (fifths)
  p5: number; // Exponent for prime 5 (major thirds)
  p7: number; // Exponent for prime 7 (harmonic sevenths)
  label: string; // The display label (e.g., "C", "G♯")
  noteName: string; // Full note name including octave (e.g., "C4")
  x: number;
  y: number;
  z: number;
  frequency: number; // Frequency in Hz for playback (calculated using JI)
  // Refined node types for better semantic meaning
  type: 'majorTriadComponent' | 'minorTriadComponent' | 'harmonicSeventhRelated' | 'other';
}

export interface TonnetzEdge {
  source: TonnetzNode;
  target: TonnetzNode;
  type: 'perfectFifth' | 'majorThird' | 'minorThird' | 'harmonicSeventh'; // Type of interval connection
}

    
