<template>
  <LegalDoc title="Privacy Policy" effective="October 23, 2026">
    <h2>1. Who we are</h2>
    <p>
      BITS (<NuxtLink to="/">bits.micropue.com.cn</NuxtLink>) is a community for sharing, reusing and discovering code
      snippets. It is operated by <strong>MICROPUE</strong> — the personal brand behind
      <a href="https://micropue.com.cn" target="_blank" rel="noopener noreferrer">micropue.com.cn</a>.
      For any question or request about your data, write to
      <a href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a>.
    </p>

    <h2>2. What we collect</h2>
    <p><strong>Account information</strong> — your email address, username, nickname and, if you add one, a short bio. Your email address is verified with a one-time code before the account is created.</p>
    <p><strong>Authentication data</strong> — a hash of your password (scrypt with a per-user salt; your password itself is never stored), the public keys of any passkeys you register (the private keys stay on your device), an encrypted secret if you enable an authenticator app, hashed recovery codes, and — only if you link it — your GitHub account ID and username.</p>
    <p><strong>Session and security data</strong> — the devices you sign in from (device type, a name derived from the browser's user agent, a randomly generated session token and the sign-in time), your last sign-in time, registration time and account status. These power the devices screen where you can revoke sessions.</p>
    <p><strong>Content</strong> — the snippets, groups and related metadata (tags, dependencies, visibility) you publish, and your activity on the site such as favorites, follows, feedback and reports.</p>
    <p><strong>Short-lived anti-abuse data</strong> — one-time email codes, rate-limit counters keyed by IP address and email, WebAuthn challenges and two-factor tickets. These live in memory (Redis) and expire by themselves within minutes; they are not part of your account record.</p>
    <p>We do not run analytics or advertising trackers, and we do not sell your data.</p>

    <h2>3. Cookies</h2>
    <p>
      We use exactly one cookie, <strong>bits_token</strong>, to keep you signed in. It is strictly necessary and is
      described in our <NuxtLink to="/legal/cookies">Cookies Policy</NuxtLink>. We do not use cookies to follow you
      across other websites, and we store nothing in your browser's local or session storage.
    </p>

    <h2>4. Third-party services</h2>
    <p>A few features are delivered with the help of third parties. We only share what the feature needs:</p>
    <ul>
      <li><strong>hCaptcha</strong> — protects the sign-up and sign-in forms from bots. Your request metadata, including your IP address, is sent to hCaptcha to decide whether you are human.</li>
      <li><strong>GitHub</strong> — if you sign in or link your account with GitHub, GitHub authenticates you and shares your GitHub ID, username and email addresses (scopes <em>read:user user:email</em>). The public star count shown in the header is read from GitHub's API.</li>
      <li><strong>Email delivery</strong> — our SMTP provider delivers verification codes and security notifications to your address, and therefore processes it.</li>
      <li><strong>Icon CDNs</strong> (<a href="https://cdn.simpleicons.org" target="_blank" rel="noopener noreferrer">cdn.simpleicons.org</a>, <a href="https://unpkg.com" target="_blank" rel="noopener noreferrer">unpkg.com</a>) — catalog pages load brand logos from these public CDNs, which see your IP address and browser headers for those image requests.</li>
    </ul>
    <p>Each provider handles data under its own privacy policy.</p>

    <h2>5. Why we process it</h2>
    <ul>
      <li>to provide the service and your account;</li>
      <li>to authenticate you and keep the account secure — password hashing, two-factor authentication, passkeys, session and device management;</li>
      <li>to send transactional email such as verification codes and security notices;</li>
      <li>to prevent abuse, spam and attacks through rate limiting;</li>
      <li>to respond to feedback and reports; and</li>
      <li>to meet legal obligations.</li>
    </ul>

    <h2>6. How long we keep it</h2>
    <p>
      Account data is kept for as long as your account exists. Data held in memory (Redis) expires automatically.
      When you delete your account we remove your account record and your public content; copies may remain in
      encrypted backups for a limited period, and we may keep the minimum records needed for security or legal
      reasons.
    </p>

    <h2>7. Your choices and rights</h2>
    <ul>
      <li><strong>Access and correct</strong> — most of your data is visible and editable in account settings.</li>
      <li><strong>Delete</strong> — you can request deletion of your account and data (see
        <NuxtLink to="/legal/terms">Legal Terms</NuxtLink>, section 8).</li>
      <li><strong>Export</strong> — email us to ask for a copy of the data we hold about you.</li>
      <li><strong>Withdraw</strong> — you can turn off two-factor authentication, unlink GitHub, remove passkeys or delete the account at any time.</li>
    </ul>

    <h2>8. Community rules and enforcement</h2>
    <p>
      BITS is an open-source code sharing community. Content and accounts must not be used for unlawful activity,
      malware, spam, harassment, hate, impersonation, or copyright infringement. Reports and feedback are reviewed by
      administrators, and we may take proportionate action when these rules are broken.
    </p>
    <ul>
      <li>remove content, or restrict its visibility and searchability;</li>
      <li>limit an account's ability to publish, comment, report, or use community features;</li>
      <li>suspend or permanently terminate accounts for serious or repeated violations;</li>
      <li>preserve the minimum report, moderation and account records needed to handle appeals, prevent abuse, and meet legal obligations.</li>
    </ul>
    <p>
      Enforcement decisions are made by humans; we do not use automated systems to permanently remove content or
      terminate accounts. If you believe a decision was made in error, contact
      <a href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a> with the content or account concerned.
      Repeated or serious violations may result in permanent removal from the community.
    </p>

    <h2>9. Security</h2>
    <p>
      Passwords are hashed with scrypt and a per-user salt, authenticator secrets are encrypted at rest, and your
      session is carried in an httpOnly cookie that is only sent over HTTPS in production. You can enable two-factor
      authentication and passkeys, and revoke any device you do not recognise. No system is perfectly secure, so
      please use a strong password that you do not reuse elsewhere.
    </p>

    <h2>10. Children</h2>
    <p>
      BITS is not intended for children under 14. If you are under 14, please use BITS only with the consent and
      supervision of a parent or guardian. If we learn that an account was created by a child under 14 without such
      consent, we will remove it.
    </p>

    <h2>11. Changes to this policy</h2>
    <p>
      We may update this policy as the service evolves. The effective date at the top will change, and significant
      changes will be announced on the site.
    </p>

    <h2>12. Contact</h2>
    <p><a href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a></p>
  </LegalDoc>
</template>

<script setup lang="ts">
useHead({ title: 'Privacy Policy' })
useSeoMeta({ description: 'How BITS collects, uses and protects your data, and the choices you have.' })
</script>
