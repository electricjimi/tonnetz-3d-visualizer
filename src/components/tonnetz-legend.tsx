import React from 'react';

interface ColorLegendProps {
  noteColors: { [key: string]: number };
  edgeColors: { [key: string]: number };
}

const TonnetzLegend: React.FC<ColorLegendProps> = ({ noteColors, edgeColors }) => {
  return (
    <div className="absolute top-4 left-4 z-10 bg-background/70 p-2 rounded-md shadow-md text-foreground">
      <div className="flex items-center space-x-4">
        {Object.entries(noteColors).map(([label, color]) => (
          <div key={label} className="flex items-center space-x-2">
            <div
              className="w-6 h-6 rounded-sm"
              style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
            />
            <span className="text-sm">{label}</span>
          </div>
        ))}
        {Object.entries(edgeColors).map(([label, color]) => (
          <div key={label} className="flex items-center space-x-2">
            <div className="w-6 h-1 flex items-center justify-center overflow-hidden">
            <div
              className="w-full h-0.5"
              style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
            />
            </div>
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TonnetzLegend;