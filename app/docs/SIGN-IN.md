# Sign-in

How people sign in to IOpener, what has to be switched on at Firebase, and how to test it.
The code is in `src/lib/signin/`, `src/lib/auth.ts` and `src/app/(auth)/`. The tests beside the code are the detail.

## In short

- Grown-ups sign in with **Google** or with a **link sent to their email**. There are no passwords and no phone codes.
- **Children never sign in.** A child is a profile inside a grown-up's account and uses the app in child mode.
- Firebase Authentication vouches for who a person is. IOpener then keeps **its own session**: one signed cookie.
  Nothing of Firebase's is kept in the browser.
- **Roles are never in a cookie or a token.** Seat, staff role, counsellor and sponsor are read from the database on
  every request. An address listed in `ADMIN_EMAILS` is a super admin.
- Sign-in switches on when its settings are present. Without them the page shows the demo people (`DEMO_LOGIN` on)
  or one line saying sign-in is not set up.
- No Firebase package is installed. The server speaks to Firebase over plain HTTPS and checks tokens with `node:crypto`.

## How it works

### The server makes every call to Firebase

```
Google button ──▶ browser gets a Google credential ──▶ server action
                                                        │ accounts:signInWithIdp
email form ────▶ server action ── accounts:sendOobCode ─┼──▶ Firebase emails a link
link opened ───▶ /login/finish ─▶ server action ────────┤ accounts:signInWithEmailLink
                                                        ▼
                                              Firebase ID token
                                                        │ checked in full (idtoken.ts)
                                                        ▼
                                    which person is this? (people.ts)
                                                        ▼
                                  IOpener's session cookie (session-rules.ts)
```

The browser never talks to the Identity Toolkit and never holds a Firebase token. The only things the server accepts
from a browser are a Google credential and the code of an email link. So a token made any other way (a password
sign-in, an anonymous sign-in, if someone switched those on in the project by mistake) has no way in.
The web API key is used by the server alone and is not sent to a browser. It is still not a secret.

### Checking the ID token (`idtoken.ts`)

Every check Firebase's page "Verify ID tokens using a third-party JWT library" asks for: the algorithm is RS256; the
key id is one of Google's keys for `securetoken@system.gserviceaccount.com`; the signature is right; `aud` is the
project id; `iss` is `https://securetoken.google.com/<project id>`; `sub` is not empty; `exp` is in the future; `iat`
and `auth_time` are in the past. IOpener adds: the email address is present and `email_verified` is exactly `true`;
the sign-in was by Google or by email link, and not inside a tenant; the person signed in within the last five
minutes; the token is for the way of signing in, and the address, that was just used.

Google's keys are fetched once and kept for as long as the answer's `Cache-Control` header allows (never more than a
day). An unknown key id fetches the list again, at most once a minute, so a change of keys is picked up. If the list
cannot be fetched and the kept one is past its time, there are no keys and nobody is signed in until a fetch works.
Clocks may differ by up to 60 seconds for times that must be in the past. The end time gets no allowance.

### The session

| Choice | What was decided |
|---|---|
| What the browser holds | One entry, `io_user`, inside the cookie `__session` (every cookie of the app is an entry of that one, `src/lib/cookie-jar.ts`, because Firebase Hosting passes on no other name): the person's id, when the session began, how they signed in. Signed with `SESSION_SECRET`. Scripts cannot read it; it travels over https only when `SITE_URL` is https |
| How long it lasts | 30 days from signing in. It is not renewed by use |
| Staff, counsellors, sponsors | Asked to sign in again after 12 hours. The role is read on every request, so this holds from the moment a role is given |
| Sign out | Removes the entry on that device. The phone and TV apps ask the server to do it (`POST /api/phone/v1/signout`, full edition) |
| Sign out on every device | Sets `app_user.sessions_valid_after` to now. Every session of that person that began earlier stops counting on its next request. Checked on every request, with the row that is read anyway |
| A deleted person | Their cookie names nobody and signs nobody in |
| The demo | A demo session is marked as one. It counts only while `DEMO_LOGIN` is on, and can only ever be a seeded person |

To end a person's sessions by hand (a lost device, a staff member who left): set `sessions_valid_after` to now on
their row. `endSessionsEverywhere(userId)` in `auth.ts` does it.

### Who a sign-in is (`people.ts`)

