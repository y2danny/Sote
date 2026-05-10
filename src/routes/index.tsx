import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { ArrowRight, ShieldCheck, Banknote, Globe2, Clock, FileLock2, Wallet, Building2, Plane, Smartphone, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soté — Pay vendors at the speed of Solana" },
      { name: "description", content: "Cross-border payments for African importers. Pay USD, SGD, or PUSD-direct in hours, not days. Settled in PUSD on Solana." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="bg-bone text-ink">
      <SiteHeader />
      <Hero />
      <TrustStrip />
      <Corridors />
      <HowItWorks />
      <BuiltFor />
      <FAQ />
      <CTA />
      <MobileAppBanner />
      <Footer />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-4 py-3">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full bg-white px-5 shadow-sm">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-8 text-sm text-gray-500 md:flex">
          <a href="#corridors" className="transition-colors hover:text-gray-900">Corridors</a>
          <a href="#how" className="transition-colors hover:text-gray-900">How it works</a>
          <a href="#trust" className="transition-colors hover:text-gray-900">Trust &amp; safety</a>
          <a href="#faq" className="transition-colors hover:text-gray-900">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:inline-block"
          >
            Login
          </Link>
          <Button asChild size="sm" className="rounded-lg bg-ink px-5 text-bone hover:bg-ink/90">
            <Link to="/login">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-paper px-3 py-1 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
            Settling on Solana devnet · launching to mainnet Q3
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-[-0.035em] md:text-7xl">
            Pay vendors at the<br/>speed of Solana.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Soté is the cross-border payment rail for African importers. Sign once, settle in PUSD on Solana,
            and your supplier gets paid in USD, SGD or stablecoin — in hours, not days.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-ink text-bone hover:bg-ink/90">
              <Link to="/login">Open an account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border bg-paper">
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-forest" /> KYC at on-ramp</div>
            <div className="flex items-center gap-2"><FileLock2 className="h-4 w-4 text-forest" /> Auditable on-chain</div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-forest" /> ~4 minute settlement</div>
          </div>
        </div>
        <div className="md:col-span-5">
          <ReceiptMock />
        </div>
      </div>
    </section>
  );
}

function ReceiptMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-kola-50 to-transparent blur-2xl opacity-70" />
      <div className="relative rounded-2xl border border-border bg-paper p-6 shadow-[0_24px_60px_-30px_rgba(14,26,20,0.25)]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Invoice INV-9M2P5</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-success font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Delivered
          </span>
        </div>
        <div className="mt-4">
          <div className="text-xs text-muted-foreground">Pay to</div>
          <div className="text-base font-medium">SG Global Trade Pte Ltd</div>
          <div className="text-xs text-muted-foreground mt-0.5">via USD wire · DBS Bank Singapore</div>
        </div>
        <div className="mt-5 space-y-1.5 text-sm">
          <Row label="Invoice amount" value="8,420.00" />
          <Row label="Soté fee (0.5%)" value="42.10" muted />
          <Row label="Off-ramp fee" value="25.00" muted />
          <Row label="Network fee" value="0.0005" muted />
          <div className="my-2 border-t border-border" />
          <Row label="Total in PUSD" value="8,487.10" bold />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-[11px]">
          <Step label="Signed" done />
          <Step label="On-chain" done />
          <Step label="Vendor paid" done />
        </div>
        <div className="mt-5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="mono">5K9p…3xQa</span>
          <span>Apr 18, 09:14</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`mono tabular ${bold ? "font-semibold" : ""}`}>{value} <span className="text-muted-foreground">PUSD</span></span>
    </div>
  );
}

