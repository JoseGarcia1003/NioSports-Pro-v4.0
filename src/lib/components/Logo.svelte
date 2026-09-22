<!-- Logo profesional NioSports Pro — SVG -->
<script>
  export let size = 32;
  export let showText = true;
</script>

<div class="logo" class:logo--with-text={showText}>
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="var(--logo-background, #425b34)"/>
    <path d="M12 28V12l8 5.5L28 12v16l-8-5.5L12 28z" fill="white" opacity="0.9"/>
    <path d="M20 17.5l8 5.5V12l-8 5.5z" fill="white" opacity="0.6"/>
  </svg>
  {#if showText}
    <div class="logo__text">
      <span class="logo__name">NioSports</span>
      <span class="logo__tag">PRO</span>
    </div>
  {/if}
</div>

<style>
  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo__text {
    display: flex;
    flex-direction: column;
    line-height: 1;
  }
  .logo__name {
    font-family: var(--font-sans, 'DM Sans', sans-serif);
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--logo-text-color, #fff);
    letter-spacing: -0.02em;
  }
  .logo__tag {
    font-size: 0.55rem;
    font-weight: 900;
    color: var(--logo-accent, #90ad70);
    letter-spacing: 0.15em;
  }
</style>
