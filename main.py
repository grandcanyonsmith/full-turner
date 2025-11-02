import { Agent, Runner, withTrace, user, setDefaultOpenAIKey, setTracingExportApiKey } from "@openai/agents";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import OpenAI from "openai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const myAgent = new Agent({
  name: "My agent",
  instructions: `Rewrite every value in the supplied funnel JSON to precisely reflect the attached brand style guide and avatar. Your task includes tone alignment, elimination of banned terms or styles, compliance with brand CTAs and reading level, while strictly preserving legal meanings and placeholders. 

For all values with keys identified in \`image_url_keys\`: The images have already been processed and redesigned according to brand guidelines using OpenAI's image generation. They have been uploaded to S3 and the new URLs are provided in the PROCESSED IMAGE MAP. Simply replace the original URL values with the corresponding S3 URLs from the PROCESSED IMAGE MAP and add entries to \`asset_map\` linking the original URL to the new S3 URL.

At every step, reason through the brand guidelines, target audience, and legal/placeholder requirements before writing or replacing each value. Where a requirement cannot be met or an error occurs, log the issue in the \`problems\` array with actionable suggestions. All steps and decisions should be internally reasoned before producing your final outputs.

You must:
- Maintain all original keys and JSON structure in your rewritten JSON.
- Reference and apply the brand tone, prohibited phrases, CTA guidance, and reading level at every copy touchpoint. 
- For any element mentioning legacy, authority, exclusivity, or values, ensure language aligns with the brand’s specific style (trusted advisor, evidence-based, sophisticated, direct).
- Avoid banned wording and ensure logical consistency with the client's emotional and factual positioning as described in the brand avatar.
- Make sure attributions, disclaimers, and legal meanings are unchanged.
- Preserve placeholders (e.g., user name, email) and any literal, non-copy values (such as URLs, codes, or template markers).
- Document non-fixable issues, risks, or concerns about legal meaning in the \`notes\` array.
- Continue the process iteratively until all brand alignment, legal, technical, and placeholder guidelines are met, persisting step-by-step reasoning throughout.

# Steps

1. Review every key-value pair in the funnel JSON.
2. For all text entries:
    - Analyze the brand guidelines and avatar for intended tone, voice, and any restrictions.
    - Rewrite the value to align precisely with the brand’s copywriting requirements and style—trusted advisor, professional, direct, empowering, evidence-based, and never hype or condescending.
    - Ensure each CTA matches the brand’s approach and eliminates any casual, hyperbolic, or banned terms from the style guide.
    - Check for compliance with reading level and audience sophistication.
    - Confirm that all placeholders and legal references are unchanged.
    - Document how the rewritten element now reflects the brand, reasoning through any trade-offs or ambiguities.
3. For image or URL entries in \`image_url_keys\`:
    - Images have already been processed and redesigned using OpenAI's image generation with gpt-image-1
    - Replace the original URL with the corresponding S3 URL from the PROCESSED IMAGE MAP
    - Add an entry in \`asset_map\` linking the original URL to the new S3 URL with transform notes
4. For any value or operation where strict compliance with the brief or brand is ambiguous or risky, document this in \`notes\` with details and recommended review actions.
5. Repeat steps with fresh reasoning until every field is fully compliant or an actionable note is provided.

# Output Format

Respond with a valid JSON object containing all of the following top-level fields:

- \`funnel_json\`: The fully rewritten funnel array, matching all brand, legal, and technical requirements and preserving all original keys.
- \`asset_map\`: An array of objects describing image transformations. Each object should include:
    - \`original_url\`: The image URL from the input.
    - \`s3_url\`: The new S3 public object URL.
    - \`transform_notes\`: How brand visual identity was implemented.
    - \`problems\`: Any issues encountered, with suggestions if relevant.
- \`notes\`: Array of strings, each noting a decision, ambiguity, preservation of legal meaning, or request for further clarification.
- \`problems\`: Array of strings, describing any errors, ambiguity, or technical issues, with explicit, actionable remediation steps.

Ensure all reasoning is completed before returning final results. All generated text must strictly align with the attached brand style guide, and transformation decisions must be clearly documented internally before producing the answer.

# Examples

Example (shortened for illustration; real response should cover all elements):

Input (excerpt):
\`\`\`
[
  { \"element_id\": \"opt_brand_name\", \"type\": \"character\", \"text\": \"Built to Birth\" },
  { \"element_id\": \"opt_logo_url\", \"type\": \"image\", \"url\": \"http://example.com/original.png\" }
]
\`\`\`
Output:
{
  \"funnel_json\": [
    { \"element_id\": \"opt_brand_name\", \"type\": \"character\", \"text\": \"CourseCreator360\" },
    { \"element_id\": \"opt_logo_url\", \"type\": \"image\", \"url\": \"https://cc360-pages.s3.us-west-2.amazonaws.com/20240601-UUID.png\" }
  ],
  \"asset_map\": [
    {
      \"original_url\": \"http://example.com/original.png\",
      \"s3_url\": \"https://cc360-pages.s3.us-west-2.amazonaws.com/20240601-UUID.png\",
      \"transform_notes\": \"Logo redrawn in Executive Blue (#1E40AF), sized per brand minimums, clean white background. Maintained clearspace, no shadows.\",
      \"problems\": []
    }
  ],
  \"notes\": [
    \"Rewrote brand name to CourseCreator360 to match brand.\",
    \"Logo image redrawn following logo usage guidelines: Executive Blue, preserved clear space; accessible alt text will be needed for web accessibility.\",
    \"Kept placeholder references untouched; legal attributions unchanged.\"
  ],
  \"problems\": []
}
(Note: Actual submissions must cover the full range of funnel elements and thoroughly reason through every transformation and compliance item.) 

# Notes

- Do not return any data unless all copy and images have been reviewed and rewritten for full brand compliance.
- Rewriting and image transformation must be reasoned internally and documented in notes or problems if not straightfoward.
- Avoid any banned language, casual tone, or unsubstantiated claims as per the style guide and avatar requirements.
- Where a copy decision is ambiguous or contradicts a brand requirement, prefer evidence-based, sophisticated tone and document the conflict clearly.
- Output must be in JSON (not Markdown), unindented, no extraneous whitespace. All arrays and strings must use valid JSON syntax.
- Do not wrap output in code blocks.

Critical reminder: You must internally reason, step by step, for every copy and image transformation using the full brand guidelines, and persist through all ambiguous cases by documenting notes/action items until all objectives are fulfilled.`,
  model: "gpt-5",
  modelSettings: {
    reasoning: {
      effort: "medium",
      summary: "auto"
    },
    store: true
  }
});

