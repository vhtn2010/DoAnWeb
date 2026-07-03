const crypto = require('node:crypto');

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0
    ? normalized
    : `${normalized}${'='.repeat(4 - padding)}`;

  return Buffer.from(padded, 'base64');
};

const safeJsonParse = (buffer) => {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    return null;
  }
};

const verifyHs256Token = (token, secret) => {
  if (typeof token !== 'string' || !token) {
    return {
      reason: 'invalid',
      valid: false,
    };
  }

  const segments = token.split('.');

  if (segments.length !== 3) {
    return {
      reason: 'invalid',
      valid: false,
    };
  }

  const [encodedHeader, encodedPayload, signature] = segments;
  const header = safeJsonParse(base64UrlDecode(encodedHeader));
  const payload = safeJsonParse(base64UrlDecode(encodedPayload));

  if (!header || !payload || header.alg !== 'HS256' || header.typ !== 'JWT') {
    return {
      reason: 'invalid',
      valid: false,
    };
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);

  if (
    left.length !== right.length ||
    !crypto.timingSafeEqual(left, right)
  ) {
    return {
      reason: 'invalid',
      valid: false,
    };
  }

  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp === 'number' && payload.exp <= now) {
    return {
      payload,
      reason: 'expired',
      valid: false,
    };
  }

  if (typeof payload.nbf === 'number' && payload.nbf > now) {
    return {
      payload,
      reason: 'invalid',
      valid: false,
    };
  }

  return {
    payload,
    valid: true,
  };
};

module.exports = {
  verifyHs256Token,
};
