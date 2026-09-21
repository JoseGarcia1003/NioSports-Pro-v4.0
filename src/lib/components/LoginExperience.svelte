<script>
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import ArrowRight from 'lucide-svelte/icons/arrow-right';
  import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
  import Eye from 'lucide-svelte/icons/eye';
  import EyeOff from 'lucide-svelte/icons/eye-off';
  import ShieldCheck from 'lucide-svelte/icons/shield-check';
  import Sun from 'lucide-svelte/icons/sun';
  import Moon from 'lucide-svelte/icons/moon';
  import Logo from '$lib/components/Logo.svelte';
  import { loginWithEmail, loginWithGoogle, registerWithEmail, resetPassword } from '$lib/firebase';
  import { theme } from '$lib/stores/ui';
  import { goto } from '$app/navigation';
  let mode = 'login', email = '', password = '', loading = false, error = '', notice = '', showPassword = false;
  function changeMode(next) { if (loading) return; mode = next; error = ''; notice = ''; showPassword = false; password = ''; }
  function friendlyError(code) {
    return ({
      'auth/invalid-email': 'Revisa el formato de tu correo electrónico.',
      'auth/user-not-found': 'Correo o contraseña incorrectos.',
      'auth/wrong-password': 'Correo o contraseña incorrectos.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Puedes iniciar sesión o recuperar tu contraseña.',
      'auth/weak-password': 'Usa una contraseña de al menos 6 caracteres.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
      'auth/network-request-failed': 'No pudimos conectar. Comprueba tu conexión e inténtalo de nuevo.',
      'auth/popup-blocked': 'Permite la ventana de Google para continuar.',
      'auth/unauthorized-domain': 'El acceso con Google no está habilitado en esta dirección. Prueba con tu correo.',
      'auth/operation-not-allowed': 'Este método de acceso todavía no está habilitado.'
    })[code] ?? 'No pudimos completar el acceso. Inténtalo de nuevo más tarde.';
  }
  async function submit() {
    if (loading) return;
    loading = true; error = ''; notice = '';
    try {
      if (mode === 'forgot') {
        await resetPassword(email.trim());
        notice = 'Si existe una cuenta con este correo, recibirás las instrucciones para recuperar el acceso. Revisa también la carpeta de spam.';
      } else {
        await (mode === 'register' ? registerWithEmail : loginWithEmail)(email.trim(), password);
        await goto('/today');
      }
    } catch (e) { error = friendlyError(e.code); }
    finally { loading = false; }
  }
  async function google() {
    if (loading) return;
    loading = true; error = ''; notice = '';
    try { await loginWithGoogle(); await goto('/today'); }
    catch (e) { if (e.code !== 'auth/popup-closed-by-user') error = friendlyError(e.code); }
    finally { loading = false; }
  }
</script>

