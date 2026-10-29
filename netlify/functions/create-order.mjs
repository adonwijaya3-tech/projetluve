import { json, supabaseRequest, getAuthenticatedUser } from './_shared.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method tidak diizinkan.' }, 405);
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return json({ error: 'Silakan login dengan akun terverifikasi terlebih dahulu.' }, 401);

    const payload = await request.json().catch(() => null);
    const productId = Number(payload?.productId);
    const paymentMethodId = String(payload?.paymentMethodId || '').trim();
    const robloxUsername = String(payload?.robloxUsername || '').trim();
    const whatsapp = String(payload?.whatsapp || '').trim();
    const note = String(payload?.note || '').trim().slice(0, 500);

    if (!Number.isInteger(productId) || productId < 1) return json({ error: 'Produk tidak valid.' }, 400);
    if (!paymentMethodId || paymentMethodId.length > 80) return json({ error: 'Metode pembayaran tidak valid.' }, 400);
    if (!/^[A-Za-z0-9_]{3,20}$/.test(robloxUsername)) return json({ error: 'Username Roblox tidak valid.' }, 400);
    if (!/^\+?[0-9\s-]{8,20}$/.test(whatsapp)) return json({ error: 'Nomor WhatsApp tidak valid.' }, 400);

    const products = await supabaseRequest(`products?id=eq.${productId}&active=eq.true&select=id,name,price,stock&limit=1`);
    if (!products?.length) return json({ error: 'Produk tidak tersedia.' }, 404);
    const payments = await supabaseRequest(`payment_methods?id=eq.${encodeURIComponent(paymentMethodId)}&active=eq.true&select=id,name,fee&limit=1`);
    if (!payments?.length) return json({ error: 'Metode pembayaran tidak tersedia.' }, 400);

    const product = products[0];
    const payment = payments[0];
    if (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0) return json({ error: 'Harga produk belum valid.' }, 409);
    if (Number(product.stock) < 1) return json({ error: 'Stok produk habis.' }, 409);
    const total = Number(product.price) + Math.max(0, Number(payment.fee) || 0);

    const order = await supabaseRequest('orders', {
      method: 'POST',
      body: {
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        roblox_username: robloxUsername,
        whatsapp,
        note,
        payment_method_id: payment.id,
        payment_method_name: payment.name,
        subtotal: Number(product.price),
        fee: Math.max(0, Number(payment.fee) || 0),
        total,
        status: 'pending'
      }
    });
    const created = Array.isArray(order) ? order[0] : order;
    return json({ ok: true, order: created }, 201);
  } catch (error) {
    console.error('create-order failed:', error.message);
    return json({ error: 'Pesanan belum dapat dibuat. Periksa konfigurasi backend.' }, 500);
  }
};
