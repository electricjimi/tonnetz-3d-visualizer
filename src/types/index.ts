// Defines shared types used across the application

export type IntonationLimit = 5 | 7;

// Define node and edge types
export interface TonnetzNode {
  id: string; // e.g., "C4", "G#5", etc.
  label: string; // The display label (e.g., "C", "G♯")
  noteName: string; // Full note name including octave (e.g., "C4")
  x: number;
  y: number;
  z: number;
  frequency: number; // Frequency in Hz for playback
  type: 'major' | 'minor' | 'dominant7' | 'other'; // Helps in styling or identification
}

export interface TonnetzEdge {
  source: TonnetzNode;
  target: TonnetzNode;
  type: 'perfectFifth' | 'majorThird' | 'minorThird' | 'minorSeventh'; // Type of interval connection
}
