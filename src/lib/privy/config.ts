import type { PrivyClientConfig } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

/**
 * Centralized Privy configuration.
 *
 * Why a separate file:
 *   - Keeps __root.tsx free of marketing-heavy config blocks
 *   - Lets us hot-swap login methods or appearance without touching the router
 *   - Makes it obvious where to add MFA, Apple OAuth, etc. later
 *
 * Login methods enabled:
 *   - email     (one-time-password)
 *   - google    (OAuth)
 *   - wallet    (Phantom, Solflare, any wallet-standard Solana wallet)
 *
 * Embedded wallets:
 *   - Solana embedded wallet auto-created for users without a wallet
 *   - We don't enable EVM embedded wallets — Soté is Solana-only
 */
export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "wallet"],

  // Soté brand palette
  appearance: {
    theme: "light",
    accentColor: "#1f1d1a", // ink
    logo: "/brand/logo-mark.svg",
    showWalletLoginFirst: false,
    walletChainType: "solana-only",
    walletList: ["phantom", "solflare", "backpack", "detected_solana_wallets"],
  },

  embeddedWallets: {
    // EVM embedded wallets are off; Solana is the chain we use
    ethereum: { createOnLogin: "off" },
    solana: { createOnLogin: "users-without-wallets" },
  },

  externalWallets: {
    solana: {
      connectors: toSolanaWalletConnectors(),
    },
  },

  // Soft, non-blocking analytics
  legal: {
    termsAndConditionsUrl: "https://sote.app/terms",
    privacyPolicyUrl: "https://sote.app/privacy",
  },
};

/**
 * The single Privy app ID for Soté. Public — safe to ship in the browser bundle.
 * If you're forking this repo for a new project, replace this in the dashboard
 * AND in .env.local; never hardcode an app ID anywhere except this default.
 */
export const PRIVY_APP_ID =
  import.meta.env.VITE_PRIVY_APP_ID || "cmosl5nnf00uz0dkz3gcqxtlj";
