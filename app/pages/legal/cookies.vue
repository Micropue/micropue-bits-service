<template>
  <LegalDoc title="Cookies Policy" effective="October 15, 2026">
    <h2>1. What cookies are</h2>
    <p>
      A cookie is a small piece of text that a site asks your browser to store and to send back with later requests.
      Cookies are what let a site remember that you are signed in between page loads.
    </p>

    <h2>2. The one cookie we use</h2>
    <p>BITS sets a single cookie. It is strictly necessary: without it, signing in is not possible.</p>
    <ul>
      <li><strong>Name</strong> — <code>bits_token</code></li>
      <li><strong>Purpose</strong> — keeps you signed in between requests</li>
      <li><strong>Contents</strong> — a signed token containing your account identifier, a session token and an expiry
        time. It holds no password and no personal profile data.</li>
      <li><strong>Lifetime</strong> — up to 180 days, or shorter if you sign out, or if the session is revoked from
        another device</li>
      <li><strong>Flags</strong> — HttpOnly, SameSite=Lax, Path=/, and Secure whenever the site is served over HTTPS</li>
    </ul>
    <p>We set no other cookies, and we do not use localStorage or sessionStorage.</p>

    <h2>3. Why we do not ask for cookie consent</h2>
    <p>
      Consent is not required for cookies that are strictly necessary to provide a service you asked for. The session
      cookie is exactly that. We do not use analytics cookies, advertising cookies or cross-site tracking cookies,
      and we do not build advertising profiles.
    </p>

    <h2>4. Third-party requests</h2>
    <p>
      Some pages load third-party resources, and a provider may store data on its own domain when it does. In
      particular:
    </p>
    <ul>
      <li><strong>hCaptcha</strong> — loads on the sign-up and sign-in forms to check that you are human, and may store
        data on its own domain to do so.</li>
      <li><strong>Icon CDNs</strong> (<a href="https://cdn.simpleicons.org" target="_blank" rel="noopener noreferrer">cdn.simpleicons.org</a>,
        <a href="https://unpkg.com" target="_blank" rel="noopener noreferrer">unpkg.com</a>) — catalog pages request brand
        logos from these public CDNs.</li>
      <li><strong>GitHub</strong> — invoked only when you choose to sign in or link with GitHub, or to read the public
        star count shown in the header.</li>
    </ul>
    <p>
      These services are governed by their own policies and we do not control the cookies they set. See our
      <NuxtLink to="/legal/privacy">Privacy Policy</NuxtLink> for what is shared with them.
    </p>

    <h2>5. Managing cookies</h2>
    <p>
      Every browser lets you view, block and delete cookies in its settings. If you block or delete
      <code>bits_token</code> you will be signed out and will need to sign in again; nothing else on the site depends
      on cookies.
    </p>

    <h2>6. Changes to this policy</h2>
    <p>
      If we ever introduce a cookie that is not strictly necessary, we will update this page and ask for your consent
      before setting it. The effective date at the top will change.
    </p>

    <h2>7. Contact</h2>
    <p><a href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a></p>
  </LegalDoc>
</template>

<script setup lang="ts">
useHead({ title: 'Cookies Policy' })
useSeoMeta({ description: 'The single cookie BITS uses to keep you signed in, and how to manage it.' })
</script>
