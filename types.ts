export interface PauseSession {
  timestamp: number;
  duration: number; // 0 for short taps
}

export interface PauseState {
  lastPause: number | null;
  history: PauseSession[];
}