function Step({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-1.5 w-full rounded-full ${done ? "bg-success" : "bg-border"}`} />
      <span className={done ? "text-ink" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

const testimonials = [
  {
    quote: "Soté has made my payment process better. It is reliable, consistently fast, and removes the delays and storage fees affecting my importing business.",
    name: "Akintunde Adesolan",
    role: "Akintunde Autos Limited · Lagos",
    initials: "AA",
    featured: false,
  },
  {
    quote: "Soté has made me feel safer and more in control of my payments, while strengthening trust with my suppliers and removing the stress around international transactions.",
    name: "Sidney",
    role: "Circuit Rides · Lagos",
    initials: "S",
    featured: true,
  },
  {
    quote: "We can now guarantee faster processing times and provide transparent documentation of every transaction, giving our clients complete visibility and confidence in every payment.",
    name: "Olawunmi Egwuatu",
    role: "Enels Autos · Lagos",
    initials: "OE",
    featured: false,
  },
];

function TrustStrip() {
  return (
    <section id="trust" className="border-b border-border/60 bg-paper py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-4xl font-semibold tracking-tight">
          Hear from businesses growing with Soté
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-2xl p-8 ${
                t.featured ? "bg-ink text-bone" : "border border-border bg-paper"
              }`}
            >
              <span
                className={`font-serif text-5xl leading-none ${
                  t.featured ? "text-bone/30" : "text-kola"
                }`}
              >
                "
              </span>
              <p
                className={`mt-4 flex-1 text-sm leading-relaxed ${
                  t.featured ? "text-bone/80" : "text-muted-foreground"
                }`}
              >
                {t.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    t.featured ? "bg-bone/15 text-bone" : "bg-muted text-ink"
                  }`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className={`text-sm font-medium ${t.featured ? "text-bone" : "text-ink"}`}>
                    {t.name}
                  </div>
                  <div className={`text-xs ${t.featured ? "text-bone/60" : "text-muted-foreground"}`}>
                    {t.role}
                  </div>
                </div>
              </div>
              <div className={`mt-6 border-t pt-5 ${t.featured ? "border-bone/15" : "border-border"}`}>
                <span
                  className={`text-sm font-medium underline-offset-4 hover:underline cursor-pointer ${
                    t.featured ? "text-bone/80" : "text-ink"
                  }`}
                >
                  Read {t.name.split(" ")[0]}'s story
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Corridors() {
  return (
    <section id="corridors" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-kola">Corridors</div>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight">One signature. Three rails.</h2>
          <p className="mt-3 text-muted-foreground">Pick the corridor your vendor needs. Soté handles the conversion, the wire, the receipt — all backed by an on-chain escrow.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <CorridorCard
            icon={<Building2 className="h-5 w-5" />}
            title="USD wire"
            who="US auction houses, freight, suppliers"
            arrival="≈ 4 hours"
            fee="0.5% + $25"
          />
          <CorridorCard
            icon={<Globe2 className="h-5 w-5" />}
            title="SGD transfer"
            who="Singapore suppliers, Jurong trading hubs"
            arrival="≈ 6 hours"
            fee="0.5% + $15"
            highlight
          />
          <CorridorCard
            icon={<Wallet className="h-5 w-5" />}
            title="Direct PUSD"
            who="Crypto-native vendors, freelancers"
            arrival="< 30 seconds"
            fee="0.5%"
          />
        </div>
      </div>
    </section>
  );
}

function CorridorCard({ icon, title, who, arrival, fee, highlight }: { icon: React.ReactNode; title: string; who: string; arrival: string; fee: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border bg-paper p-6 ${highlight ? "border-ink shadow-[0_24px_60px_-40px_rgba(14,26,20,0.4)]" : "border-border"}`}>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-bone">{icon}</span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{who}</p>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Arrival</div>
          <div className="mt-0.5 font-medium">{arrival}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Total fee</div>
          <div className="mt-0.5 font-medium">{fee}</div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-b border-border/60 bg-bone py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-sm font-medium text-kola">How it works</div>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight">Built like a wire. Settles like a wallet.</h2>
        <p className="mt-4 max-w-xl text-muted-foreground">Every payment is a per-invoice escrow on Solana. Funds release only when the off-ramp confirms the vendor was paid — or refund back to you if not.</p>
        <div className="mt-16 space-y-5">
          <HowStep n="1" title="Connect" bg="bg-kola-50"
            desc="Sign in with email or your Solana wallet. KYC happens once at the on-ramp partner."
            visual={<ConnectMock />} />
          <HowStep n="2" title="Quote" bg="bg-ink" dark
            desc="Pick a corridor and amount. See every fee upfront, rate locked for 3 minutes."
            visual={<QuoteMock />} />
          <HowStep n="3" title="Sign" bg="bg-paper border border-border"
            desc="One signature locks PUSD into a per-invoice on-chain escrow. No custody risk."
            visual={<SignMock />} />
          <HowStep n="4" title="Settle" bg="bg-forest" dark
            desc="Soté releases to your vendor — wire, transfer, or PUSD direct — and posts the receipt on-chain."
            visual={<SettleMock />} />
        </div>
      </div>
    </section>
  );
}

function HowStep({ n, title, desc, bg, dark, visual }: {
  n: string; title: string; desc: string; bg: string; dark?: boolean; visual: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl ${bg} px-10 py-12`}>
      <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div className="md:max-w-xs">
          <div className={`text-8xl font-bold leading-none ${dark ? "text-white/10" : "text-ink/10"}`}>{n}</div>
          <h3 className={`mt-3 text-2xl font-semibold ${dark ? "text-bone" : "text-ink"}`}>{title}</h3>
          <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-sage" : "text-muted-foreground"}`}>{desc}</p>
        </div>
        <div className="shrink-0">{visual}</div>
      </div>
    </div>
  );
}

