function validText(value, maxLength) {
    return typeof value === 'string' && value.trim() === value &&
        value.length > 0 && value.length <= maxLength &&
        !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}

function safeLink(value) {
    if (typeof value !== 'string' || value.trim() !== value ||
        value.length < 1 || value.length > 2048 || /[\u0000-\u0020\\]/.test(value)) return false;
    if (value.startsWith('/') && !value.startsWith('//')) return true;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
        return false;
    }
}

export function publicBlock(type, content, position) {
    if (!content || typeof content !== 'object' || Array.isArray(content) ||
        !Number.isInteger(position) || position < 0 || position > 9999) return null;
    const keys = Object.keys(content);
    if (type === 'heading' && keys.length === 2 && keys.includes('text') && keys.includes('level') &&
        validText(content.text, 160) && (content.level === 'h2' || content.level === 'h3')) {
        return { type, content: { text: content.text, level: content.level }, position };
    }
    if ((type === 'paragraph' || type === 'callout') && keys.length === 1 && keys[0] === 'text' &&
        validText(content.text, type === 'paragraph' ? 2000 : 1000)) {
        return { type, content: { text: content.text }, position };
    }
    if (type === 'link' && keys.length === 2 && keys.includes('label') && keys.includes('url') &&
        validText(content.label, 120) && safeLink(content.url)) {
        return { type, content: { label: content.label, url: content.url }, position };
    }
    return null;
}
