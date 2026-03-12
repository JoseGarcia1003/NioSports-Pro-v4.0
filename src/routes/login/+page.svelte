<!-- src/routes/login/+page.svelte -->
<script>
  import {
    loginWithEmail,
    loginWithGoogle,
    registerWithEmail,
    resetPassword
  } from '$lib/firebase';
  import { authStore } from '$lib/stores/auth';
  import { toasts } from '$lib/stores/ui';
  import { goto } from '$app/navigation';

  let mode = 'login'; // 'login' | 'register' | 'forgot'
  let email = '';
  let password = '';
  let name = '';
  let loading = false;
  let error = '';

  $: error = error;

  async function handleLogin() {
    if (!email || !password) {
      error = 'Completa todos los campos';
      return;
    }
    loading = true;
    error = '';
    try {
      await loginWithEmail(email, password);
      goto('/');
    } catch (e) {
      error = friendlyError(e.code);
    } finally {
      loading = false;
    }
  }

  async function handleRegister() {
    if (!email || !password || !name) {
      error = 'Completa todos los campos';
      return;
    }
    if (password.length < 6) {
      error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    loading = true;
    error = '';
    try {
      await registerWithEmail(email, password);
      toasts.success('¡Cuenta creada! Bienvenido a NioSports Pro.');
      goto('/');
    } catch (e) {
      error = friendlyError(e.code);
    } finally {
      loading = false;
    }
  }

  async function handleGoogle() {
    loading = true;
    error = '';
    try {
      await loginWithGoogle();
      goto('/');
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        error = friendlyError(e.code);
      }
    } finally {
      loading = false;
    }
  }

  async function handleForgot() {
    if (!email) {
      error = 'Introduce tu email primero';
      return;
    }
    loading = true;
    error = '';
    try {
      await resetPassword(email);
      toasts.success('Email de recuperación enviado. Revisa tu bandeja.');
      mode = 'login';
    } catch (e) {
      error = friendlyError(e.code);
    } finally {
      loading = false;
    }
  }

  function friendlyError(code) {
    const MAP = {
      'auth/invalid-email': 'El email no tiene un formato válido.',
      'auth/user-not-found': 'No existe una cuenta con ese email.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-credential': 'Email o contraseña incorrectos.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
      'auth/weak-password': 'La contraseña es muy débil. Usa al menos 6 caracteres.',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos.',
      'auth/network-request-failed': 'Error de red. Comprueba tu conexión.',
      'auth/popup-blocked': 'El popup fue bloqueado. Permite ventanas emergentes para este sitio.'
    };
    return MAP[code] ?? 'Error inesperado. Intenta de nuevo.';
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !loading) {
      if (mode === 'login') handleLogin();
      if (mode === 'register') handleRegister();
      if (mode === 'forgot') handleForgot();
    }
  }
</script>

<svelte:head>
  <title>Iniciar Sesión — NioSports Pro</title>
  <meta
    name="description"
    content="Accede a tu cuenta de NioSports Pro para ver tus picks y análisis NBA."
  />
</svelte:head>