function ConnectMock() {
  return (
    <div className="w-64 rounded-xl border border-border bg-paper p-5 shadow-sm">
      <div className="text-sm font-semibold text-ink">Sign in to Soté</div>
      <div className="mt-4 space-y-2">
        <div className="flex h-9 items-center rounded-lg border border-border px-3 text-xs text-muted-foreground">
          you@business.com
        </div>
        <div className="flex h-9 items-center justify-center rounded-lg bg-ink text-xs font-medium text-bone">
          Continue with email
        </div>
        <div className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border text-xs text-ink">
          <Wallet className="h-3.5 w-3.5" /> Connect wallet
        </div>
      </div>
      <div className="mt-4 text-center text-[10px] text-muted-foreground">KYC required once · Secured by Solana</div>
    </div>
  );
}

function QuoteMock() {
  return (
    <div className="w-64 rounded-xl border border-white/10 bg-white/8 p-5">
      <div className="text-sm font-semibold text-bone">Your quote</div>
      <div className="mt-4 space-y-2.5 text-xs">
        {[
          { l: "Corridor", v: "USD wire · USA" },
          { l: "Invoice amount", v: "$8,420.00" },
          { l: "Soté fee (0.5%)", v: "$42.10" },
          { l: "Off-ramp fee", v: "$25.00" },
        ].map(({ l, v }) => (
          <div key={l} className="flex items-center justify-between">
            <span className="text-bone/50">{l}</span>
            <span className="font-medium text-bone">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
          <span className="text-bone/50">Rate locked for</span>
          <span className="font-semibold text-kola">2:47</span>
        </div>
      </div>
      <div className="mt-4 flex h-8 items-center justify-center rounded-lg bg-kola text-xs font-medium text-bone">
        Confirm &amp; sign →
      </div>
    </div>
  );
}

function SignMock() {
  return (
    <div className="w-64 rounded-xl border border-border bg-paper p-5 shadow-sm">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">On-chain escrow</div>
      <div className="mt-1 text-sm font-semibold text-ink">INV-9M2P5 · SG Global Trade</div>
      <div className="mt-4 rounded-lg bg-muted p-3 text-xs space-y-1.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount locked</span>
          <span className="font-medium">8,487.10 PUSD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Escrow account</span>
          <span className="mono text-[10px]">5K9p…3xQa</span>
        </div>
      </div>
      <div className="mt-4 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-ink text-xs font-medium text-bone">
        <ShieldCheck className="h-3.5 w-3.5" /> Sign &amp; lock
      </div>
    </div>
  );
}

function SettleMock() {
  return (
    <div className="w-64 rounded-xl border border-white/10 bg-white/10 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-[10px] font-bold text-white">✓</span>
        <div className="text-sm font-semibold text-bone">Vendor paid</div>
      </div>
      <div className="mt-4 space-y-2.5 text-xs">
        {[
          { l: "Recipient", v: "SG Global Trade" },
          { l: "Settled via", v: "USD wire · DBS" },
          { l: "Amount", v: "$8,420.00" },
          { l: "Time to settle", v: "3h 52m" },
        ].map(({ l, v }) => (
          <div key={l} className="flex items-center justify-between">
            <span className="text-bone/50">{l}</span>
            <span className="font-medium text-bone">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 text-[10px] text-bone/40 mono">Verified on Solscan ↗</div>
    </div>
  );
}

function BuiltFor() {
  return (
    <section className="border-b border-border/60 bg-bone">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="text-sm font-medium text-kola">Built for importers</div>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight">For the businesses bank wires forgot.</h2>
          </div>
          <div className="md:col-span-7 space-y-6">
            <Feature icon={<Plane className="h-5 w-5" />} title="Auto importers"
              body="Win the Copart auction, pay before the 24-hour deadline. We've moved a Lagos-to-Dallas wire in under 6 hours." />
            <Feature icon={<Banknote className="h-5 w-5" />} title="Goods importers"
              body="Singapore, Houston, New York. Pay your supplier in SGD without holding a Singapore bank account." />
            <Feature icon={<FileLock2 className="h-5 w-5" />} title="Accountants &amp; auditors"
              body="Every invoice ships with a printable receipt and a Solscan-verifiable on-chain proof. Customs-ready." />
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper border border-border">{icon}</span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function FAQ() {
  const items = [
    { q: "Is my money safe in escrow?", a: "Yes. Each payment creates a unique on-chain account that holds your PUSD. Only Soté can release it to your vendor's destination, and only the operator can refund it back to you. The escrow logic is open-source and auditable." },
    { q: "What is PUSD?", a: "PUSD is a regulated US-dollar stablecoin issued by Paxos. It's redeemable 1:1 and built for institutional cross-border payments — including Shariah-compliant flows for northern Nigeria." },
    { q: "How fast is settlement really?", a: "Direct PUSD: under 30 seconds. USD wire: typically under 4 hours during US banking hours. SGD: about 6 hours. We're transparent about partner SLAs, including weekend and holiday windows." },
    { q: "Do my vendors need a crypto wallet?", a: "No. They get paid in their local rail — USD wire to a US bank, SGD to a Singapore bank or PayNow. Only crypto-native vendors receive PUSD directly." },
    { q: "What if the off-ramp fails?", a: "The funds stay in escrow. Soté retries automatically; if it can't settle, we refund you on-chain and the receipt records the full audit trail." },
  ];
  return (
    <section id="faq" className="border-b border-border/60 bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight">Frequently asked</h2>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {items.map((it) => (
            <details key={it.q} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between list-none">
                <span className="text-base font-medium">{it.q}</span>
                <span className="text-muted-foreground transition group-open:rotate-45 text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-ink text-bone">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Move your next invoice in minutes.</h2>
        <p className="mt-4 text-sage max-w-xl mx-auto">Open a free account, fund with PUSD, and pay your first vendor today. No setup fee.</p>
        <div className="mt-8">
          <Button asChild size="lg" className="bg-kola text-bone hover:bg-kola/90">
            <Link to="/login">Open an account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function MobileAppBanner() {
  return (
    <section className="border-t border-border/60 bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-12 md:px-14 md:py-14">
          {/* Background glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-kola/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-forest/20 blur-3xl" />

          <div className="relative flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            {/* Text */}
            <div className="md:max-w-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-sage">
                <span className="h-1.5 w-1.5 rounded-full bg-kola" />
                Coming soon
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-bone md:text-4xl">
                Soté in your pocket.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-sage">
                Approve payments, track settlement, and get delivery notifications — anywhere your deals take you.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <StoreBadge store="ios" />
                <StoreBadge store="android" />
              </div>
              <div className="mt-6 flex items-start gap-2 text-xs text-sage/60">
                <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Notify me at launch — tap a badge above to join the waitlist.</span>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="flex items-end justify-center gap-4 md:justify-end">
              <PhoneMock
                status="Delivered"
                vendor="Copart Auctions LLC"
                amount="8,487.10"
                time="3h 52m"
                highlight
              />
              <PhoneMock
                status="Signing…"
                vendor="SG Global Trade"
                amount="12,550.00"
                time="Pending"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ store }: { store: "ios" | "android" }) {
  const isIos = store === "ios";
  return (
    <div className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 transition hover:bg-white/10 hover:border-white/25">
      <Smartphone className="h-5 w-5 text-bone shrink-0" />
      <div>
        <div className="text-[10px] text-sage leading-none">
          {isIos ? "Download on the" : "Get it on"}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-bone leading-none">
          {isIos ? "App Store" : "Google Play"}
        </div>
      </div>
    </div>
  );
}

function PhoneMock({ status, vendor, amount, time, highlight }: {
  status: string; vendor: string; amount: string; time: string; highlight?: boolean;
}) {
  const delivered = status === "Delivered";
  return (
    <div className={`w-44 shrink-0 rounded-2xl border p-4 text-[11px] shadow-2xl ${highlight ? "border-white/20 bg-white/10" : "border-white/8 bg-white/5 opacity-60"}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-bone/70">Soté</span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${delivered ? "bg-success/20 text-success" : "bg-kola/20 text-kola"}`}>
          {status}
        </span>
      </div>
      <div className="mt-3 text-bone font-medium leading-snug">{vendor}</div>
      <div className="mt-1 text-sage">{amount} PUSD</div>
      <div className="mt-3 flex items-center gap-1.5">
        <div className={`h-1 flex-1 rounded-full ${delivered ? "bg-success" : "bg-kola"}`} />
        <div className={`h-1 flex-1 rounded-full ${delivered ? "bg-success" : "bg-white/10"}`} />
        <div className={`h-1 flex-1 rounded-full ${delivered ? "bg-success" : "bg-white/10"}`} />
      </div>
      <div className="mt-2 text-sage/50">{time}</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-sage border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo variant="dark" />
          <p className="mt-4 text-sm max-w-sm">Cross-border payments for African importers, settled in PUSD on Solana.</p>
        </div>
        <div>
          <div className="text-bone text-sm font-medium">Product</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="#corridors" className="hover:text-bone">Corridors</a></li>
            <li><a href="#how" className="hover:text-bone">How it works</a></li>
            <li><Link to="/login" className="hover:text-bone">Open account</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-bone text-sm font-medium">Company</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="#trust" className="hover:text-bone">Trust &amp; safety</a></li>
            <li><a href="#faq" className="hover:text-bone">FAQ</a></li>
            <li><a href="mailto:hello@sote.app" className="hover:text-bone">hello@sote.app</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs">
          <div>© 2026 Soté. Built for African importers.</div>
          <div>This product runs on Solana devnet with a test PUSD token. Mainnet launch Q3 2026.</div>
        </div>
      </div>
    </footer>
  );
}
