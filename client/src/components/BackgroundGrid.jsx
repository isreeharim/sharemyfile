import React from 'react';

export const BackgroundGrid = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
      {/* Editorial Hairline architectural grid */}
      <div
        className="absolute inset-0 text-black dark:text-white opacity-[0.035] dark:opacity-[0.045] bg-architectural-grid"
      />
    </div>
  );
};
