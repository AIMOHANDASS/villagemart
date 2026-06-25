export const parseCustomQuantityInput = (inputStr: string, productType: "solid" | "liquid" | "other" = "other") => {
  const numericValue = parseFloat(inputStr.replace(/[^0-9.]/g, "")) || 0;
  const cleanStr = inputStr.toLowerCase();

  if (productType === "solid") {
    if (cleanStr.includes("g") && !cleanStr.includes("k")) {
      return { rawWeight: numericValue / 1000, displayStr: `${numericValue}g`, quantityMultiplier: 1 };
    }
    return { rawWeight: numericValue, displayStr: `${numericValue} kg`, quantityMultiplier: 1 };
  }

  if (productType === "liquid") {
    if (cleanStr.includes("ml")) {
      return { rawWeight: numericValue / 1000, displayStr: `${numericValue}ml`, quantityMultiplier: 1 };
    }
    return { rawWeight: numericValue, displayStr: `${numericValue} ltr`, quantityMultiplier: 1 };
  }

  return { rawWeight: 1, displayStr: `${Math.round(numericValue)} qty`, quantityMultiplier: Math.max(1, Math.round(numericValue)) };
};

export const formatInitialDisplay = (item: any) => {
  const pt = item.product_type || "other";
  if (pt === "solid" || pt === "liquid") {
    // Determine current raw weight from the selectedSize/unit string and the cart quantity multiplier
    const sizeStr = item.selectedSize || item.unit || "1";
    const sizeVal = parseFloat(sizeStr.replace(/[^0-9.]/g, "")) || 1;
    let totalRaw = sizeVal * (item.quantity || 1);
    
    const lowerStr = sizeStr.toLowerCase();
    if ((lowerStr.includes("g") && !lowerStr.includes("k")) || lowerStr.includes("ml")) {
      totalRaw = (sizeVal / 1000) * (item.quantity || 1);
    }
    
    if (pt === "solid") {
      if (totalRaw < 1 && totalRaw > 0) return `${Math.round(totalRaw * 1000)}g`;
      return `${totalRaw} kg`;
    } else {
      if (totalRaw < 1 && totalRaw > 0) return `${Math.round(totalRaw * 1000)}ml`;
      return `${totalRaw} ltr`;
    }
  }
  return `${item.quantity || 1} qty`;
};
