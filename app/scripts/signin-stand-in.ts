/**
 * Starts a stand-in for Firebase sign-in on this machine, so the sign-in pages can be tried with no Firebase project.
 *
 *   npx tsx scripts/signin-stand-in.ts
 *
 * Copy the lines it prints into .env.local and start the app. Then, on /login:
 *   - the Google button is a plain button that asks which address to sign in as;
 *   - "Email me a sign-in link" sends nothing: the link is printed here instead. Open it in the same browser.
 * It keeps everything in memory and forgets it when stopped. It is for development only: the app ignores it in production.
 */
import { startStandIn } from "../src/lib/signin/stand-in";

async function main() {
  const standIn = await startStandIn({ port: Number(process.env.PORT ?? 9911) });
  console.log("Stand-in for Firebase sign-in is running. Put these in .env.local, then start the app:\n");
  for (const [k, v] of Object.entries(standIn.env())) console.log(`${k}=${v}`);
  console.log("\nA link comes back to SITE_URL, so set that to the address you open the app at (http://localhost:3000 by default).");
  console.log("Sign-in links asked for on /login are printed below. Stop with Ctrl+C.\n");
  let printed = 0;
  setInterval(() => {
    for (; printed < standIn.mail.length; printed++) console.log(`Link for ${standIn.mail[printed].to}:\n  ${standIn.mail[printed].link}\n`);
  }, 500);
}

if (process.argv[1]?.endsWith("signin-stand-in.ts")) void main();
