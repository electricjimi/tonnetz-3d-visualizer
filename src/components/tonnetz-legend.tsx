import React from 'react';
import type { TonnetzEdge } from '@/types'; // Import TonnetzEdge for type safety

interface ColorLegendProps {
  noteColors: { [key: string]: number };
  edgeColors: { [key: string]: number }; // Use interval names as keys
}

const TonnetzLegend: React.FC<ColorLegendProps> = ({ noteColors, edgeColors }) => {
   const formatColor = (hex: number): string => {
    // Ensure hex is a valid number and handle potential NaN
    if (isNaN(hex)) return '#808080'; // Default to gray if color is invalid
    return `#${hex.toString(16).padStart(6, '0')}`;
  };

  return (
    <div className="absolute top-4 left-4 z-10 bg-card/80 backdrop-blur-sm p-3 rounded-lg shadow-md border border-border text-card-foreground max-w-xs sm:max-w-sm md:max-w-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div>
                 <h4 className="text-sm font-semibold mb-1.5 text-card-foreground">Notes:</h4>
                 <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    {Object.entries(noteColors).map(([label, color]) => (
                      <div key={label} className="flex items-center space-x-1.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20" // Use light border for contrast on dark bg
                          style={{ backgroundColor: formatColor(color) }}
                        />
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                    ))}
                 </div>
            </div>
            <div className="mt-2 sm:mt-0">
                <h4 className="text-sm font-semibold mb-1.5 text-card-foreground">Intervals:</h4>
                 <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    {Object.entries(edgeColors).map(([label, color]) => (
                       <div key={label} className="flex items-center space-x-1.5">
                        <div className="w-4 h-2 flex items-center justify-center">
                           <div
                              className="w-full h-[2px] rounded" // Style the line itself
                              style={{ backgroundColor: formatColor(color) }}
                            />
                        </div>
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                    ))}
                 </div>
            </div>
        </div>
    </div>
  );
};

export default TonnetzLegend;