1. A person already tied to that Firebase account (`app_user.firebase_uid`) is that person. Google today and an email
   link tomorrow are one Firebase account when the address is the same, so they are one person here.
2. Nobody is tied to the account, and one person here has the address:
   - never signed in before (staff or a counsellor that ops entered by email): tied to the account now;
   - tied to a different Firebase account: refused. Whoever holds an address today does not inherit the family of
     whoever held it before. Staff clear the old tie after checking (`update app_user set firebase_uid = null where id = ...`);
   - in the demo family: refused.
3. Nobody has the account or the address: a new person, with no household yet.
4. An address that changed at the provider is followed, unless another person here already has the new address.
   Then the sign-in is refused: two rows are never merged by a guess.

An address that was not verified never names anyone: the token is refused before this step.

### A new person, and invites

A new person lands on `/login/welcome` and chooses: **start a family space** (a household with them as guardian and
one adult profile, then onboarding) or **join a family** with an invite code (`/join`).
Nothing is made for them before they choose. This is on purpose: a person can be in one household, and the invite
tells people to sign in first. Making a household at sign-in would lock an invited co-guardian or grandparent out
of the household they were invited to. Someone who opens `/join` signed out is sent to sign in and comes straight
back to it with the code still filled in.

### Child mode

Only the exit PIN, or the cookie's 12 hours running out, ends child mode. Signing in and signing out do not, in the
demo as much as anywhere.

- A child cannot reach the sign-in pages while the app can open for the signed-in grown-up: the page sends them to Today.
- When the grown-up's session has ended, the app cannot open, so the sign-in page does. This was a loop before:
  `/today` sent the browser to `/login`, and the list of sealed paths sent it straight back.
- On such a device only a person of that child's household can sign in. Anyone else is refused and nobody new is
  made. After signing in the grown-up is back in child mode.
- Signing out is refused on a device in child mode.
- The demo's "sign in as" used to remove the child-mode cookie. It no longer does, and it follows the same rule.

### Limits (`limit.ts`)

Counted in the database (`signin_ask`), because the server scales to zero and may run as two copies.

| What | Limit |
|---|---|
| Links asked for one address | 3 in 15 minutes, 8 in a day |
| Links asked from one network address | 12 in 15 minutes, 60 in a day |
| Tries to finish a sign-in from one network address | 20 in 15 minutes, 200 in a day |

The table holds a keyed hash, never an address, and rows are removed after a day. Over the network limit the person
is told to wait. Over the limit for one address the page answers exactly as it does when a link is sent, so the form
never says anything about an address, including whether it has an account.

### A six-digit code by email (`code.ts`, `mail.ts`)

Ved, 10 October 2026: "email with OTP". When IOpener has an address to send from (`MAIL_FROM` and `MAIL_PASSWORD`),
the email way in is a six-digit code instead of Firebase's link; without them the link is used as before.

| Choice | What was decided |
|---|---|
| Who sends it | IOpener itself, by SMTP over TLS to Gmail (`smtp.gmail.com:465`), signed in as a Google account with its app password. No mail package: `mail.ts` speaks SMTP with Node's own `tls` |
| The code | Six digits from a secure random source. Kept only as a keyed hash beside a keyed hash of the address (`signin_code`): the table holds neither |
| How long, how often | Works once, for 10 minutes; the fifth wrong try ends it; asking again ends the code before it. Asking is counted exactly as for links (a few for one address, more for one network); tries are counted for the network as for finishing a link |
| Who it signs in | The address's Firebase account, found or made as the service the app runs as (`accountFor`: `accounts:lookup`, then `accounts` with the address marked verified). So a person who signs in by code and later with Google is one person |
| On another device | The address is typed again, as for a link |
| Tidy-up | Codes are removed a day after they are made (the sign-in tidy-up job) |

### Deleting a person (`removal.ts`)

When a household is deleted, the people who signed in only for it are deleted here and must go from Firebase too.
Their Firebase ids are queued inside the deletion's own transaction (`signin_removal`). Right after, in the same run
of the daily job, the server asks Firebase to delete each one (`projects/<id>/accounts:delete`) as the service account
it runs as. The access token comes from Google Cloud's metadata server. No key file is read, ever. What cannot be
removed stays queued for the next run, and the job's result says how many and why. On a developer's machine there is
no such identity: nothing is removed and the result says so.

## Settings

