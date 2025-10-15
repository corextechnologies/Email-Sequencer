"use strict";
/**
 * Email Formatting Utilities
 *
 * Ensures emails are properly formatted as HTML with good spacing and structure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureHtmlFormatting = ensureHtmlFormatting;
exports.wrapInEmailTemplate = wrapInEmailTemplate;
exports.formatEmailForSending = formatEmailForSending;
/**
 * Auto-format plain text to HTML if AI didn't follow HTML instructions
 * If text already has <p> tags, returns as-is
 */
function ensureHtmlFormatting(text) {
    if (!text || text.trim().length === 0) {
        return '<p>Email content is empty.</p>';
    }
    // If already has HTML paragraph tags, assume it's properly formatted
    if (text.includes('<p>') || text.includes('<P>')) {
        return text;
    }
    // Split by double newlines (paragraphs) or single newlines
    const lines = text.split('\n');
    const paragraphs = [];
    let currentParagraph = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') {
            // Empty line = end of paragraph
            if (currentParagraph) {
                paragraphs.push(currentParagraph);
                currentParagraph = '';
            }
        }
        else {
            // Add to current paragraph
            if (currentParagraph) {
                currentParagraph += ' ' + trimmed;
            }
            else {
                currentParagraph = trimmed;
            }
        }
    }
    // Don't forget the last paragraph
    if (currentParagraph) {
        paragraphs.push(currentParagraph);
    }
    // If no paragraphs detected, treat entire text as one paragraph
    if (paragraphs.length === 0) {
        paragraphs.push(text.trim());
    }
    // Wrap each paragraph in <p> tags
    return paragraphs.map(p => `<p>${p}</p>`).join('\n');
}
/**
 * Wrap email body in professional HTML template
 * Adds proper DOCTYPE, meta tags, and consistent styling
 */
function wrapInEmailTemplate(htmlBody, options) {
    const { includeUnsubscribeFooter = true, unsubscribeLink = '{{unsubscribe_link}}' } = options || {};
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <div style="font-size: 16px; line-height: 1.6; color: #333333;">
                ${htmlBody}
              </div>
            </td>
          </tr>
          ${includeUnsubscribeFooter ? `
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                This email was sent as part of our outreach campaign.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px;">
                <a href="${unsubscribeLink}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
/**
 * Ensure email body has proper paragraph formatting
 * This is the main function to call - applies both auto-formatting and template wrapper
 */
function formatEmailForSending(rawBody, options) {
    const { wrapInTemplate = false, ...otherOptions } = options || {}; // Default to false for simple text
    // Step 1: Ensure HTML formatting (add <p> tags if missing)
    const htmlFormatted = ensureHtmlFormatting(rawBody);
    // Step 2: Wrap in professional email template (optional)
    if (wrapInTemplate) {
        return wrapInEmailTemplate(htmlFormatted, otherOptions);
    }
    return htmlFormatted;
}
//# sourceMappingURL=emailFormatter.js.map