<svelte:head><title>{mode === 'register' ? 'Crea tu cuenta' : mode === 'forgot' ? 'Recupera tu acceso' : 'Bienvenido de nuevo'} · NioSports Pro</title><meta name="description" content="Accede a tu espacio de análisis deportivo, seguimiento y control de bankroll en NioSports Pro." /></svelte:head>
<div class="access-page">
  <section class="access-story" aria-label="NioSports Pro">
    <img src="/images/court-night.jpg" alt="" width="1536" height="1024" fetchpriority="high" />
    <div class="story-shade"></div>
    <a class="story-brand" href="/today" aria-label="NioSports Pro — Inicio"><Logo size={36} /></a>
    <div class="story-copy"><span class="story-eyebrow">EL DEPORTE, CON PERSPECTIVA.</span><h2>La emoción <br />del juego. <br /><span>La claridad <br />de los datos.</span></h2><p>Un espacio para entender el partido,<br />registrar tus decisiones y mirar más allá<br />del resultado.</p><a href="/account">Conoce tu espacio <ArrowUpRight size={17} /></a></div>
    <div class="story-footer"><span>NBA <i></i> TENIS <i></i> BANKROLL</span><span>NIOSPORTS / PRO</span></div>
  </section>
  <section class="access-panel" aria-labelledby="access-title">
    <div class="access-top"><a href="/account"><ArrowLeft size={16} /> Volver a explorar</a><button class="theme-button" aria-label="Cambiar tema" on:click={theme.toggle}>{#if $theme === 'dark'}<Sun size={18} />{:else}<Moon size={18} />{/if}</button></div>
    <div class="access-form-wrap">
      <span class="form-eyebrow">TU ESPACIO PERSONAL</span>
      <h1 id="access-title">{mode === 'login' ? 'Bienvenido de nuevo.' : mode === 'register' ? 'Empieza con criterio.' : 'Recupera tu acceso.'}</h1>
      <p class="access-intro">{mode === 'login' ? 'Retoma tus análisis. Continúa tu historia.' : mode === 'register' ? 'Crea tu cuenta y reúne tus decisiones en un solo lugar.' : 'Te ayudamos a volver a tu cuenta con tu correo electrónico.'}</p>
      {#if mode !== 'forgot'}<div class="access-modes" role="group" aria-label="Tipo de acceso"><button disabled={loading} aria-pressed={mode === 'login'} class:selected={mode === 'login'} on:click={() => changeMode('login')}>Iniciar sesión</button><button disabled={loading} aria-pressed={mode === 'register'} class:selected={mode === 'register'} on:click={() => changeMode('register')}>Crear cuenta</button></div>{/if}
      {#if error}<p class="access-message access-error" role="alert">{error}</p>{/if}
      {#if notice}<p class="access-message access-notice" role="status">{notice}</p>{/if}
      <form on:submit|preventDefault={submit} aria-busy={loading}>
        <label for="account-email">Correo electrónico</label><input id="account-email" name="email" type="email" autocomplete="email" placeholder="tu@correo.com" required disabled={loading} bind:value={email} />
        {#if mode !== 'forgot'}<div class="password-heading"><label for="account-password">Contraseña</label>{#if mode === 'login'}<button type="button" class="forgot-link" disabled={loading} on:click={() => changeMode('forgot')}>¿La olvidaste?</button>{/if}</div><div class="password-input"><input id="account-password" name="password" type={showPassword ? 'text' : 'password'} autocomplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Al menos 6 caracteres' : 'Tu contraseña'} minlength={mode === 'register' ? 6 : undefined} required disabled={loading} bind:value={password} /><button class="password-toggle" type="button" disabled={loading} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} on:click={() => showPassword = !showPassword}>{#if showPassword}<EyeOff size={18} />{:else}<Eye size={18} />{/if}</button></div>{/if}
        <button class="submit-button" type="submit" disabled={loading}>{loading ? 'Un momento…' : mode === 'login' ? 'Entrar a mi espacio' : mode === 'register' ? 'Crear mi cuenta' : 'Enviar instrucciones'}<ArrowRight size={18} /></button>
      </form>
      {#if mode !== 'forgot'}<div class="access-divider"><span>o continúa con</span></div><button class="google-button" disabled={loading} on:click={google}><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.8 6C12.5 13.1 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M10.6 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-8 6.1C6.7 42.6 14.7 48 24 48z"/></svg>Continuar con Google</button>{:else}<button class="back-button" disabled={loading} on:click={() => changeMode('login')}><ArrowLeft size={15} /> Volver al inicio de sesión</button>{/if}
      <div class="access-footnote"><ShieldCheck size={17} /><p>Tu cuenta es personal.<br />Tú decides cómo seguir el juego.</p></div>
    </div>
    <footer><span>© {new Date().getFullYear()} NioSports Pro</span><a href="/legal/privacy">Privacidad</a><a href="/legal/responsible-gambling">Juego responsable</a></footer>
  </section>
</div>

<style>
  .access-page { --ink:#eaf0e7; --muted:#a4b2a4; --panel:#101a13; --field:#19241b; --line:#354336; --action:#d4e7a7; --action-ink:#24331b; display:grid; grid-template-columns:1fr 1fr; min-height:100svh; position:relative; font-family:var(--font-sans); background:var(--panel); color:var(--ink); }
  :global([data-theme='light']) .access-page { --ink:#233027; --muted:#657166; --panel:#f6f7f1; --field:#fff; --line:#d8dfd1; --action:#2c4128; --action-ink:#f0f5e9; }
  .access-story { position:relative; isolation:isolate; overflow:hidden; background:#0d1812; color:#f4f6ed; min-height:800px; display:flex; flex-direction:column; justify-content:space-between; padding:44px; }
  .access-story > img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:65% center; z-index:-3; }
  .story-shade { position:absolute; inset:0; background:linear-gradient(90deg,#07120deb,#07120d69),linear-gradient(0deg,#07120de0,transparent 30%); z-index:-2; }
  .story-brand { --logo-text-color:#f4f6ed; --logo-accent:#c8df9a; display:inline-flex; align-items:center; align-self:start; text-decoration:none; }
  .story-copy { padding:55px 0 70px; }.story-eyebrow { color:#d0deba; font-size:9px; font-weight:600; letter-spacing:.15em; }.story-copy h2 { font-size:clamp(44px,4.8vw,72px); font-weight:500; line-height:1.02; letter-spacing:-.055em; margin:26px 0; }.story-copy h2 span { color:#c3d3ad; }.story-copy p { color:#d6decf; font-size:13px; line-height:1.8; }.story-copy > a { display:inline-flex; align-items:center; gap:21px; color:#e0ebd3; font-size:12px; text-decoration:none; border-bottom:1px solid #c5d3b455; margin-top:30px; }
  .story-footer { display:flex; align-items:center; justify-content:space-between; gap:20px; padding-top:20px; border-top:1px solid #dce6cf44; color:#c5d3b4; font-size:9px; letter-spacing:.08em; }.story-footer span:first-child { display:flex; align-items:center; gap:12px; }.story-footer i { width:2px; height:2px; background:currentColor; border-radius:50%; }
  .access-panel { display:flex; flex-direction:column; justify-content:space-between; padding:30px 48px 25px; min-width:0; }.access-top { display:flex; align-items:center; justify-content:space-between; gap:15px; }.access-top a { display:inline-flex; align-items:center; gap:9px; text-decoration:none; font-size:11px; color:var(--muted); }.theme-button { display:grid; place-items:center; width:44px; height:44px; border:1px solid var(--line); border-radius:50%; color:var(--ink); background:transparent; cursor:pointer; }
  .access-form-wrap { width:100%; max-width:375px; margin:52px auto; }.form-eyebrow { font-size:9px; letter-spacing:.13em; font-weight:600; color:var(--muted); }h1 { font-size:33px; letter-spacing:-.045em; line-height:1.17; font-weight:600; margin:15px 0 12px; }.access-intro { font-size:13px; line-height:1.7; color:var(--muted); }
  .access-modes { display:flex; border-bottom:1px solid var(--line); margin:28px 0; gap:25px; }.access-modes button { background:none; border:0; border-bottom:2px solid transparent; padding:0 0 12px; color:var(--muted); font-size:12px; font-weight:500; cursor:pointer; }.access-modes .selected { color:var(--ink); border-color:var(--ink); font-weight:600; }
  form { display:flex; flex-direction:column; }.access-intro + form { margin-top:24px; }label { font-size:12px; font-weight:500; margin-bottom:9px; }input { width:100%; background:var(--field); border:1px solid var(--line); border-radius:8px; color:var(--ink); font-size:14px; min-height:49px; padding:12px 14px; }input::placeholder { color:var(--muted); opacity:1; }input:focus-visible { outline:2px solid var(--action); outline-offset:2px; }.password-heading { display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:10px; }.password-heading label { margin:0; }.forgot-link { background:none; border:0; font-size:11px; color:var(--muted); cursor:pointer; }.password-input { position:relative; }.password-input input { padding-right:49px; }.password-toggle { position:absolute; top:2px; right:3px; min-width:44px; display:grid; place-items:center; border:0; background:transparent; color:var(--muted); cursor:pointer; }
  .submit-button { display:flex; justify-content:space-between; align-items:center; width:100%; background:var(--action); color:var(--action-ink); font-size:12px; font-weight:600; min-height:49px; border:0; border-radius:8px; padding:12px 17px; margin-top:22px; cursor:pointer; transition:transform .18s,box-shadow .18s; }.submit-button:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 7px 16px #0002; }button:disabled { opacity:.6; cursor:wait; }
  .access-divider { display:flex; align-items:center; gap:13px; margin:21px 0; font-size:10px; color:var(--muted); }.access-divider:before,.access-divider:after { content:''; height:1px; background:var(--line); flex:1; }.google-button { display:flex; justify-content:center; align-items:center; gap:12px; border:1px solid var(--line); border-radius:8px; background:var(--field); color:var(--ink); width:100%; min-height:49px; font-size:12px; font-weight:500; cursor:pointer; }.google-button:hover:not(:disabled) { border-color:var(--muted); }.access-footnote { display:flex; justify-content:center; align-items:center; gap:10px; padding-top:27px; color:var(--muted); }.access-footnote p { font-size:10px; line-height:1.7; }.access-message { font-size:12px; line-height:1.7; padding:12px 14px; margin:20px 0; border:1px solid var(--line); border-radius:8px; }.access-error { color:#f6c89e; background:#351f16; }.access-notice { color:#deebcf; background:#243320; }.back-button { display:flex; gap:10px; align-items:center; background:none; border:0; color:var(--muted); font-size:12px; margin-top:15px; cursor:pointer; }
  .access-panel footer { display:flex; align-items:center; justify-content:center; gap:18px; flex-wrap:wrap; color:var(--muted); font-size:9px; }.access-panel footer a { display:inline-flex; align-items:center; text-decoration:none; }.access-panel a:hover { text-decoration:underline; text-underline-offset:4px; }.access-page :is(a,button):focus-visible { outline:2px solid var(--action); outline-offset:4px; }.access-story a:focus-visible { outline-color:#d4e7a7; }
  @media(min-width:1600px) { .access-story { padding:55px 70px; }.access-form-wrap { max-width:405px; } }
  @media(max-width:1000px) { .access-story { padding:30px; }.access-panel { padding-inline:30px; }.story-footer span:last-child { display:none; }.story-copy h2 { font-size:52px; }h1 { font-size:30px; } }
  @media(max-width:700px) { .access-page { grid-template-columns:1fr; }.access-story { min-height:210px; padding:24px; }.story-brand { min-height:36px; }.story-copy { padding:23px 0 4px; }.story-eyebrow,.story-copy p,.story-copy a,.story-footer { display:none; }.story-copy h2 { font-size:31px; line-height:1.12; margin:0; max-width:330px; }.story-copy h2 br { display:none; }.story-copy h2 span { display:block; }.story-shade { background:linear-gradient(90deg,#07120de6,#07120d4d); }.access-story > img { object-position:center 57%; }.access-panel { padding:18px 24px 20px; }.access-form-wrap { margin:28px auto 32px; max-width:410px; }h1 { font-size:30px; }.access-panel footer { gap:15px; font-size:9px; }.access-top a { font-size:11px; }.theme-button { width:40px; }.access-modes { margin-block:24px; }input { font-size:16px; } }
</style>
