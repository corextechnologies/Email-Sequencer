import Handlebars from 'handlebars';

type Context = {
	user: any;
	company: any;
	contact: any;
	campaign: any;
	step?: any; // Optional for simplified campaigns without steps
};

export function renderTemplate(tpl: string, ctx: Context): string {
	const compiled = Handlebars.compile(tpl || '');
	return compiled(ctx);
}

export function buildUnsubscribeHeaders({ mailto, http }: { mailto: string; http: string }) {
	// RFC 2369 List-Unsubscribe header with mailto and URL
	return {
		'List-Unsubscribe': `<${mailto}>, <${http}>`
	};
}

/**
 * Production-ready tracking pixel that works across all email clients
 * Gmail-friendly approach using opacity and positioning instead of display:none
 */
export function trackingPixelHtml(url: string): string {
	return `<img src="${url}" alt="Email engagement tracking" width="1" height="1" style="opacity:0;position:absolute;left:-9999px;top:-9999px;border:none;outline:none;max-width:1px;max-height:1px;" />`;
}

/**
 * Alternative: Visible micro-tracking pixel for maximum compatibility
 * More transparent and Gmail-friendly
 */
export function visibleTrackingPixel(url: string): string {
	return `<img src="${url}" alt="Email tracking" width="1" height="1" style="opacity:0.01;position:absolute;left:0;top:0;border:none;outline:none;max-width:1px;max-height:1px;" />`;
}

/**
 * Production-grade tracking pixel with client detection
 * Automatically chooses best method based on email client
 */
export function smartTrackingPixel(url: string, options?: {
	method?: 'invisible' | 'visible' | 'auto';
	userAgent?: string;
}): string {
	const { method = 'auto', userAgent = '' } = options || {};
	
	// Detect email client for optimal pixel choice
	const isGmail = userAgent.toLowerCase().includes('gmail') || 
	                userAgent.toLowerCase().includes('google');
	const isOutlook = userAgent.toLowerCase().includes('outlook') || 
	                  userAgent.toLowerCase().includes('microsoft');
	const isAppleMail = userAgent.toLowerCase().includes('apple') || 
	                   userAgent.toLowerCase().includes('mail.app');
	
	if (method === 'visible') {
		return visibleTrackingPixel(url);
	}
	
	if (method === 'invisible') {
		return trackingPixelHtml(url);
	}
	
	// Auto mode: Choose best method per client
	if (isGmail) {
		// Gmail prefers visible micro-pixels
		return visibleTrackingPixel(url);
	} else if (isOutlook) {
		// Outlook handles invisible pixels well
		return trackingPixelHtml(url);
	} else if (isAppleMail) {
		// Apple Mail with MPP - use invisible
		return trackingPixelHtml(url);
	} else {
		// Default: invisible for maximum compatibility
		return trackingPixelHtml(url);
	}
}


