import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions | Pacific Aurora",
  description: "Terms for using Pacific Aurora.",
};

const contactEmail = "pacificaurora2.0@gmail.com";

export default function TermsPage() {
  return (
    <main className="relative mx-auto w-full max-w-3xl px-6 py-16 sm:px-10 sm:py-24">
      <header className="border-b border-white/10 pb-10">
        <p className="text-xs text-foreground-muted">Effective date: October 10, 2026</p>
        <h1 className="mt-4 font-serif text-4xl text-white sm:text-5xl">
          Terms and Conditions
        </h1>
        <p className="mt-6 max-w-[70ch] text-base leading-8 text-foreground-muted">
          By creating an account or signing in to Pacific Aurora, you agree to these
          terms.
        </p>
      </header>

      <div className="max-w-[70ch] space-y-10 py-12 text-sm leading-7 text-foreground-muted sm:text-base">
        <section>
          <h2 className="font-serif text-2xl text-white">Your account</h2>
          <p className="mt-4">
            You are responsible for your account and for keeping your password secure.
            You must provide a valid email address. Tell us if you think someone else
            has accessed your account.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Your content</h2>
          <p className="mt-4">
            What you write belongs to you. You give us permission to store and display
            your content to you, and only as needed to run the service. We do not claim
            ownership of your worlds, books, or characters.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Acceptable use</h2>
          <p className="mt-4">
            Do not use Pacific Aurora to break the law, to attempt to access other
            users&apos; accounts or data, to disrupt or overload the service, or to upload
            malicious code. We may suspend accounts that do.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Availability</h2>
          <p className="mt-4">
            Pacific Aurora is provided as it is. We work to keep it running and your
            data safe, but we do not guarantee that the service will always be
            available or free of errors. Keep your own backups of work that matters to
            you.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Deleting your account</h2>
          <p className="mt-4">
            You can ask us to delete your account at any time by emailing{" "}
            <a className="text-accent underline underline-offset-4" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
            . Deleting a world deletes its books and contents, and deleting a book
            deletes its text. These deletions are permanent.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Limits of liability</h2>
          <p className="mt-4">
            To the extent the law allows, we are not liable for indirect or
            consequential losses, including lost content or lost profits, arising from
            your use of the service.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Changes</h2>
          <p className="mt-4">
            We may update these terms. If we make a significant change we will update
            the effective date above. Continuing to use Pacific Aurora after a change
            means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-white">Contact</h2>
          <p className="mt-4">
            Questions: {" "}
            <a className="text-accent underline underline-offset-4" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </p>
        </section>
      </div>

      <footer className="flex flex-col gap-4 border-t border-white/10 pt-8 text-sm sm:flex-row sm:justify-between">
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy Policy
        </Link>
        <Link href="/" className="text-foreground-muted hover:text-white hover:underline">
          Back to Pacific Aurora
        </Link>
      </footer>
    </main>
  );
}
