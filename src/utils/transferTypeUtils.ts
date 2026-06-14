export const getTransferTypeColor = (transferType: any): string => {
  // Use custom color if provided, otherwise generate based on name
  if (transferType.color) {
    return transferType.color;
  }

  // Specific color mapping for the 4 defined transfer types
  const colorMap: Record<string, string> = {
    "on loan": "#F59E0B", // Amber - temporary nature
    demo: "#3B82F6", // Blue - professional/presentation
    testing: "#EF4444", // Red - caution/testing
    "r&d use": "#8B5CF6", // Purple - innovation/research
    // Fallback colors for other types
    purchase: "#10B981", // Green
    sale: "#EF4444", // Red
    transfer: "#3B82F6", // Blue
    loan: "#F59E0B", // Amber
    return: "#8B5CF6", // Purple
    maintenance: "#6B7280", // Gray
    repair: "#F97316", // Orange
    disposal: "#DC2626", // Red-600
    allocation: "#059669", // Emerald
    assignment: "#0D9488", // Teal
    default: "#6B7280", // Gray
  };

  const typeName = transferType.name.toLowerCase();
  return colorMap[typeName] || colorMap.default;
};

export const getTransferTypeIcon = (transferType: any): string => {
  // Use custom icon if provided, otherwise generate based on name
  if (transferType.icon) {
    return transferType.icon;
  }

  // Specific icon mapping for the 4 defined transfer types
  const iconMap: Record<string, string> = {
    "on loan": "time-outline", // Clock for temporary
    demo: "tv-outline", // Display for demonstration
    testing: "flask-outline", // Flask for testing
    "r&d use": "bulb-outline", // Lightbulb for research & development
    // Fallback icons for other types
    purchase: "bag-add",
    sale: "bag-remove",
    transfer: "arrow-forward-circle",
    loan: "time",
    return: "arrow-back-circle",
    maintenance: "construct",
    repair: "build",
    disposal: "trash",
    allocation: "share",
    assignment: "person-add",
    default: "swap-horizontal",
  };

  const typeName = transferType.name.toLowerCase();
  return iconMap[typeName] || iconMap.default;
};

export const getTransferTypeBadgeStyle = (transferType: any) => {
  const color = getTransferTypeColor(transferType);

  // Convert hex to RGB for background opacity
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 107, g: 114, b: 128 }; // Default gray
  };

  const rgb = hexToRgb(color);

  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
    textColor: color,
  };
};

// Helper function to get transfer type description with formatting
export const getTransferTypeDescription = (transferType: any): string => {
  // Use the provided description or generate a default one
  if (transferType.description) {
    return transferType.description;
  }

  // Default descriptions for the 4 defined transfer types
  const descriptionMap: Record<string, string> = {
    "on loan":
      "Temporarily transferred to another department, customer, or user for evaluation or use, with the expectation of return.",
    demo: "Assigned for demonstration purposes, such as for sales presentations or exhibitions. Not for resale.",
    testing:
      "Used internally for software or hardware testing. May be modified or subject to stress/use conditions.",
    "r&d use":
      "Allocated to research and development teams for experimentation or prototyping purposes.",
  };

  const typeName = transferType.name.toLowerCase();
  return descriptionMap[typeName] || "Standard transfer type";
};

// Helper function to check if a transfer type is temporary
export const isTemporaryTransferType = (transferType: any): boolean => {
  const temporaryTypes = ["on loan", "demo", "testing", "r&d use"];
  return temporaryTypes.includes(transferType.name.toLowerCase());
};

// Helper function to get transfer type priority (for sorting)
export const getTransferTypePriority = (transferType: any): number => {
  const priorityMap: Record<string, number> = {
    "on loan": 1,
    demo: 2,
    testing: 3,
    "r&d use": 4,
    // Other types get lower priority
    purchase: 10,
    sale: 11,
    transfer: 12,
  };

  const typeName = transferType.name.toLowerCase();
  return priorityMap[typeName] || 99;
};