// WorkflowInput type: { input_as_text: string }

// Image processing functions
function extractImageUrls(templateFunnelJson) {
  const funnelData = JSON.parse(templateFunnelJson);
  const imageUrls = [];
  
  for (const item of funnelData) {
    if (item.type === "image" && item.url) {
      imageUrls.push({
        elementId: item.element_id,
        url: item.url,
        width: item.width,
        height: item.height,
        transparentBg: item.transparent_bg === true || item.transparent_bg === "true"
      });
    }
  }
  
  return imageUrls;
}

async function downloadImage(url) {
  console.log(`   Downloading image from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  return { buffer, base64 };
}

function extractBrandInfo(brandGuide) {
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
  
  // Extract colors from Color Palette section
  // Match Primary color
  const primaryMatch = brandGuide.match(/Primary:\s*([^(]+)\s*\(#([A-F0-9a-f]+)\)/i);
  if (primaryMatch) {
    brandInfo.primaryColor = primaryMatch[1].trim();
    brandInfo.primaryColorHex = `#${primaryMatch[2].toUpperCase()}`;
  }
  
  // Match Secondary color
  const secondaryMatch = brandGuide.match(/Secondary:\s*([^(]+)\s*\(#([A-F0-9a-f]+)\)/i);
  if (secondaryMatch) {
    brandInfo.secondaryColor = secondaryMatch[1].trim();
    brandInfo.secondaryColorHex = `#${secondaryMatch[2].toUpperCase()}`;
  }
  
  // Match Accent color
  const accentMatch = brandGuide.match(/Accent:\s*([^(]+)\s*\(#([A-F0-9a-f]+)\)/i);
  if (accentMatch) {
    brandInfo.accentColor = accentMatch[1].trim();
    brandInfo.accentColorHex = `#${accentMatch[2].toUpperCase()}`;
  }
  
  // Extract typography
  const headingMatch = brandGuide.match(/Headings:\s*([^\n]+)/i);
  if (headingMatch) {
    brandInfo.headingFont = headingMatch[1].trim();
  }
  
  const bodyMatch = brandGuide.match(/Body:\s*([^\n]+)/i);
  if (bodyMatch) {
    brandInfo.bodyFont = bodyMatch[1].trim();
  }
  
  // Extract visual style keywords
  if (brandGuide.includes("Premium minimalism")) {
    brandInfo.visualStyle.push("Premium minimalism");
  }
  if (brandGuide.includes("clean backgrounds")) {
    brandInfo.visualStyle.push("clean backgrounds");
  }
  if (brandGuide.includes("data visualization")) {
    brandInfo.visualStyle.push("data visualization");
  }
  
  return brandInfo;
}

function mapDimensionsToOpenAISize(width, height) {
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

function getImagePrompt(imageType, elementId, transparentBg, brandGuide, elementContext) {
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

async function generateImageWithOpenAI(originalImageBase64, imageType, elementId, apiKey, transparentBg, brandGuide, elementContext, width, height) {
  console.log(`   Generating image with OpenAI for ${elementId}...`);
  if (transparentBg) {
    console.log(`   Using transparent background`);
  }
  
  // Map dimensions to OpenAI size
  const size = mapDimensionsToOpenAISize(width, height);
  console.log(`   Dimensions: ${width}x${height} → OpenAI size: ${size}`);
  
  const client = new OpenAI({ apiKey });
  const prompt = getImagePrompt(imageType, elementId, transparentBg, brandGuide, elementContext);
  
  // Log the complete prompt
  console.log("\n" + "=".repeat(80));
  console.log("📝 IMAGE GENERATION PROMPT:");
  console.log("=".repeat(80));
  console.log(prompt);
  console.log("=".repeat(80) + "\n");
  
  try {
    // Use streaming to see reasoning and get partial images
    const stream = await client.responses.create({
      model: "gpt-5",
      input: [
      {
        role: "user",
        content: [
            {
              type: "input_image",
              image_url: `data:image/png;base64,${originalImageBase64}`
            },
          {
            type: "input_text",
              text: prompt
            }
          ]
        }
      ],
      text: {
        format: {
          type: "text"
        },
        verbosity: "medium"
      },
      reasoning: {
        effort: "medium",
        summary: "auto"
      },
      tools: [
        {
          type: "image_generation",
          model: "gpt-image-1",
          size: size,
          quality: transparentBg ? "medium" : "auto", // Use medium quality for transparency (works best per docs)
          output_format: "png",
          background: transparentBg ? "transparent" : "opaque",
          moderation: "auto",
          partial_images: 3
        }
      ],
      store: true,
      stream: true
    });
    
    let finalImageBuffer = null;
    
    let storedResponseId = null;
    const chunks = [];
    
    // Process stream events
    for await (const chunk of stream) {
      chunks.push(chunk);
      
      // Save response ID if provided
      if (chunk.response && chunk.response.id) {
        storedResponseId = chunk.response.id;
      }
      
      // Check for item chunks with part data
      if (chunk.part) {
        // Check if part is tool_use for image_generation
        if (chunk.part.type === 'tool_use') {
          if (chunk.part.name === 'image_generation' || chunk.part.name === 'image') {
            console.log(`\n   🔧 Found tool_use part: ${JSON.stringify(chunk.part, null, 2).substring(0, 400)}`);
            // The output might come in a later chunk or need to be fetched
          }
        }
        
        // Check if part is image
        if (chunk.part.type === 'image' || chunk.part.type === 'image_url') {
          console.log(`\n   🖼️  Found image part: ${JSON.stringify(chunk.part, null, 2).substring(0, 200)}`);
          const imageBuffer = await extractImageFromOutput(chunk.part.image_url || chunk.part.url || chunk.part);
          if (imageBuffer) {
            finalImageBuffer = imageBuffer;
            process.stdout.write(`\n   ✓ Image generated`);
            break;
          }
        }
      }
      
      // Check for item chunks
      if (chunk.item) {
        // Check for image_generation_call in item
        if (chunk.item.type === 'image_generation_call') {
          if (chunk.item.result) {
            try {
              const imageBuffer = Buffer.from(chunk.item.result, 'base64');
              if (imageBuffer.length > 0) {
                finalImageBuffer = imageBuffer;
                process.stdout.write(`\n   ✓ Image generated from stream`);
                break;
              }
            } catch (e) {
              // Continue checking other fields
            }
          }
        }
        
        if (chunk.item.type === 'tool_use' && (chunk.item.name === 'image_generation' || chunk.item.name === 'image')) {
          console.log(`\n   🔧 Found tool_use item: ${JSON.stringify(chunk.item, null, 2).substring(0, 400)}`);
          // Check for output in item
          if (chunk.item.output) {
            const imageBuffer = await extractImageFromOutput(chunk.item.output);
            if (imageBuffer) {
              finalImageBuffer = imageBuffer;
              process.stdout.write(`\n   ✓ Image generated`);
              break;
            }
          }
        }
        
        // Check item content for images
        if (chunk.item.content) {
          for (const contentItem of chunk.item.content) {
            if (contentItem.type === 'image' || contentItem.type === 'image_url') {
              const imageBuffer = await extractImageFromOutput(contentItem.image_url || contentItem.url);
              if (imageBuffer) {
                finalImageBuffer = imageBuffer;
                process.stdout.write(`\n   ✓ Image generated`);
                break;
              }
            }
          }
        }
      }
      
      // Check part for image_generation_call
      if (chunk.part) {
        if (chunk.part.type === 'image_generation_call') {
          if (chunk.part.result) {
            try {
              const imageBuffer = Buffer.from(chunk.part.result, 'base64');
              if (imageBuffer.length > 0) {
                finalImageBuffer = imageBuffer;
                process.stdout.write(`\n   ✓ Image generated from part`);
                break;
              }
            } catch (e) {
              // Continue checking
            }
          }
        }
      }
      
      // Log reasoning delta if available
      if (chunk.delta && chunk.delta.type === 'reasoning' && chunk.delta.content) {
        process.stdout.write(`\n   🤔 ${chunk.delta.content.substring(0, 100)}`);
      }
    }
    
    // If no image found in stream, try to fetch from stored response
    if (!finalImageBuffer && storedResponseId) {
      console.log(`\n   📥 Fetching stored response ${storedResponseId}...`);
      try {
        const storedResponse = await client.responses.retrieve(storedResponseId);
        
        // Check stored response for image
        if (storedResponse.output && storedResponse.output.length > 0) {
          for (const outputItem of storedResponse.output) {
            // Check for image_generation_call with result
            if (outputItem.type === 'image_generation_call') {
              console.log(`\n   🖼️  Found image_generation_call, status: ${outputItem.status}`);
              if (outputItem.result) {
                // result is base64 encoded image data
                try {
                  const imageBuffer = Buffer.from(outputItem.result, 'base64');
                  if (imageBuffer.length > 0) {
                    finalImageBuffer = imageBuffer;
                    process.stdout.write(`\n   ✓ Image found in image_generation_call result`);
                    break;
                  }
                } catch (e) {
                  console.log(`\n   ⚠️  Failed to decode result: ${e.message}`);
                }
              }
            }
            
            if (outputItem.type === 'image' || outputItem.type === 'image_url') {
              const imageBuffer = await extractImageFromOutput(outputItem.image_url || outputItem.url);
              if (imageBuffer) {
                finalImageBuffer = imageBuffer;
                process.stdout.write(`\n   ✓ Image found in stored response`);
                break;
              }
            }
          }
        }
        
        // Check for tool results in stored response
        if (storedResponse.output && Array.isArray(storedResponse.output)) {
          for (const outputItem of storedResponse.output) {
            if (outputItem.type === 'tool_use' && (outputItem.name === 'image_generation' || outputItem.name === 'image')) {
              if (outputItem.output) {
                const imageBuffer = await extractImageFromOutput(outputItem.output);
                if (imageBuffer) {
                  finalImageBuffer = imageBuffer;
                  process.stdout.write(`\n   ✓ Image found in tool output`);
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.log(`\n   ⚠️  Could not fetch stored response: ${err.message}`);
      }
    }
    
    if (!finalImageBuffer) {
      throw new Error("No image found in OpenAI stream response");
    }
    
    return finalImageBuffer;
  } catch (error) {
    console.error(`\n   Error generating image: ${error.message}`);
    throw error;
  }
}

async function extractImageFromOutput(output) {
  // Handle different output formats
  if (typeof output === 'string') {
    // Base64 data URL
    if (output.startsWith('data:image')) {
      const base64Data = output.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }
    // Direct URL
    if (output.startsWith('http://') || output.startsWith('https://')) {
      const imgResponse = await fetch(output);
      const arrayBuffer = await imgResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    // Base64 string without data URL prefix
    try {
      return Buffer.from(output, 'base64');
    } catch (e) {
      // Not base64, try as URL
      if (output.includes('http')) {
        const imgResponse = await fetch(output);
        const arrayBuffer = await imgResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }
  }
  
  // Handle object with url or data property
  if (typeof output === 'object' && output !== null) {
    if (output.url) {
      const imgResponse = await fetch(output.url);
      const arrayBuffer = await imgResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    if (output.data) {
      return await extractImageFromOutput(output.data);
    }
    if (output.image_url) {
      const url = output.image_url.startsWith('data:') 
        ? output.image_url 
        : `https://${output.image_url}`;
      if (url.startsWith('data:')) {
        const base64Data = url.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }
      const imgResponse = await fetch(url);
      const arrayBuffer = await imgResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  }
  
  return null;
}

function generateS3Key(originalUrl) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const uuid = randomUUID().split('-')[0];
  const extension = originalUrl.split('.').pop().split('?')[0] || 'png';
  return `${dateStr}-${uuid}.${extension}`;
}

async function uploadToS3(buffer, key, contentType = 'image/png') {
  console.log(`   Uploading to S3: ${key}...`);
  
  const s3Client = new S3Client({ region: 'us-west-2' });
  
  const command = new PutObjectCommand({
    Bucket: 'cc360-pages',
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
    CacheControl: 'max-age=31536000, public, immutable', // Cache permanently (no expiration)
    Metadata: {
      'permanent': 'true' // Mark as permanent asset
    }
  });
  
  await s3Client.send(command);
  
  const url = `https://cc360-pages.s3.us-west-2.amazonaws.com/${key}`;
  console.log(`   ✓ Uploaded to ${url}`);
  return url;
}

async function processImages(templateFunnelJson, brandGuide, apiKey) {
  console.log("\n🖼️  Processing images...");
  const imageUrls = extractImageUrls(templateFunnelJson);
  
  if (imageUrls.length === 0) {
    console.log("   No images found to process.");
    return { imageUrlKeys: [], imageMap: {} };
  }
  
  console.log(`   Found ${imageUrls.length} image(s) to process.\n`);
  
  // Parse template funnel to extract element context
  const funnelData = JSON.parse(templateFunnelJson);
  
  const imageMap = {};
  const imageUrlKeys = [];
  
  for (const imageInfo of imageUrls) {
    try {
      console.log(`📸 Processing ${imageInfo.elementId}...`);
      
      // Find matching element in template funnel to get context
      const element = funnelData.find(item => item.element_id === imageInfo.elementId);
      const elementContext = element ? {
        alt_text: element.alt_text || null,
        element_id: element.element_id,
        type: element.type
      } : null;
      
      // Download original image
      const { buffer, base64 } = await downloadImage(imageInfo.url);
      
      // Determine image type
      const imageType = imageInfo.elementId.includes("logo") ? "logo" : "hero";
      
      // Generate new image with OpenAI
      const generatedBuffer = await generateImageWithOpenAI(base64, imageType, imageInfo.elementId, apiKey, imageInfo.transparentBg, brandGuide, elementContext, imageInfo.width, imageInfo.height);
      
      // Upload to S3
      const s3Key = generateS3Key(imageInfo.url);
      const s3Url = await uploadToS3(generatedBuffer, s3Key, 'image/png');
      
      imageMap[imageInfo.elementId] = {
        originalUrl: imageInfo.url,
        s3Url: s3Url,
        width: imageInfo.width,
        height: imageInfo.height
      };
      
      imageUrlKeys.push(imageInfo.elementId);
      
      console.log(`   ✓ Completed ${imageInfo.elementId}\n`);
    } catch (error) {
      console.error(`   ✗ Failed to process ${imageInfo.elementId}: ${error.message}\n`);
      // Continue with other images even if one fails
    }
  }
  
  console.log(`✅ Image processing complete. Processed ${Object.keys(imageMap).length} image(s).\n`);
  return { imageUrlKeys, imageMap };
}

// Main code entrypoint
export const runWorkflow = async (workflow, apiKey) => {
  return await withTrace("New workflow", async () => {
    console.log("📂 Reading brand guide and template funnel files...");
    
    // Read brand guide and template funnel files
    // Handle both ES modules and CommonJS
    let currentDir;
    try {
      // Try ES modules first
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        currentDir = dirname(fileURLToPath(import.meta.url));
      } else if (typeof __dirname !== 'undefined') {
        // Fall back to CommonJS __dirname
        currentDir = __dirname;
      } else {
        // Fall back to process.cwd() if neither is available
        currentDir = process.cwd();
      }
    } catch {
      // If all else fails, use process.cwd()
      currentDir = process.cwd();
    }
    
    const brandGuidePath = join(currentDir, "brandguide.txt");
    const templateFunnelPath = join(currentDir, "template_funnel.json");
    
    console.log(`   Reading: ${brandGuidePath}`);
    const brandGuide = readFileSync(brandGuidePath, "utf-8");
    console.log(`   ✓ Brand guide loaded (${brandGuide.length} chars)`);
    
    console.log(`   Reading: ${templateFunnelPath}`);
    const templateFunnel = readFileSync(templateFunnelPath, "utf-8");
    console.log(`   ✓ Template funnel loaded (${templateFunnel.length} chars)\n`);
    
    // Process images before agent execution
    const { imageUrlKeys, imageMap } = await processImages(templateFunnel, brandGuide, apiKey);
    
    // Prepare image URL keys and mapping for agent
    const imageUrlKeysText = imageUrlKeys.length > 0 
      ? `\n\n=== IMAGE URL KEYS ===\n${JSON.stringify(imageUrlKeys, null, 2)}\n\n=== PROCESSED IMAGE MAP ===\n${JSON.stringify(imageMap, null, 2)}`
      : "";
    
    // Combine workflow input with brand guide, template funnel, and processed images
    const combinedInput = `${workflow.input_as_text}

=== BRAND STYLE GUIDE & AVATAR ===
${brandGuide}

=== TEMPLATE FUNNEL JSON ===
${templateFunnel}${imageUrlKeysText}

IMPORTANT: The images identified in image_url_keys have already been processed and redesigned according to brand guidelines. They have been uploaded to S3 and the URLs are provided in the PROCESSED IMAGE MAP above. Use these S3 URLs in your output instead of the original URLs.`;

    console.log(`📝 Preparing input (${combinedInput.length} total chars)...`);
    const conversationHistory = [
      user(combinedInput)
    ];
    
    console.log("📋 Setting up runner...");
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_69043945c8e48190bbe9d846914c78a80d481960236c2925"
      }
    });
    
    console.log("🚀 Starting agent execution...\n");
    console.log("=".repeat(80));
    
    let finalOutput = "";
    console.log("⏳ Processing... (this may take a moment)\n");
    
    const startTime = Date.now();
    
    // Show progress dots while processing
    const progressInterval = setInterval(() => {
      process.stdout.write(".");
    }, 2000); // Print a dot every 2 seconds
    
    try {
    const myAgentResultTemp = await runner.run(
      myAgent,
      [
        ...conversationHistory
      ]
    );
      
      clearInterval(progressInterval);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n\n✅ Completed in ${duration}s`);
      
      // Check if reasoning is available in the result
      if (myAgentResultTemp.reasoning) {
        console.log("\n" + "=".repeat(80));
        console.log("🤔 REASONING:");
        console.log("=".repeat(80));
        if (typeof myAgentResultTemp.reasoning === 'string') {
          console.log(myAgentResultTemp.reasoning);
        } else if (myAgentResultTemp.reasoning.content) {
          console.log(myAgentResultTemp.reasoning.content);
        } else {
          console.log(JSON.stringify(myAgentResultTemp.reasoning, null, 2));
        }
      }
      
      // Check newItems for reasoning
      if (myAgentResultTemp.newItems) {
        for (const item of myAgentResultTemp.newItems) {
          if (item.type === 'reasoning' || item.reasoning) {
            console.log("\n🤔 Reasoning found in items:");
            console.log(item.reasoning || item.content || item.text || JSON.stringify(item, null, 2));
          }
        }
      }

    if (!myAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }
      
      finalOutput = myAgentResultTemp.finalOutput;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }

    if (!finalOutput) {
        throw new Error("Agent result is undefined");
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Agent execution completed\n");

    const myAgentResult = {
      output_text: finalOutput
    };
    
    return myAgentResult;
  });
}

// Function to get Tracing Exporter API key from AWS Secrets Manager
function getTracingExporterKeyFromAWS() {
  try {
    // Try common secret names, or reuse OpenAI API key
    const secretNames = [
      "OPENAI_TRACING_API_KEY",
      "OpenAITracingAPIKey",
      "OPENAI_API_KEY_SECRET_NAME",
      "OpenAIAPIKey-dbc33f7701e74c42b278c0bf0dbc47d2",
      "OpenAIApiKey"
    ];
    
    for (const secretName of secretNames) {
      try {
        const result = execSync(
          `aws secretsmanager get-secret-value --secret-id ${secretName} --region us-west-2 --query SecretString --output text`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        ).trim();
        
        if (result && !result.includes('Error')) {
          return result;
        }
      } catch (e) {
        // Try next secret name
        continue;
      }
    }
    
    // If no specific tracing key found, return null to use OpenAI API key as fallback
    return null;
  } catch (error) {
    console.error("Error fetching tracing exporter API key:", error);
    return null;
  }
}

// Function to get OpenAI API key from AWS Secrets Manager
function getOpenAIKeyFromAWS() {
  try {
    // Try common secret names
    const secretNames = [
      "OPENAI_API_KEY_SECRET_NAME",
      "OpenAIAPIKey-dbc33f7701e74c42b278c0bf0dbc47d2",
      "OpenAIApiKey"
    ];
    
    for (const secretName of secretNames) {
      try {
        const result = execSync(
          `aws secretsmanager get-secret-value --secret-id ${secretName} --region us-west-2 --query SecretString --output text`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        ).trim();
        
        if (result && !result.includes('Error')) {
          return result;
        }
      } catch (e) {
        // Try next secret name
        continue;
      }
    }
    
    throw new Error("Could not retrieve OpenAI API key from AWS Secrets Manager");
  } catch (error) {
    console.error("Error fetching API key:", error);
    throw error;
  }
}

// Run the workflow if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  (async () => {
    try {
      console.log("Fetching OpenAI API key from AWS Secrets Manager...\n");
      const apiKey = getOpenAIKeyFromAWS();
      setDefaultOpenAIKey(apiKey);
      console.log("API key retrieved successfully.\n");
      
      // Configure tracing exporter
      console.log("Configuring tracing exporter...\n");
      const tracingKey = getTracingExporterKeyFromAWS();
      if (tracingKey) {
        setTracingExportApiKey(tracingKey);
        console.log("Tracing exporter API key configured.\n");
      } else {
        // Use OpenAI API key as fallback for tracing exporter
        setTracingExportApiKey(apiKey);
        console.log("Using OpenAI API key for tracing exporter.\n");
      }
      
      console.log("=".repeat(80));
      console.log("🚀 WORKFLOW START");
      console.log("=".repeat(80) + "\n");
      
      const result = await runWorkflow({ 
        input_as_text: "Please rewrite the funnel JSON according to the brand style guide and avatar provided." 
      }, apiKey);
      
      console.log("\n" + "=".repeat(80));
      console.log("📤 FINAL OUTPUT");
      console.log("=".repeat(80) + "\n");
      console.log(result.output_text);
      console.log("\n" + "=".repeat(80));
      console.log("✅ Workflow completed successfully!");
      console.log("=".repeat(80) + "\n");
    } catch (error) {
      console.error("Error running workflow:", error);
      process.exit(1);
    }
  })();
}
