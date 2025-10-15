/**
 * Email Formatting Utilities
 *
 * Ensures emails are properly formatted as HTML with good spacing and structure
 */
/**
 * Auto-format plain text to HTML if AI didn't follow HTML instructions
 * If text already has <p> tags, returns as-is
 */
export declare function ensureHtmlFormatting(text: string): string;
/**
 * Wrap email body in professional HTML template
 * Adds proper DOCTYPE, meta tags, and consistent styling
 */
export declare function wrapInEmailTemplate(htmlBody: string, options?: {
    includeUnsubscribeFooter?: boolean;
    unsubscribeLink?: string;
}): string;
/**
 * Ensure email body has proper paragraph formatting
 * This is the main function to call - applies both auto-formatting and template wrapper
 */
export declare function formatEmailForSending(rawBody: string, options?: {
    wrapInTemplate?: boolean;
    includeUnsubscribeFooter?: boolean;
    unsubscribeLink?: string;
}): string;
//# sourceMappingURL=emailFormatter.d.ts.map