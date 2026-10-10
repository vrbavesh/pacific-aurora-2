import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Pacific Aurora",
  description: "How Pacific Aurora collects, uses, protects, and deletes your data.",
};

const contactEmail = "pacificaurora2.0@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="relative mx-auto w-full max-w-3xl px-6 py-16 sm:px-10 sm:py-24">
      <header className="border-b border-white/10 pb-10">
        <p className="text-xs text-foreground-muted">Effective date: October 10, 2026</p>
        <h1 className="mt-4 font-serif text-4xl text-white sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-6 max-w-[70ch] text-base leading-8 text-foreground-muted">
          Pacific Aurora is a writing and world-building tool. This policy explains
          what we collect, why, and what you can ask us to do.
        </p>
      </header>

      <div className="max-w-[70ch] space-y-10 py-12 text-sm leading-7 text-foreground-muted sm:text-base">
        <section>
          <h2 className="font-serif text-2xl text-white">What we collect</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>Account details: your email address, your username, and your userid.</li>
            <li>If you sign in with Google: the name and email address Google provides.</li>
            <li>
              Your content: the worlds, books, chapters, characters, places, items,
              relationships, timelines, and notes you create.
            </li>
            <li>
              Basic technical data your browser sends when it connects to the service,
              such as an IP address and request logs.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">How we use it</h2>
          <p className="mt-4">
            We use your information only to run Pacific Aurora: to create and secure
            your account, send verification codes, store your work, and show it back
            to you. We do not sell your information and we do not use your writing for
            advertising.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Who can see your work</h2>
          <p className="mt-4">
            Only you. Every world and book is private to the account that created it,
            and other accounts cannot view or access it.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Services we rely on</h2>
          <p className="mt-4">
            We use Supabase for our database and authentication, an email delivery
            provider to send verification codes, a hosting provider to serve the app,
            and Google when you choose to sign in with Google. These providers process
            data on our behalf to operate the service.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Cookies and local storage</h2>
          <p className="mt-4">
            We store a session token and a few interface preferences in your browser
            so you stay signed in and the app remembers how you left it. We do not use
            advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Keeping and deleting your data</h2>
          <p className="mt-4">
            We keep your account and content until you ask us to delete them. To delete
            your account and all of its data, email us at{" "}
            <a className="text-accent underline underline-offset-4" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
            . We will confirm the request and remove your data.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Security</h2>
          <p className="mt-4">
            We use access controls so accounts can only reach their own data. No system
            is perfectly secure, and we cannot promise absolute security.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Children</h2>
          <p className="mt-4">
            Pacific Aurora is not intended for children under 13, and we do not
            knowingly collect their information.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Changes</h2>
          <p className="mt-4">If we change this policy we will update the effective date above.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Contact</h2>
          <p className="mt-4">
            Questions or requests: {" "}
            <a className="text-accent underline underline-offset-4" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
        </section>
      </div>

      <footer className="flex flex-col gap-4 border-t border-white/10 pt-8 text-sm sm:flex-row sm:justify-between">
        <Link href="/terms" className="text-accent hover:underline">
          Terms and Conditions
        </Link>
        <Link href="/" className="text-foreground-muted hover:text-white hover:underline">
          Back to Pacific Aurora
        </Link>
      </footer>
    </main>
  );
}
