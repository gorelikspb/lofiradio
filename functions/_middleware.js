// Middleware для редиректа 301 со старого домена lofilofi.pages.dev на новый lofimusic.online
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // Редирект только для старого домена lofilofi.pages.dev
  if (url.hostname === 'lofilofi.pages.dev') {
    const newUrl = `https://lofimusic.online${url.pathname}${url.search}`;
    return Response.redirect(newUrl, 301);
  }
  
  // Для других доменов - продолжаем обычную обработку
  return next();
}

