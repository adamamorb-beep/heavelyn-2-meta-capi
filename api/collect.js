/* api/collect.js — browser events (from the Shopify custom web pixel) -> Meta CAPI.
   Same event_id the Pixel used, so Meta deduplicates. */
const capi = require('./_lib/meta-capi');

const ALLOWED = (process.env.ALLOWED_ORIGIN || '').split(',').filter(Boolean);

function cors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED.length === 0 || ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Respond fast; never make the storefront wait on Meta.
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (b.optOut === true) return res.status(202).json({ ok: true, skipped: true }); // CCPA/CPRA

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined;
    // MUST finish the Meta call BEFORE responding. On Vercel, anything after
    // res.json() is frozen and never runs — that's the "No outgoing requests" bug.
    await capi.sendEvent({
      eventName: b.event_name,
      eventId: b.event_id,
      eventSourceUrl: b.event_source_url,
      customData: b.custom_data,
      user: {
        ...(b.user || {}),
        fbp: b.fbp,
        fbc: b.fbc,
        clientIp: ip,
        clientUserAgent: b.user_agent || req.headers['user-agent'],
      },
    });
    return res.status(202).json({ ok: true });
  } catch (err) {
    console.error('[collect]', err.message);
    return res.status(200).json({ ok: false }); // browser ignores the body anyway
  }
};
