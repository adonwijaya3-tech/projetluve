export default async () => {
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return new Response(JSON.stringify({
    ok: true,
    service: 'LuVenXe Store API',
    backendConfigured: configured,
    message: configured ? 'Backend environment variables are present.' : 'Backend belum dikonfigurasi. Jangan aktifkan transaksi nyata.'
  }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
};
