'use client';

import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react'; // Importing standard icons for controls example
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IntonationLimit } from '@/types';

interface ControlsProps {
  currentLimit: IntonationLimit;
  onLimitChange: (limit: IntonationLimit) => void;
}

const Controls: FC<ControlsProps> = ({ currentLimit, onLimitChange }) => {
  return (
    <TooltipProvider>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 bg-card rounded-lg shadow-md border border-border">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground mr-2">Intonation Limit:</span>
                <Button
                    variant={currentLimit === 5 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onLimitChange(5)}
                    className={currentLimit === 5 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-foreground hover:bg-accent/10'}
                    aria-pressed={currentLimit === 5}
                >
                    Limit 5
                </Button>
                <Button
                    variant={currentLimit === 7 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onLimitChange(7)}
                     className={currentLimit === 7 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-foreground hover:bg-accent/10'}
                     aria-pressed={currentLimit === 7}
                >
                    Limit 7
                </Button>
            </div>

            <div className="hidden sm:flex items-center gap-4 ml-auto">
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <RotateCcw size={16} /> Rotate
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Click and drag to rotate</p>
                    </TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ZoomIn size={16} />/<ZoomOut size={16}/> Zoom
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Scroll wheel to zoom</p>
                    </TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Move size={16} /> Pan
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Right-click and drag to pan</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    </TooltipProvider>
  );
};

export default Controls;
