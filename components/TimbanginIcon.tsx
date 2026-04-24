import React from 'react';

export const TimbanginIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Base/Pillar */}
      <path d="M12 21V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      
      {/* The Beam - slightly curved for a modern feel */}
      <path d="M4 10C4 10 8 8 12 8C16 8 20 10 20 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      
      {/* The Plates - represented as modern 'data nodes' */}
      <circle cx="4" cy="14" r="3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="20" cy="14" r="3" stroke="currentColor" strokeWidth="2"/>
      
      {/* The AI Sparkle at the pivot point */}
      <path 
        d="M12 4L13 7L16 8L13 9L12 12L11 9L8 8L11 7L12 4Z" 
        fill="currentColor" 
        className="animate-pulse"
      />
    </svg>
  );
};
