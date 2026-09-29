import React, { useEffect, useMemo, useState } from "react";
import { qurbi } from "@/api/qurbiClient";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/agri/EmptyState";
import StatusBadge from "@/components/agri/StatusBadge";
import AdminAccountCard from "@/components/agri/AdminAccountCard";
import { AlertCircle, CalendarDays, Loader2, RefreshCw, Users } from "lucide-react";
import { AdminPageHeader, ListSkeleton, ResultCount, SearchField } from "@/components/admin/AdminUi";
import { formatDateTime } from "@/components/admin/adminFormat";

function buyerName(buyer) {
  return buyer.name || buyer.full_name || buyer.email?.split("@")[0] || "Unnamed buyer";
}

export default function AdminUsers() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [response, localAdmins] = await Promise.all([
        qurbi.functions.invoke("fetchAisyahUsers"),
        qurbi.entities.User.filter({ role: "admin" }, "-created_date", 500),
      ]);
      const rows = response?.data?.users;
      if (!Array.isArray(rows)) throw new Error("QURBI User returned an invalid buyer list.");
      const adminEmails = new Set(
        (localAdmins || [])
          .map((admin) => admin.email?.trim().toLowerCase())
          .filter(Boolean),
      );
      setBuyers(rows.filter((buyer) => {
        const email = buyer.email?.trim().toLowerCase();
        const role = (buyer.data?.role || buyer.role || "").trim().toLowerCase();
        return Boolean(email) && role !== "admin" && !adminEmails.has(email);
      }));
    } catch (loadError) {
      setBuyers([]);
      setError(loadError?.response?.data?.error || loadError?.message || "Could not retrieve buyers from QURBI User.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return buyers;
    return buyers.filter((buyer) => `${buyerName(buyer)} ${buyer.email || ""}`.toLowerCase().includes(term));
  }, [buyers, search]);

  return (
    <div className="animate-fade-in">
      <AdminPageHeader
        eyebrow="Account management"
        title="Buyers"
        description="Accounts registered in the QURBI buyer app."
        actions={(
          <Button variant="outline" onClick={load} disabled={loading} aria-label="Refresh buyer accounts" className="rounded-full px-3 sm:px-4">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}
      />

      {error && (
        <div className="mt-4 flex flex-wrap items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-destructive">Buyer data could not be loaded</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">Check that `fetchAisyahUsers` is deployed and its QURBI User app access is still valid.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>Try again</Button>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {!loading && !error && <ResultCount shown={filtered.length} total={buyers.length} noun="buyer" />}
          {!loading && !error && <StatusBadge tone="info" className="shrink-0">Synced from buyer app</StatusBadge>}
        </div>
        <SearchField id="buyer-search" label="Search buyers" value={search} onChange={setSearch} placeholder="Search by name or email" disabled={loading || Boolean(error)} className="sm:w-80" />
      </div>

      <div className="mt-4">
        {loading ? <ListSkeleton rows={3} /> : error ? null : filtered.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((buyer) => (
              <AdminAccountCard
                key={buyer.id || buyer.email}
                name={buyerName(buyer)}
                email={buyer.email}
                badge={<StatusBadge tone="info" className="shrink-0">Buyer</StatusBadge>}
                accent="buyer"
                meta={[{ icon: CalendarDays, label: "Registered", value: `Joined ${formatDateTime(buyer.created_date || buyer.firstSeenAt, "date not available")}` }]}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={search ? "No matching buyers" : "No buyers yet"}
            description={search ? "Try another buyer name or email." : "QURBI User is connected, but no buyer accounts have registered yet."}
            action={search ? <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button> : null}
          />
        )}
      </div>
    </div>
  );
}
