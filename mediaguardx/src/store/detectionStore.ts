import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DetectionResult } from '../types';

interface DetectionState {
  history: DetectionResult[];
  addDetection: (detection: DetectionResult) => void;
  updateDetection: (id: string, updates: Partial<DetectionResult>) => void;
  getDetection: (id: string) => DetectionResult | undefined;
  clearHistory: () => void;
}

export const useDetectionStore = create<DetectionState>()(
  persist(
    (set, get) => ({
      history: [],
      addDetection: (detection) =>
        set((state) => ({
          history: [detection, ...state.history],
        })),
      updateDetection: (id, updates) =>
        set((state) => ({
          history: state.history.map((det) =>
            det.id === id ? { ...det, ...updates } : det
          ),
        })),
      getDetection: (id) => {
        const state = get();
        return state.history.find((det) => det.id === id);
      },
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'detection-storage',
    }
  )
);