| Name | What it is |
|---|---|
| `FIREBASE_PROJECT_ID` | The Firebase project. Sign-in is "set up" when this and the next are present |
| `FIREBASE_API_KEY` | The project's web API key. Not a secret, but never written in the code |
| `GOOGLE_CLIENT_ID` | The web client id of Google sign-in. Empty: only the email link is offered |
| `SITE_URL` | The site's own address. The email link comes back to it. Must be https in production |
| `SIGNIN_PROXY_HOPS` | 0 when Cloud Run is reached directly, 1 when Firebase Hosting is in front (see below) |
| `SESSION_SECRET` | Signs the cookies. Changing it signs everyone out |
| `ADMIN_EMAILS` | Addresses that are always super admins. Only a verified address counts |
| `DEMO_LOGIN` | `off` in production |
| `SIGNIN_STAND_IN` | Development only. Ignored in production |
| `MAIL_FROM` | The Google account IOpener sends sign-in codes from. With `MAIL_PASSWORD`, codes replace the link |
| `MAIL_PASSWORD` | That account's app password, from Secret Manager (`mail-app-password`). Never in a file or a log |
| `MAIL_HOST`, `MAIL_PORT` | `smtp.gmail.com` and `465` unless set |

`FIREBASE_AUTH_DOMAIN` is not needed and is not read: no page of IOpener is served from the Firebase domain, and the
browser does not run Firebase's own library.

`SIGNIN_PROXY_HOPS`: the limits count by network address, read from the `X-Forwarded-For` list. Anyone can put
anything at the front of that list, so only the end is trusted. Reached directly, Cloud Run adds the visitor last
(0). Behind Firebase Hosting one more server adds itself after the visitor (1). With the wrong number every visitor
looks like one network and the limit is reached quickly. Check it after Hosting goes in front (see "How to test").

## What the owner switches on

In the Firebase console, for `iopener-staging` first and `iopener-prod` later:

1. **Add Firebase to the Google Cloud project**, then open Authentication and press "Get started". Check that the
   project shows the pay-as-you-go plan (a project with a billing account normally does). That matters: the free
   plan sends only 5 sign-in-link emails a day, the paid plan 25,000.
2. **Sign-in method**
   - Google: enable. Note the "Web client ID": it is `GOOGLE_CLIENT_ID`.
   - Email/Password: enable, and switch on **Email link (passwordless sign-in)**. Firebase needs the first for the
     second. IOpener never offers a password.
   - Nothing else. No phone, no anonymous.
3. **Settings, User account linking**: leave "Link accounts that use the same email" on. IOpener relies on it for
   "Google and email link are one person".
4. **Settings, Authorised domains**: add the site's own domain (the `run.app` address for staging, the real domain
   for production). The email link is refused for a domain that is not listed. Remove `localhost` from the production project.
5. **The email itself**: in Project settings, General, set the "Public-facing name" to IOpener: the email calls the
   app by it. Under Authentication, Templates, set the sender name where the console offers it for the sign-in
   link, and leave the action address as Firebase gives it. Firebase does not let the words of this email be changed.
6. **Project settings, General**: the "Web API key" is `FIREBASE_API_KEY`.

In the Google Cloud console:

