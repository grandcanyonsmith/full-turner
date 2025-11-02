/**
 * Funnel JSON to HTML Renderer
 * Converts funnel JSON output into HTML previews
 */

/**
 * Parse output text to extract funnel_json
 * @param {string} outputText - Raw output text from agent
 * @returns {Object|null} - Parsed JSON with funnel_json or null
 */
function parseOutput(outputText) {
    if (!outputText) return null;
    
    try {
        // Try to parse as JSON directly
        const parsed = JSON.parse(outputText);
        return parsed;
    } catch (e) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = outputText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[1]);
            } catch (e2) {
                // Try without code blocks
                const braceMatch = outputText.match(/\{[\s\S]*\}/);
                if (braceMatch) {
                    try {
                        return JSON.parse(braceMatch[0]);
                    } catch (e3) {
                        return null;
                    }
                }
            }
        }
        return null;
    }
}

/**
 * Get element value by element_id
 * @param {Array} funnelJson - Funnel JSON array
 * @param {string} elementId - Element ID to find
 * @returns {string|null} - Element value or null
 */
function getElement(funnelJson, elementId) {
    if (!funnelJson || !Array.isArray(funnelJson)) return null;
    const element = funnelJson.find(e => e.element_id === elementId);
    return element ? (element.text || element.url || element.value || '') : null;
}

/**
 * Get all elements with a prefix
 * @param {Array} funnelJson - Funnel JSON array
 * @param {string} prefix - Prefix to filter by
 * @returns {Object} - Object with element_id as keys (without prefix)
 */
function getElementsByPrefix(funnelJson, prefix) {
    if (!funnelJson || !Array.isArray(funnelJson)) return {};
    const elements = {};
    funnelJson.forEach(e => {
        if (e.element_id && e.element_id.startsWith(prefix)) {
            const key = e.element_id.replace(prefix, '');
            elements[key] = e;
        }
    });
    return elements;
}

/**
 * Get color from color elements
 * @param {Array} funnelJson - Funnel JSON array
 * @param {string} colorKey - Color key (e.g., 'opt_color_brand')
 * @returns {string} - Color value or default
 */
function getColor(funnelJson, colorKey) {
    return getElement(funnelJson, colorKey) || '#3498db';
}

/**
 * Render opt-in page HTML
 * @param {Array} funnelJson - Funnel JSON array
 * @returns {string} - HTML string
 */
