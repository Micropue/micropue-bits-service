<template>
  <LegalDoc title="Legal Terms" effective="October 15, 2026">
    <h2>1. Agreement</h2>
    <p>
      These terms govern your use of BITS. By creating an account or using the service you agree to them. If you do
      not agree, please do not use BITS.
    </p>

    <h2>2. Who we are</h2>
    <p>
      BITS is operated by <strong>MICROPUE</strong>, the personal brand behind
      <a href="https://micropue.com.cn" target="_blank" rel="noopener noreferrer">micropue.com.cn</a>. The service is
      available at <NuxtLink to="/">bits.micropue.com.cn</NuxtLink>. You can reach us at
      <a href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a>.
    </p>

    <h2>3. The service</h2>
    <p>
      BITS is a community for publishing, sharing, reusing and discovering code snippets. It is under active
      development: features may be added, changed or withdrawn, and content may occasionally be unavailable. We may
      set reasonable limits on usage (for example, on storage or on request rates) to keep the service healthy.
    </p>

    <h2>4. Your account</h2>
    <ul>
      <li>You must provide an email address you control. We verify it with a one-time code before the account exists.</li>
      <li>Depending on how you sign up (for example with GitHub), we may ask you to set a password so that you can
        always sign in.</li>
      <li>Keep your password and passkeys safe. You are responsible for activity that happens through your account —
        if you think someone else has access, change your password and revoke the device from the devices screen.</li>
      <li>An account is for one person. A GitHub account can be linked to only one BITS account.</li>
      <li>You can delete your account at any time (see section 8).</li>
    </ul>

    <h2>5. Acceptable use</h2>
    <p>You agree not to:</p>
    <ul>
      <li>publish content that is illegal, malicious, or designed to harm others — including malware and destructive
        code;</li>
      <li>infringe anyone's intellectual property, privacy or other rights;</li>
      <li>harass, threaten or impersonate other people;</li>
      <li>spam, mass-register accounts, or abuse rate limits and other technical protections;</li>
      <li>attack, probe or disrupt the service, or try to access data that is not yours; or</li>
      <li>scrape the service in a way that burdens it or bypasses these terms.</li>
    </ul>
    <p>
      We may remove content or suspend or terminate an account that breaks these rules, and we may report unlawful
      activity where required.
    </p>

    <h2>6. Your content and copyright</h2>
    <p>
      <strong>You keep your rights.</strong> The snippets, groups and other material you publish remain yours. So that
      we can run the service, you grant us a non-exclusive, worldwide, royalty-free licence to store, reproduce,
      display and distribute your public content on BITS and in its normal operation, including the technical copies
      needed for caching and backups. Private and unlisted content is only shown to those you allow.
    </p>
    <p>
      You confirm that you have the right to publish what you upload, and that it does not infringe anyone else's
      rights. We are not required to review content before it appears.
    </p>
    <p>
      <strong>Other people's snippets.</strong> Public snippets can be read and copied for your own use. Unless an
      author states a licence for their work, we cannot grant you any rights to it — if you reuse someone's code
      beyond what the law allows, the responsibility is yours. Be generous with credit.
    </p>
    <p>
      <strong>Copyright complaints.</strong> If you believe content on BITS infringes your rights, email
      <a href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a> with the URL of the content, a
      description of the work you own, and a statement that the use is not authorised. We will review the report and
      may remove the content.
    </p>

    <h2>7. Service availability, changes, and liability</h2>
    <p>
      The service is provided <strong>"as is" and "as available"</strong>, without warranties of any kind, whether
      express or implied, including fitness for a particular purpose or non-infringement. We do not warrant that the
      service will be uninterrupted, error-free, or that content will be preserved — keep your own copy of anything
      important.
    </p>
    <p>
      <strong>Code snippets are shared by users and are not reviewed by us.</strong> Reading and running other
      people's code is at your own risk. To the maximum extent permitted by law, we are not liable for indirect,
      incidental or consequential damages, lost data, lost profits, or any harm resulting from your use of the
      service or of code obtained through it. Where liability cannot be excluded, it is limited to the amount you
      have paid us for the service.
    </p>
    <p>
      We may update these terms as the service evolves. The effective date at the top will change, and significant
      changes will be announced on the site. Continuing to use BITS after a change means you accept the updated
      terms.
    </p>

    <h2>8. Account deletion</h2>
    <p>
      You may request deletion at any time by writing to
      <a href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a> <strong>from your registered email
      address</strong>. We will verify the request, then remove your account and your published content within 30
      days. After deletion your content is no longer reachable through the site, your public links stop working, and
      your email address and username become free to register again.
    </p>
    <p>
      We may keep the minimum records necessary for security, fraud prevention or legal compliance, and residual
      copies may remain in encrypted backups until they expire on their normal cycle. See the
      <NuxtLink to="/legal/privacy">Privacy Policy</NuxtLink> for details.
    </p>

    <h2>9. Children</h2>
    <p>
      BITS is not intended for children under 14. If you are under 14, please use BITS only with the consent and
      supervision of a parent or guardian. If we learn that an account was created by a child under 14 without such
      consent, we will remove it.
    </p>

    <h2>10. Governing law and disputes</h2>
    <p>
      These terms are governed by the laws applicable at the operator's place of establishment, without regard to
      conflict-of-law rules. If a dispute arises, we will first try to resolve it through good-faith discussion —
      please contact us before taking any other step. If that fails, the dispute may be submitted to the courts with
      jurisdiction at the operator's place of establishment. Nothing in these terms limits any rights you have under
      mandatory consumer protection law in your country of residence.
    </p>

    <h2>11. Contact</h2>
    <p><a href="mailto:micropue@micropue.com.cn">micropue@micropue.com.cn</a></p>
  </LegalDoc>
</template>

<script setup lang="ts">
useHead({ title: 'Legal Terms' })
useSeoMeta({ description: 'The terms that govern your use of BITS: accounts, acceptable use, content and liability.' })
</script>