7. **APIs and services, Credentials, the web client**: under "Authorised JavaScript origins" add the site's
   address (and `http://localhost:3000` on staging if Google sign-in is to be tried from a developer's machine).
8. **The same page, the API key**: under "API restrictions" allow only the Identity Toolkit API. Leave "Application
   restrictions" at none: a referrer restriction would block the server, which sends no referrer.
9. **IAM**: give the service account the web app runs as (`iopener-web`) the role **Firebase Authentication Admin**.
   It is needed only to remove the accounts of deleted people.

Then set `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `GOOGLE_CLIENT_ID` and `SITE_URL` on the Cloud Run service and
release. Keep `DEMO_LOGIN=on` on staging if the demo people are still wanted there: the two live side by side, and
the demo can only ever be a seeded person.

## How to test once Firebase exists

On staging, in a browser, with the site lock on:

1. `/login` shows the Google button and the email form. With `GOOGLE_CLIENT_ID` removed, only the form.
2. Google, with an address IOpener has never seen: lands on the welcome page. "Start my family space" goes to onboarding.
3. Sign out. Sign in with the email link for the same address: the same person, the same household. Then the other way round with a second address.
4. Ask for a link, open it on the same device: no typing. Open another on a phone: asked for the address; a wrong address is refused; the right one signs in.
5. Use a link twice: the second time says it was used already.
6. Enter a staff row by email in the database, sign in with that address: lands in the admin console, and `firebase_uid` is now filled.
7. An address in `ADMIN_EMAILS` with no row: lands in the admin console as super admin.
8. Make an invite in Family. In a private window open `/join`, sign in as a new address, join: seated in that household.
9. Ask for a link four times for one address: the fourth sends no email and the page looks the same. Thirteen asks from one network: told to wait.
10. Child mode: hand the device to a child, end the grown-up's sessions from another device ("Sign out on every device"), reload: the sign-in page opens with the child-mode notice. Sign in: back on Today, still in child mode. Sign in as someone else: refused.
11. Staff session: after 12 hours the admin console asks for sign-in again.
12. Ask for a household to be deleted, let the daily job run after the waiting time: the person is gone from Firebase's user list, and the job's result shows "Sign-in accounts removed".
13. After Firebase Hosting is put in front: set `SIGNIN_PROXY_HOPS=1`, ask for a link from two different networks, and check `signin_ask` has two different `net` keys.

Each of these is also a test in `src/lib/signin/flow.db.test.ts`, run against a stand-in.

## Trying it without Firebase

```
npx tsx scripts/signin-stand-in.ts
```

It prints four lines for `.env.local`. With them, `/login` shows a plain button in place of Google's (it asks which
address to sign in as), and a sign-in link is printed in that terminal instead of being emailed. The stand-in signs
real tokens with its own keys, so every check runs as it will against Firebase. It is ignored in production, and
anywhere unless it is an http address on the same machine. Firebase's own emulator is not used: its tokens are not
signed, and the checks here refuse an unsigned token on purpose.

## What could not be checked against the real service

Firebase has not been added to the projects yet, so these rest on its documentation and on the stand-in:

1. `accounts:signInWithIdp` accepts a Google credential from Google's sign-in button with `postBody` of
   `id_token=...&providerId=google.com` and a request address of `http://localhost` (what Firebase's own browser
   library sends), and checks that the credential is for a client id of the project.
2. `accounts:sendOobCode` with `requestType: EMAIL_SIGNIN`, `continueUrl` and `canHandleCodeInApp: true`, sent with
   the API key from a server, emails the link.
3. The link ends on `continueUrl` with `mode=signIn` and `oobCode` added. `/login/finish` needs both.
4. `accounts:signInWithEmailLink` with `email` and `oobCode`: a code that is old or used answers `INVALID_OOB_CODE`,
   a wrong address `INVALID_EMAIL`.
5. An ID token from an email link names its provider `password`. (`emailLink` is accepted too.)
6. With "Link accounts that use the same email" on, Google and the email link for one address are one account with
   one id; and when Google cannot vouch for an address that already signs in another way, the answer carries
   `needConfirmation` and no token. The page then says to use the email link.
7. Firebase's limits by network address (100 new accounts an hour for one address) count the server, because the
   server makes the calls. Authentication, Settings has a "sign-up quota" that can be raised if this is ever reached.
8. `projects/<id>/accounts:delete` with `localId`, called with the service account's access token, deletes the
   account, and answers `USER_NOT_FOUND` for one that is already gone.
9. Cloud Run's metadata server gives a token that the Identity Toolkit accepts for that call once the role is given.
10. Where the visitor's address sits in `X-Forwarded-For`, on Cloud Run directly and behind Firebase Hosting.
11. Google's sign-in button itself: its look, its width on a phone, and use by keyboard. The pages were looked at
    with a plain button in its place.
12. What the Firebase console offers for the sign-in email (sender name, template), and how the email reads.
13. Mail apps that open a link in their own built-in browser (common on iPhone) do not share cookies with the
    browser that asked. The person is then asked for their address, and is signed in inside the mail app's browser.

## Known gaps

- The Google credential is not tied to the browser with a nonce. A credential lasts an hour and is only ever sent
  from the page to this server over https. Adding a nonce is worth trying once the real service can be tested.
- A refusal that needs staff ("this address is tied to a different sign-in") cannot point anywhere: there is no
  contact page for members yet, and no button in the admin console to clear a tie.
- The one-time code of an email link is part of the address of `/login/finish`, so it appears in the server's
  request log. It works once, and Firebase ends it after a limited time.