<div class="auth-page" on:keydown={handleKeydown} role="presentation">
  <div class="auth-card">
    <div class="auth-logo">
      <img src="/icons/icon-192.png" alt="NioSports" width="60" height="60" />
      <h1 class="auth-title">NioSports <span>PRO</span></h1>
      <p class="auth-subtitle">Sistema predictivo NBA profesional</p>
    </div>

    {#if mode !== 'forgot'}
      <div class="auth-tabs" role="tablist">
        <button
          class="auth-tab"
          class:auth-tab--active={mode === 'login'}
          role="tab"
          aria-selected={mode === 'login'}
          on:click={() => {
            mode = 'login';
            error = '';
          }}
        >
          Iniciar sesión
        </button>

        <button
          class="auth-tab"
          class:auth-tab--active={mode === 'register'}
          role="tab"
          aria-selected={mode === 'register'}
          on:click={() => {
            mode = 'register';
            error = '';
          }}
        >
          Crear cuenta
        </button>
      </div>
    {/if}

    {#if error}
      <div class="auth-error" role="alert">{error}</div>
    {/if}

    <div class="auth-form" role="tabpanel">
      {#if mode === 'register'}
        <div class="form-group">
          <label for="name" class="form-label">Nombre</label>
          <input
            id="name"
            type="text"
            bind:value={name}
            placeholder="Tu nombre"
            class="form-input"
            autocomplete="name"
            disabled={loading}
          />
        </div>
      {/if}

      <div class="form-group">
        <label for="email" class="form-label">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="tu@email.com"
          class="form-input"
          autocomplete="email"
          disabled={loading}
        />
      </div>

      {#if mode !== 'forgot'}
        <div class="form-group">
          <label for="password" class="form-label">Contraseña</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="••••••••"
            class="form-input"
            autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={loading}
          />
        </div>
      {/if}

      {#if mode === 'login'}
        <button class="btn-primary" on:click={handleLogin} disabled={loading}>
          {loading ? 'Entrando...' : 'Iniciar sesión'}
        </button>
      {:else if mode === 'register'}
        <button class="btn-primary" on:click={handleRegister} disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      {:else}
        <button class="btn-primary" on:click={handleForgot} disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar email de recuperación'}
        </button>
      {/if}

      {#if mode !== 'forgot'}
        <div class="auth-divider"><span>o</span></div>

        <button class="btn-google" on:click={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.8 6C12.5 13.1 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
            <path fill="#FBBC05" d="M10.6 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8-6z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-8 6.1C6.7 42.6 14.7 48 24 48z"/>
          </svg>
          Continuar con Google
        </button>
      {/if}

      <div class="auth-links">
        {#if mode === 'login'}
          <button
            class="auth-link"
            on:click={() => {
              mode = 'forgot';
              error = '';
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        {:else if mode === 'forgot'}
          <button
            class="auth-link"
            on:click={() => {
              mode = 'login';
              error = '';
            }}
          >
            ← Volver al inicio de sesión
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  :global(:root) {
    color-scheme: light dark;
  }

  .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.12) 0%, transparent 60%),
      linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  }

  .auth-card {
    width: 100%;
    max-width: 420px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 20px;
    padding: 36px 32px;
    backdrop-filter: blur(20px);
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
  }

  .auth-logo {
    text-align: center;
    margin-bottom: 28px;
  }

  .auth-logo img {
    border-radius: 16px;
    margin-bottom: 12px;
  }

  .auth-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.6rem;
    font-weight: 900;
    color: #0f172a;
  }

  .auth-title span {
    color: #f59e0b;
  }

  .auth-subtitle {
    font-size: 0.9rem;
    color: #475569;
    margin-top: 6px;
  }

  .auth-tabs {
    display: flex;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.06);
    padding: 4px;
    margin-bottom: 20px;
    gap: 4px;
  }

  .auth-tab {
    flex: 1;
    padding: 9px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #475569;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .auth-tab--active {
    background: rgba(251, 191, 36, 0.18);
    color: #a16207;
  }

  .auth-error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.28);
    color: #b91c1c;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.85rem;
    margin-bottom: 16px;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-label {
    font-size: 0.9rem;
    font-weight: 700;
    color: #1e293b;
  }

  .form-input {
    padding: 11px 14px;
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: rgba(255, 255, 255, 0.95);
    color: #0f172a;
    font-size: 0.95rem;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    width: 100%;
  }

  .form-input:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.18);
  }

  .form-input::placeholder {
    color: #94a3b8;
  }

  .form-input:disabled {
    opacity: 0.65;
  }

  .btn-primary {
    width: 100%;
    padding: 13px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #111827;
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.95;
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #64748b;
    font-size: 0.85rem;
  }

  .auth-divider::before,
  .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(15, 23, 42, 0.12);
  }

  .btn-google {
    width: 100%;
    padding: 11px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.92);
    color: #111827;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: background 0.2s, border-color 0.2s;
  }

  .btn-google:hover:not(:disabled) {
    background: #ffffff;
    border-color: rgba(15, 23, 42, 0.2);
  }

  .btn-google:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auth-links {
    text-align: center;
  }

  .auth-link {
    background: none;
    border: none;
    color: #b45309;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    transition: color 0.2s;
  }

  .auth-link:hover {
    color: #92400e;
  }

  @media (prefers-color-scheme: dark) {
    .auth-page {
      background:
        radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.08) 0%, transparent 60%),
        #0a0f1c;
    }

    .auth-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: none;
    }

    .auth-title {
      color: #ffffff;
    }

    .auth-subtitle {
      color: rgba(255, 255, 255, 0.55);
    }

    .auth-tabs {
      background: rgba(255, 255, 255, 0.05);
    }

    .auth-tab {
      color: rgba(255, 255, 255, 0.6);
    }

    .auth-tab--active {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }

    .auth-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }

    .form-label {
      color: rgba(255, 255, 255, 0.84);
    }

    .form-input {
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }

    .form-input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .auth-divider {
      color: rgba(255, 255, 255, 0.35);
    }

    .auth-divider::before,
    .auth-divider::after {
      background: rgba(255, 255, 255, 0.1);
    }

    .btn-google {
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }

    .btn-google:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.24);
    }

    .auth-link {
      color: rgba(251, 191, 36, 0.85);
    }

    .auth-link:hover {
      color: #fbbf24;
    }
  }
</style>