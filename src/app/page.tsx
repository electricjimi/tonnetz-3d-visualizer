'use client';

import type { FC } from 'react';
import { useState } from 'react';
import TonnetzVisualizer from '@/components/tonnetz-visualizer';
import Controls from '@/components/controls';
import type { IntonationLimit } from '@/types';

const Home: FC = () => {
  const [limit, setLimit] = useState<IntonationLimit>(5);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground p-4">
      <h1 className="text-3xl font-bold mb-4 text-center text-foreground">Tonnetz Visualizer</h1>
      <div className="relative w-full h-[calc(100vh-200px)] max-w-4xl rounded-lg shadow-lg overflow-hidden border border-border">
         <TonnetzVisualizer limit={limit} />
      </div>
       <div className="mt-6 w-full max-w-4xl">
        <Controls currentLimit={limit} onLimitChange={setLimit} />
      </div>
    </div>
  );
};

export default Home;
