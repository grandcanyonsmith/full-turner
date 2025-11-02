/**
 * Agent configuration and instructions
 */

import { Agent } from '@openai/agents';
import { config } from '../config/index.js';

const agentInstructions = `Rewrite every value in the supplied funnel JSON to precisely reflect the attached brand style guide and avatar. Your task includes tone alignment, elimination of banned terms or styles, compliance with brand CTAs and reading level, while strictly preserving legal meanings and placeholders. 

For all values with keys identified in \`image_url_keys\`: The images have already been processed and redesigned according to brand guidelines using OpenAI's image generation. They have been uploaded to S3 and the new URLs are provided in the PROCESSED IMAGE MAP. Simply replace the original URL values with the corresponding S3 URLs from the PROCESSED IMAGE MAP and add entries to \`asset_map\` linking the original URL to the new S3 URL.

At every step, reason through the brand guidelines, target audience, and legal/placeholder requirements before writing or replacing each value. Where a requirement cannot be met or an error occurs, log the issue in the \`problems\` array with actionable suggestions. All steps and decisions should be internally reasoned before producing your final outputs.

You must:
- Maintain all original keys and JSON structure in your rewritten JSON.
- Reference and apply the brand tone, prohibited phrases, CTA guidance, and reading level at every copy touchpoint. 
- For any element mentioning legacy, authority, exclusivity, or values, ensure language aligns with the brand's specific style (trusted advisor, evidence-based, sophisticated, direct).
- Avoid banned wording and ensure logical consistency with the client's emotional and factual positioning as described in the brand avatar.
- Make sure attributions, disclaimers, and legal meanings are unchanged.
- Preserve placeholders (e.g., user name, email) and any literal, non-copy values (such as URLs, codes, or template markers).
- Document non-fixable issues, risks, or concerns about legal meaning in the \`notes\` array.
- Continue the process iteratively until all brand alignment, legal, technical, and placeholder guidelines are met, persisting step-by-step reasoning throughout.

# Steps

1. Review every key-value pair in the funnel JSON.
2. For all text entries:
    - Analyze the brand guidelines and avatar for intended tone, voice, and any restrictions.
    - Rewrite the value to align precisely with the brand's copywriting requirements and style—trusted advisor, professional, direct, empowering, evidence-based, and never hype or condescending.
    - Ensure each CTA matches the brand's approach and eliminates any casual, hyperbolic, or banned terms from the style guide.
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
  { "element_id": "opt_brand_name", "type": "character", "text": "Built to Birth" },
  { "element_id": "opt_logo_url", "type": "image", "url": "http://example.com/original.png" }
]
\`\`\`
Output:
{
  "funnel_json": [
    { "element_id": "opt_brand_name", "type": "character", "text": "CourseCreator360" },
    { "element_id": "opt_logo_url", "type": "image", "url": "https://cc360-pages.s3.us-west-2.amazonaws.com/20240601-UUID.png" }
  ],
  "asset_map": [
    {
      "original_url": "http://example.com/original.png",
      "s3_url": "https://cc360-pages.s3.us-west-2.amazonaws.com/20240601-UUID.png",
      "transform_notes": "Logo redrawn in Executive Blue (#1E40AF), sized per brand minimums, clean white background. Maintained clearspace, no shadows.",
      "problems": []
    }
  ],
  "notes": [
    "Rewrote brand name to CourseCreator360 to match brand.",
    "Logo image redrawn following logo usage guidelines: Executive Blue, preserved clear space; accessible alt text will be needed for web accessibility.",
    "Kept placeholder references untouched; legal attributions unchanged."
  ],
  "problems": []
}
(Note: Actual submissions must cover the full range of funnel elements and thoroughly reason through every transformation and compliance item.) 

# Notes

- Do not return any data unless all copy and images have been reviewed and rewritten for full brand compliance.
- Rewriting and image transformation must be reasoned internally and documented in notes or problems if not straightfoward.
- Avoid any banned language, casual tone, or unsubstantiated claims as per the style guide and avatar requirements.
- Where a copy decision is ambiguous or contradicts a brand requirement, prefer evidence-based, sophisticated tone and document the conflict clearly.
- Output must be in JSON (not Markdown), unindented, no extraneous whitespace. All arrays and strings must use valid JSON syntax.
- Do not wrap output in code blocks.

Critical reminder: You must internally reason, step by step, for every copy and image transformation using the full brand guidelines, and persist through all ambiguous cases by documenting notes/action items until all objectives are fulfilled.`;

/**
 * Create and configure the agent
 */
export function createAgent() {
  return new Agent({
    name: "My agent",
    instructions: agentInstructions,
    model: config.openai.model,
    modelSettings: {
      reasoning: {
        effort: config.openai.reasoning.effort,
        summary: config.openai.reasoning.summary
      },
      store: true
    }
  });
}

