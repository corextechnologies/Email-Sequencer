type Context = {
    user: any;
    company: any;
    contact: any;
    campaign: any;
    step?: any;
};
export declare function renderTemplate(tpl: string, ctx: Context): string;
export declare function buildUnsubscribeHeaders({ mailto, http }: {
    mailto: string;
    http: string;
}): {
    'List-Unsubscribe': string;
};
/**
 * Production-ready tracking pixel that works across all email clients
 * Gmail-friendly approach using opacity and positioning instead of display:none
 */
export declare function trackingPixelHtml(url: string): string;
/**
 * Alternative: Visible micro-tracking pixel for maximum compatibility
 * More transparent and Gmail-friendly
 */
export declare function visibleTrackingPixel(url: string): string;
/**
 * Production-grade tracking pixel with client detection
 * Automatically chooses best method based on email client
 */
export declare function smartTrackingPixel(url: string, options?: {
    method?: 'invisible' | 'visible' | 'auto';
    userAgent?: string;
}): string;
export {};
//# sourceMappingURL=rendering.d.ts.map