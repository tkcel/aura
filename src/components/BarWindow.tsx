import React from 'react';

import SimpleFloatingButton from './SimpleFloatingButton';

export default function BarWindow() {
  return (
    <div className="h-full w-full bg-transparent flex items-center justify-center relative overflow-hidden">
      <SimpleFloatingButton />
    </div>
  );
}