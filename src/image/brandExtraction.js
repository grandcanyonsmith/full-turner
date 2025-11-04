/**
 * Brand information extraction from brand guide
 */

/**
 * Extract brand information from brand guide (supports both JSON and text formats)
 * @param {string|Object} brandGuide - Brand guide text content or JSON object
 * @returns {Object} - Extracted brand information
 */
export function extractBrandInfo(brandGuide) {
  const brandInfo = {
    primaryColor: null,
    primaryColorHex: null,
    secondaryColor: null,
    secondaryColorHex: null,
    accentColor: null,
    accentColorHex: null,
    headingFont: null,
    bodyFont: null,
    visualStyle: []
  };

  // Handle null/undefined
  if (!brandGuide) {
    return brandInfo;
  }

  // Check if brandGuide is JSON object (new format)
  if (typeof brandGuide === 'object' && !Array.isArray(brandGuide) && brandGuide !== null) {
    const styleGuide = brandGuide.brandStyleGuide;
    
    if (styleGuide) {
      // Extract colors from JSON
      if (styleGuide.colors) {
        if (styleGuide.colors.primary) {
          brandInfo.primaryColor = styleGuide.colors.primary.name || null;
          brandInfo.primaryColorHex = styleGuide.colors.primary.hex || null;
        }
        if (styleGuide.colors.secondary) {
          brandInfo.secondaryColor = styleGuide.colors.secondary.name || null;
          brandInfo.secondaryColorHex = styleGuide.colors.secondary.hex || null;
        }
        if (styleGuide.colors.accent) {
          brandInfo.accentColor = styleGuide.colors.accent.name || null;
          brandInfo.accentColorHex = styleGuide.colors.accent.hex || null;
        }
      }
      
      // Extract typography from JSON
      if (styleGuide.typography) {
        if (styleGuide.typography.headings) {
          brandInfo.headingFont = styleGuide.typography.headings.font || null;
        }
        if (styleGuide.typography.body) {
          brandInfo.bodyFont = styleGuide.typography.body.font || null;
        }
      }
      
      // Extract visual style from JSON
      if (styleGuide.visualStyle && styleGuide.visualStyle.elements) {
        brandInfo.visualStyle = styleGuide.visualStyle.elements || [];
      } else if (styleGuide.visualStyle && styleGuide.visualStyle.approach) {
        brandInfo.visualStyle = [styleGuide.visualStyle.approach];
      }
    }
    
    // Only return early if we found styleGuide, otherwise fall through to string parsing
    if (styleGuide) {
      return brandInfo;
    }
  }
  
  // Fallback to text parsing (old format)
  // Only proceed if brandGuide is a string - otherwise return empty brandInfo
  if (typeof brandGuide !== 'string') {
    return brandInfo;
  }
  
  // Extract colors from Color Palette section
  // Match Primary color
  const primaryMatch = typeof brandGuide === 'string' ? brandGuide.match(/Primary:\s*([^(]+)\s*\(#([A-F0-9a-f]+)\)/i) : null;
  if (primaryMatch) {
    brandInfo.primaryColor = primaryMatch[1].trim();
    brandInfo.primaryColorHex = `#${primaryMatch[2].toUpperCase()}`;
  }
  
  // Match Secondary color
  const secondaryMatch = typeof brandGuide === 'string' ? brandGuide.match(/Secondary:\s*([^(]+)\s*\(#([A-F0-9a-f]+)\)/i) : null;
  if (secondaryMatch) {
    brandInfo.secondaryColor = secondaryMatch[1].trim();
    brandInfo.secondaryColorHex = `#${secondaryMatch[2].toUpperCase()}`;
  }
  
  // Match Accent color
  const accentMatch = typeof brandGuide === 'string' ? brandGuide.match(/Accent:\s*([^(]+)\s*\(#([A-F0-9a-f]+)\)/i) : null;
  if (accentMatch) {
    brandInfo.accentColor = accentMatch[1].trim();
    brandInfo.accentColorHex = `#${accentMatch[2].toUpperCase()}`;
  }
  
  // Extract typography
  const headingMatch = typeof brandGuide === 'string' ? brandGuide.match(/Headings:\s*([^\n]+)/i) : null;
  if (headingMatch) {
    brandInfo.headingFont = headingMatch[1].trim();
  }
  
  const bodyMatch = typeof brandGuide === 'string' ? brandGuide.match(/Body:\s*([^\n]+)/i) : null;
  if (bodyMatch) {
    brandInfo.bodyFont = bodyMatch[1].trim();
  }
  
  // Extract visual style keywords
  if (typeof brandGuide === 'string' && brandGuide.includes("Premium minimalism")) {
    brandInfo.visualStyle.push("Premium minimalism");
  }
  if (typeof brandGuide === 'string' && brandGuide.includes("clean backgrounds")) {
    brandInfo.visualStyle.push("clean backgrounds");
  }
  if (typeof brandGuide === 'string' && brandGuide.includes("data visualization")) {
    brandInfo.visualStyle.push("data visualization");
  }
  
  return brandInfo;
}

/**
 * Map dimensions to OpenAI supported sizes
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} - OpenAI size format ("1024x1024", "1536x1024", "1024x1536", or "auto")
 */
export function mapDimensionsToOpenAISize(width, height) {
  // OpenAI supports: "1024x1024", "1536x1024", "1024x1536", or "auto"
  if (!width || !height) {
    return "auto";
  }
  
  // Calculate aspect ratio
  const aspectRatio = width / height;
  
  // Square (within 10% tolerance)
  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
    return "1024x1024";
  }
  
  // Landscape (width > height)
  if (aspectRatio > 1.1) {
    return "1536x1024";
  }
  
  // Portrait (height > width)
  if (aspectRatio < 0.9) {
    return "1024x1536";
  }
  
  // Default to auto if we can't determine
  return "auto";
}

/**
 * Generate image prompt based on brand guide and element context
 * @param {string} imageType - Type of image ("logo", "hero", etc.)
 * @param {string} elementId - Element ID from template funnel
 * @param {boolean} transparentBg - Whether to use transparent background
 * @param {string} brandGuide - Brand guide text content
 * @param {Object} elementContext - Element context (alt_text, element_id, type)
 * @returns {string} - Generated prompt for OpenAI
 */
export function getImagePrompt(imageType, elementId, transparentBg, brandGuide, elementContext) {
  // Extract brand information from brand guide
  const brandInfo = extractBrandInfo(brandGuide);
  
  // Build color guidelines
  let colorGuidelines = "";
  if (brandInfo.primaryColor && brandInfo.primaryColorHex) {
    colorGuidelines += `${brandInfo.primaryColor} (${brandInfo.primaryColorHex}) for primary elements`;
  }
  if (brandInfo.secondaryColor && brandInfo.secondaryColorHex) {
    colorGuidelines += colorGuidelines ? `, ${brandInfo.secondaryColor} (${brandInfo.secondaryColorHex}) for accents` : `${brandInfo.secondaryColor} (${brandInfo.secondaryColorHex}) for accents`;
  }
  if (brandInfo.accentColor && brandInfo.accentColorHex) {
    colorGuidelines += colorGuidelines ? `, ${brandInfo.accentColor} (${brandInfo.accentColorHex}) for success indicators` : `${brandInfo.accentColor} (${brandInfo.accentColorHex}) for success indicators`;
  }
  
  // Build typography guidelines
  let typographyGuidelines = "";
  if (brandInfo.headingFont) {
    typographyGuidelines += `${brandInfo.headingFont} font for headings`;
  }
  if (brandInfo.bodyFont) {
    typographyGuidelines += typographyGuidelines ? `, ${brandInfo.bodyFont} for body text` : `${brandInfo.bodyFont} for body text`;
  }
  
  // Build visual style guidelines
  const visualStyleText = brandInfo.visualStyle.length > 0 ? brandInfo.visualStyle.join(", ") : "Premium minimalism style with clean backgrounds";
  
  const baseGuidelines = `CourseCreator360 brand guidelines: ${colorGuidelines}. ${visualStyleText}.${typographyGuidelines ? ` Typography: ${typographyGuidelines}.` : ""}`;
  
  const backgroundNote = transparentBg ? " Use transparent background." : " Use white/opaque background.";
  
  // Include element context if available
  let contextNote = "";
  if (elementContext && elementContext.alt_text) {
    contextNote = ` The image should depict: ${elementContext.alt_text}.`;
  }
  
  if (elementId.includes("logo")) {
    return `Redesign this logo to match CourseCreator360 brand. Use ${brandInfo.primaryColor || "primary brand color"} (${brandInfo.primaryColorHex || "#F6C1C0"}) wordmark.${backgroundNote} Maintain clear space equal to the '360' height. No shadows or effects. ${visualStyleText}.${contextNote} ${baseGuidelines}`;
  } else if (elementId.includes("hero") || elementId.includes("cta_image") || elementId.includes("image_url")) {
    return `Redesign this hero/CTA image with ${visualStyleText}.${backgroundNote} Use ${brandInfo.primaryColor || "primary brand color"} (${brandInfo.primaryColorHex || "#F6C1C0"}) for primary elements, ${brandInfo.secondaryColor || "secondary color"} (${brandInfo.secondaryColorHex || "#F59E0B"}) for accents, ${brandInfo.accentColor || "accent color"} (${brandInfo.accentColorHex || "#10B981"}) for success indicators. Include clean data visualization elements if appropriate.${typographyGuidelines ? ` Typography: ${typographyGuidelines} for any text included.` : ""}${contextNote} ${baseGuidelines}`;
  } else {
    return `Redesign this image to match CourseCreator360 brand guidelines.${backgroundNote}${contextNote} ${baseGuidelines}`;
  }
}

