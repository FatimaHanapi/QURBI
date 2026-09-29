import React, { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/agri/BrandLogo";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const returnTo = safeReturnTo();
  const { loginWithGoogle } = useAuth();

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
      window.location.assign(returnTo || "/");
    } catch (authError) {
      setError(authError?.message || "Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="home-brand-hero min-h-dvh">
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <header className="animate-fade-in flex items-center justify-between">
          <BrandLogo light />
          <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/75 ring-1 ring-white/15 backdrop-blur sm:inline-flex">Farmer portal</span>
        </header>

        <main className="grid flex-1 content-start items-center gap-6 pb-8 pt-10 sm:-translate-y-4 sm:content-center sm:py-8 lg:translate-y-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.75fr)] lg:gap-16 lg:py-14">
          <section className="animate-fade-in max-w-xl text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary/95 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-secondary-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4" /> Verified livestock marketplace
            </span>
            <h1 className="mt-5 text-[2.25rem] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-[3.5rem]">
              Your farm, ready for a wider market.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
              Manage livestock, fulfil buyer orders and grow your farm from one secure place.
            </p>
            <div className="mt-7 hidden grid-cols-3 gap-3 sm:grid">
              <LoginBenefit value="List" label="Livestock" />
              <LoginBenefit value="Track" label="Orders" />
              <LoginBenefit value="Grow" label="Your market" />
            </div>
          </section>

          <section className="animate-slide-up rounded-[2rem] border border-white/35 bg-card/95 p-5 shadow-[0_24px_70px_rgba(35,28,23,0.32)] backdrop-blur-xl sm:p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <p className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">Welcome back</p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Sign in or create a farmer account with Google to continue.</p>
            {error && <div role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 font-bold text-foreground shadow-[0_4px_14px_rgba(65,54,45,0.08)] transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <GoogleIcon className="h-5 w-5" />}
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-muted/65 p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Secure sign-in. Farmer accounts must be verified before livestock can be listed.</span>
            </div>
          </section>
        </main>

        <footer className="text-center text-sm leading-relaxed text-white/80 sm:text-left">By continuing you agree to the QURBI Farmer Terms &amp; Privacy Policy.</footer>
      </div>
    </div>
  );
}

function LoginBenefit({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/10 px-4 py-3 backdrop-blur-sm">
      <strong className="block text-sm font-extrabold text-white">{value}</strong>
      <span className="mt-0.5 block text-xs text-white/75">{label}</span>
    </div>
  );
}
