import { json, requireAdmin } from './_shared.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method tidak diizinkan.' }, 405);
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const webhook = process.env.DISCORD_TESTIMONIAL_WEBHOOK;
    if (!webhook) return json({ error: 'Webhook Discord belum dikonfigurasi di environment Netlify.' }, 503);

    const body = await request.json().catch(() => null);
    const orderId = String(body?.orderId || '').trim();
    if (!orderId || orderId.length > 80) return json({ error: 'ID pesanan tidak valid.' }, 400);

    // Endpoint ini sengaja hanya mengirim notifikasi ringkas. Jangan kirim password,
    // token, alamat, atau informasi pribadi yang tidak diperlukan ke Discord.
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'LuVenXe Store — Pembaruan Pesanan',
          description: `Pesanan **#${orderId.replace(/[^a-zA-Z0-9_-]/g, '')}** diperbarui oleh admin.`,
          color: 3447003,
          footer: { text: 'LuVenXe Store' },
          timestamp: new Date().toISOString()
        }]
      })
    });
    if (!response.ok) return json({ error: 'Discord menolak webhook. Periksa URL webhook.' }, 502);
    return json({ ok: true });
  } catch (error) {
    console.error('discord-testimonial failed:', error.message);
    return json({ error: 'Webhook belum dapat diproses.' }, 500);
  }
};
