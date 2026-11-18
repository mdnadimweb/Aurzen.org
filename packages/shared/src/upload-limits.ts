// Leave room for multipart headers below Vercel's 4.5 MB request limit.
// Shared with the browser so oversized uploads fail before a network request.
export const maxImageMegabytes = 4;
export const maxImageBytes = maxImageMegabytes * 1024 * 1024;

// Smaller copies of uploaded photos (/media/<id>.webp?w=…) that phones and product cards can pick.
export const mediaWidths = [400, 800, 1200];
