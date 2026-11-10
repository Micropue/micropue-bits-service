<template>
  <div>
    <h2 class="section-title">OAuth</h2>
    <p class="page-lead">Bits OAuth 2.0 endpoints, scopes and flows.</p>

    <section class="group">
      <div class="card doc-card">
        <h4>Registering a service</h4>
        <p>
          Open <strong>OAuth</strong> and choose <strong>Register service</strong>. Select one of your Apps, add its
          redirect URIs, then configure wildcard matching, device flow and access-token expiration.
        </p>
        <p>
          Open the service with <strong>Edit</strong> to view its Client ID. The Client secret is shown only once at
          registration; use <strong>Reset client secret</strong> if it is lost. Each App can have one OAuth service.
        </p>

        <h4>Endpoints</h4>
        <pre>GET  /oauth/authorize
POST /oauth/token
GET  /oauth/userinfo
POST /oauth/revoke
POST /oauth/device/code
GET  /oauth/device</pre>

        <h4>Client authentication</h4>
        <p>
          Send <code>client_id</code> and <code>client_secret</code> in the form body, or use HTTP Basic
          authentication with the client ID as the username and the secret as the password.
        </p>

        <h4>Scopes</h4>
        <ul>
          <li><code>read:user</code> — read your basic profile</li>
          <li><code>read:email</code> — read your email address</li>
        </ul>

        <h4>Authorization code flow</h4>
        <p>
          The signed-in user must have set a username and password before authorizing an application. The consent
          screen shows the signed-in account's avatar and name.
        </p>
        <p>Redirect the user to the authorization endpoint:</p>
        <pre>GET /oauth/authorize?client_id=CLIENT_ID
  &amp;redirect_uri=https://example.com/auth
  &amp;response_type=code
  &amp;scope=read:user%20read:email
  &amp;state=RANDOM_STATE</pre>
        <p>
          After the user approves access, BITS redirects to your registered URI with <code>code</code> and
          <code>state</code>. Exchange the code:</p>
        <pre>POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&amp;code=CODE
&amp;redirect_uri=https://example.com/auth
&amp;client_id=CLIENT_ID
&amp;client_secret=CLIENT_SECRET</pre>
        <p>The response contains an <code>access_token</code> and, when token expiration is enabled, a
          <code>refresh_token</code>.</p>

        <h4>PKCE</h4>
        <p>
          Add <code>code_challenge</code> and <code>code_challenge_method</code> (<code>S256</code> or
          <code>plain</code>) to the authorization request, then send the matching <code>code_verifier</code> when
          exchanging the code.
        </p>

        <h4>UserInfo</h4>
        <pre>GET /oauth/userinfo
Authorization: Bearer ACCESS_TOKEN</pre>
        <p>
          Returns <code>sub</code>, <code>username</code>, <code>nickname</code>, <code>avatar_url</code>,
          <code>profile</code>, and <code>email</code> when the <code>read:email</code> scope was granted.
        </p>

        <h4>Refresh</h4>
        <pre>POST /oauth/token

grant_type=refresh_token
&amp;refresh_token=REFRESH_TOKEN
&amp;client_id=CLIENT_ID
&amp;client_secret=CLIENT_SECRET</pre>
        <p>
          Refresh tokens are rotated: the old token is revoked when a new pair is issued. Reusing an old refresh token
          revokes the entire token family as a security precaution.
        </p>

        <h4>Device flow</h4>
        <p>Request a device code (the app must have device flow enabled):</p>
        <pre>POST /oauth/device/code

client_id=CLIENT_ID
&amp;client_secret=CLIENT_SECRET
&amp;scope=read:user</pre>
        <p>
          Show the returned <code>user_code</code> and send the user to <code>verification_uri</code>. Poll the token
          endpoint with:</p>
        <pre>grant_type=urn:ietf:params:oauth:grant-type:device_code
&amp;device_code=DEVICE_CODE
&amp;client_id=CLIENT_ID
&amp;client_secret=CLIENT_SECRET</pre>
        <p>
          Polling returns <code>authorization_pending</code> until the user approves, then the same token response as
          the authorization code flow.
        </p>

        <h4>Revoke a token</h4>
        <pre>POST /oauth/revoke

token=TOKEN
&amp;client_id=CLIENT_ID
&amp;client_secret=CLIENT_SECRET</pre>

        <h4>Errors</h4>
        <p>
          Token endpoint errors use the standard JSON shape:
          <code>{"error":"invalid_grant","error_description":"..."}</code>.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'OAuth documentation' })
</script>
