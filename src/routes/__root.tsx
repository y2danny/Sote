import { Link, Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { PrivyProvider } from "@privy-io/react-auth";
import { PRIVY_APP_ID, privyConfig } from "@/lib/privy/config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-semibold tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Go home</Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Soté — Pay vendors at the speed of Solana" },
      { name: "description", content: "Cross-border payments for African importers, settled in PUSD on Solana. Pay foreign vendors in USD, SGD, or PUSD direct — in hours, not days." },
      { name: "author", content: "Soté" },
      { property: "og:title", content: "Soté — Pay vendors at the speed of Solana" },
      { property: "og:description", content: "Cross-border payments for African importers, settled in PUSD on Solana." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand/og-image.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/brand/og-image.svg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/brand/logo-mark.svg" },
      { rel: "alternate icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  // PrivyProvider must wrap AuthProvider — AuthProvider depends on usePrivy().
  // SSR note: PrivyProvider is client-only; TanStack Start handles hydration
  // correctly because the children render the same shell on both sides.
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </PrivyProvider>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