function renderOptInPage(funnelJson) {
    const brandName = getElement(funnelJson, 'opt_brand_name') || 'Brand Name';
    const logoUrl = getElement(funnelJson, 'opt_logo_url');
    const metaTitle = getElement(funnelJson, 'opt_meta_title') || brandName;
    const heroImage = getElement(funnelJson, 'opt_image_url');
    const ctaImage = getElement(funnelJson, 'opt_cta_image_url');
    const formHeadline = getElement(funnelJson, 'opt_form_headline') || 'Enter Your Email';
    const formSubtext = getElement(funnelJson, 'opt_form_subtext') || '';
    const formButtonText = getElement(funnelJson, 'opt_form_button_text') || 'Submit';
    const formNamePlaceholder = getElement(funnelJson, 'opt_form_name_placeholder') || 'Your Name';
    const formEmailPlaceholder = getElement(funnelJson, 'opt_form_email_placeholder') || 'your@email.com';
    const privacyText = getElement(funnelJson, 'opt_privacy_text') || '';
    const privacyUrl = getElement(funnelJson, 'opt_privacy_url') || '#';

    const brandColor = getColor(funnelJson, 'opt_color_brand');
    const brandColor2 = getColor(funnelJson, 'opt_color_brand_2');
    const bgHero = getColor(funnelJson, 'opt_color_bg_hero');
    const bgSection = getColor(funnelJson, 'opt_color_bg_section');
    const textPrimary = getColor(funnelJson, 'opt_color_text_primary');
    const textSecondary = getColor(funnelJson, 'opt_color_text_secondary');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metaTitle}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: ${bgHero};
            color: ${textPrimary};
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            text-align: center;
            padding: 30px 0;
        }
        .logo {
            max-width: 200px;
            height: auto;
            margin-bottom: 20px;
        }
        .hero {
            text-align: center;
            padding: 40px 0;
        }
        .hero-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 20px 0;
        }
        .form-section {
            background: ${bgSection};
            padding: 40px;
            border-radius: 8px;
            max-width: 600px;
            margin: 40px auto;
        }
        .form-headline {
            font-size: 2em;
            margin-bottom: 10px;
            color: ${textPrimary};
        }
        .form-subtext {
            color: ${textSecondary};
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        input[type="text"],
        input[type="email"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 1em;
            margin-bottom: 15px;
        }
        input:focus {
            outline: none;
            border-color: ${brandColor};
        }
        .submit-btn {
            width: 100%;
            padding: 15px;
            background: ${brandColor};
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1.1em;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }
        .submit-btn:hover {
            background: ${brandColor2};
        }
        .cta-image {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
        }
        .privacy {
            text-align: center;
            margin-top: 20px;
            font-size: 0.85em;
            color: ${textSecondary};
        }
        .privacy a {
            color: ${brandColor};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            ${logoUrl ? `<img src="${logoUrl}" alt="${brandName} Logo" class="logo">` : `<h1>${brandName}</h1>`}
        </header>
        
        <div class="hero">
            ${heroImage ? `<img src="${heroImage}" alt="Hero" class="hero-image">` : ''}
        </div>

        <div class="form-section">
            <h2 class="form-headline">${formHeadline}</h2>
            ${formSubtext ? `<p class="form-subtext">${formSubtext}</p>` : ''}
            
            <form>
                <div class="form-group">
                    <input type="text" placeholder="${formNamePlaceholder}" required>
                </div>
                <div class="form-group">
                    <input type="email" placeholder="${formEmailPlaceholder}" required>
                </div>
                <button type="submit" class="submit-btn">${formButtonText}</button>
            </form>

            ${ctaImage ? `<img src="${ctaImage}" alt="CTA" class="cta-image">` : ''}
            
            ${privacyText ? `<div class="privacy">${privacyText} <a href="${privacyUrl}">Privacy Policy</a></div>` : ''}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Render thank you page HTML
 * @param {Array} funnelJson - Funnel JSON array
 * @returns {string} - HTML string
 */
function renderThankYouPage(funnelJson) {
    const headline = getElement(funnelJson, 'ty_headline') || 'Thank You!';
    const message = getElement(funnelJson, 'ty_message') || 'Check your email for next steps.';
    const fromName = getElement(funnelJson, 'ty_from_name') || '';
    const sectionHeading = getElement(funnelJson, 'ty_section_heading') || '';
    const inside1 = getElement(funnelJson, 'ty_inside_1') || '';
    const inside2 = getElement(funnelJson, 'ty_inside_2') || '';
    const inside3 = getElement(funnelJson, 'ty_inside_3') || '';

    const brandColor = getColor(funnelJson, 'opt_color_brand');
    const textPrimary = getColor(funnelJson, 'opt_color_text_primary');
    const textSecondary = getColor(funnelJson, 'opt_color_text_secondary');
    const bgSection = getColor(funnelJson, 'opt_color_bg_section');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: ${bgSection};
            color: ${textPrimary};
            line-height: 1.6;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            max-width: 600px;
            padding: 40px;
            text-align: center;
        }
        h1 {
            font-size: 2.5em;
            color: ${brandColor};
            margin-bottom: 20px;
        }
        .message {
            font-size: 1.2em;
            color: ${textSecondary};
            margin-bottom: 40px;
        }
        .section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-top: 30px;
            text-align: left;
        }
        .section h2 {
            color: ${textPrimary};
            margin-bottom: 20px;
        }
        .section ul {
            list-style: none;
            padding: 0;
        }
        .section li {
            padding: 10px 0;
            color: ${textSecondary};
            border-bottom: 1px solid #eee;
        }
        .section li:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${headline}</h1>
        <p class="message">${message}</p>
        ${fromName ? `<p>From ${fromName}</p>` : ''}
        
        ${sectionHeading ? `
        <div class="section">
            <h2>${sectionHeading}</h2>
            <ul>
                ${inside1 ? `<li>${inside1}</li>` : ''}
                ${inside2 ? `<li>${inside2}</li>` : ''}
                ${inside3 ? `<li>${inside3}</li>` : ''}
            </ul>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

/**
 * Render download page HTML
 * @param {Array} funnelJson - Funnel JSON array
 * @returns {string} - HTML string
 */
function renderDownloadPage(funnelJson) {
    const headline = getElement(funnelJson, 'dl_headline') || 'Download';
    const subtext = getElement(funnelJson, 'dl_subtext') || '';
    const buttonText = getElement(funnelJson, 'dl_button_text') || 'Download';
    const downloadUrl = getElement(funnelJson, 'dl_download_url') || '#';

    const brandColor = getColor(funnelJson, 'opt_color_brand');
    const textPrimary = getColor(funnelJson, 'opt_color_text_primary');
    const textSecondary = getColor(funnelJson, 'opt_color_text_secondary');
    const bgSection = getColor(funnelJson, 'opt_color_bg_section');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Download</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: ${bgSection};
            color: ${textPrimary};
            line-height: 1.6;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            max-width: 600px;
            padding: 40px;
            text-align: center;
        }
        h1 {
            font-size: 2.5em;
            color: ${brandColor};
            margin-bottom: 20px;
        }
        .subtext {
            font-size: 1.2em;
            color: ${textSecondary};
            margin-bottom: 40px;
        }
        .download-btn {
            display: inline-block;
            padding: 20px 40px;
            background: ${brandColor};
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 1.2em;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .download-btn:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${headline}</h1>
        ${subtext ? `<p class="subtext">${subtext}</p>` : ''}
        <a href="${downloadUrl}" class="download-btn">${buttonText}</a>
    </div>
</body>
</html>`;
}

/**
 * Render email preview HTML
 * @param {Array} funnelJson - Funnel JSON array
 * @returns {string} - HTML string
 */
function renderEmailPreview(funnelJson) {
    const subject = getElement(funnelJson, 'email_subject') || 'Email Subject';
    const fromName = getElement(funnelJson, 'email_from_name') || '';
    const headline = getElement(funnelJson, 'email_headline') || '';
    const body = getElement(funnelJson, 'email_body') || '';
    const ctaText = getElement(funnelJson, 'email_cta_text') || '';
    const ctaUrl = getElement(funnelJson, 'email_cta_url') || '#';
    const closing = getElement(funnelJson, 'email_closing') || '';
    const signature = getElement(funnelJson, 'email_signature') || '';
    const footerText = getElement(funnelJson, 'email_footer_text') || '';

    const brandColor = getColor(funnelJson, 'opt_color_brand');
    const textPrimary = getColor(funnelJson, 'opt_color_text_primary');
    const textSecondary = getColor(funnelJson, 'opt_color_text_secondary');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: ${textPrimary};
            line-height: 1.6;
            padding: 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .email-header {
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .email-subject {
            font-size: 1.2em;
            font-weight: 600;
            color: ${textPrimary};
            margin-bottom: 10px;
        }
        .email-from {
            color: ${textSecondary};
            font-size: 0.9em;
        }
        .email-headline {
            font-size: 1.8em;
            color: ${textPrimary};
            margin-bottom: 20px;
        }
        .email-body {
            color: ${textPrimary};
            margin-bottom: 20px;
        }
        .email-body p {
            margin-bottom: 15px;
        }
        .email-cta {
            margin: 30px 0;
        }
        .email-cta a {
            display: inline-block;
            padding: 15px 30px;
            background: ${brandColor};
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
        }
        .email-closing {
            color: ${textPrimary};
            margin-bottom: 20px;
        }
        .email-signature {
            color: ${textPrimary};
            margin-bottom: 30px;
        }
        .email-footer {
            border-top: 1px solid #eee;
            padding-top: 20px;
            margin-top: 30px;
            color: ${textSecondary};
            font-size: 0.85em;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="email-subject">${subject}</div>
            ${fromName ? `<div class="email-from">From: ${fromName}</div>` : ''}
        </div>
        
        ${headline ? `<h1 class="email-headline">${headline}</h1>` : ''}
        
        <div class="email-body">
            ${body}
        </div>
        
        ${ctaText ? `
        <div class="email-cta">
            <a href="${ctaUrl}">${ctaText}</a>
        </div>
        ` : ''}
        
        ${closing ? `<div class="email-closing">${closing}</div>` : ''}
        
        ${signature ? `<div class="email-signature">${signature}</div>` : ''}
        
        ${footerText ? `<div class="email-footer">${footerText}</div>` : ''}
    </div>
</body>
</html>`;
}

/**
 * Render funnel JSON to HTML based on tab type
 * @param {Array} funnelJson - Funnel JSON array
 * @param {string} tabType - Tab type ('opt', 'ty', 'dl', 'email')
 * @returns {string} - HTML string
 */
function renderFunnelHTML(funnelJson, tabType) {
    if (!funnelJson || !Array.isArray(funnelJson)) {
        return '<html><body><p>No funnel data available</p></body></html>';
    }

    switch (tabType) {
        case 'opt':
            return renderOptInPage(funnelJson);
        case 'ty':
            return renderThankYouPage(funnelJson);
        case 'dl':
            return renderDownloadPage(funnelJson);
        case 'email':
            return renderEmailPreview(funnelJson);
        default:
            return '<html><body><p>Unknown tab type</p></body></html>';
    }
}

