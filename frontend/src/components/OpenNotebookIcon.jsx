import React from 'react';

const OpenNotebookIcon = ({ className = "w-6 h-6", color = "white" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shadow/Depth effect */}
      <ellipse cx="12" cy="20" rx="8" ry="2" fill="rgba(0,0,0,0.1)" opacity="0.3"/>
      
      {/* Main notebook cover with gradient effect */}
      <path 
        d="M4 3C4 2.44772 4.44772 2 5 2H19C19.5523 2 20 2.44772 20 3V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V3Z" 
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      
      {/* Left page with subtle texture */}
      <path 
        d="M5 3V21H12V3H5Z" 
        fill={color}
        fillOpacity="0.08"
        stroke={color}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      
      {/* Right page with subtle texture */}
      <path 
        d="M12 3V21H19V3H12Z" 
        fill={color}
        fillOpacity="0.08"
        stroke={color}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      
      {/* Binding/spine with enhanced look */}
      <path 
        d="M5 3L5 21" 
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      
      {/* Enhanced text lines on left page */}
      <line x1="6.5" y1="6" x2="10.5" y2="6" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
      <line x1="6.5" y1="8" x2="11" y2="8" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
      <line x1="6.5" y1="10" x2="9.5" y2="10" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
      <line x1="6.5" y1="12" x2="10" y2="12" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
      
      {/* Enhanced text lines on right page */}
      <line x1="13.5" y1="6" x2="17.5" y2="6" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
      <line x1="13.5" y1="8" x2="18" y2="8" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
      <line x1="13.5" y1="10" x2="16.5" y2="10" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
      <line x1="13.5" y1="12" x2="17" y2="12" stroke={color} strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
      
      {/* Decorative bullet points */}
      <circle cx="7" cy="14" r="0.8" fill={color} opacity="0.5"/>
      <circle cx="14" cy="14" r="0.8" fill={color} opacity="0.5"/>
      
      {/* Page numbers */}
      <text x="8.5" y="18" fontSize="2" fill={color} opacity="0.4" textAnchor="middle">1</text>
      <text x="15.5" y="18" fontSize="2" fill={color} opacity="0.4" textAnchor="middle">2</text>
      
      {/* Elegant page curl effect */}
      <path 
        d="M19 3C19 2.44772 18.5523 2 18 2H19C19.5523 2 20 2.44772 20 3V5C20 4.44772 19.5523 4 19 4V3Z" 
        fill={color}
        fillOpacity="0.12"
        stroke={color}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      
      {/* Subtle highlight on top edge */}
      <line x1="5" y1="3" x2="19" y2="3" stroke={color} strokeWidth="0.5" opacity="0.3"/>
      
      {/* Corner accent */}
      <path 
        d="M19 3L21 1L21 3L19 3Z" 
        fill={color}
        fillOpacity="0.2"
      />
    </svg>
  );
};

export default OpenNotebookIcon;
