import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { farmerProfileApi, userApi } from "@/api/apiClient";
import StatusBadge from "@/components/agri/StatusBadge";
import EmptyState from "@/components/agri/EmptyState";
import AdminAccountCard from "@/components/agri/AdminAccountCard";
import { Button } from "@/components/ui/button";
import { AlertCircle, MapPin, UserCheck } from "lucide-react";
import { AdminPageHeader, FilterChips, ListSkeleton, ResultCount, SearchField } from "@/components/admin/AdminUi";
import { verificationInfo } from "@/components/admin/adminFormat";

// Filter keys map to the chip labels; "?status=pending" deep-links from the dashboard.
const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending review", attention: true },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "unverified", label: "Not submitted" },
];
const SORT_ORDER = { pending: 0, rejected: 1, unverified: 2, approved: 3 };

function statusKey(profile) {
  const status = String(profile?.verificationStatus || "unverified").toLowerCase();
  return status === "verified" ? "approved" : status;
}

export default function AdminFarmers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const filterParam = searchParams.get("status") || "all";
  const filter = FILTERS.some((item) => item.value === filterParam) ? filterParam : "all";

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      userApi.list({ role: "farmer", page: 1, limit: 100 }),
      farmerProfileApi.list(),
    ]).then(([userPage, profileRows]) => {
      setUsers(userPage.data || []);
      setProfiles(profileRows || []);
    }).catch((loadError) => setError(loadError.message || "Farmer accounts could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setFilter = (value) => setSearchParams(value === "all" ? {} : { status: value }, { replace: true });

  const profileMap = useMemo(() => {
    const map = {};
    profiles.forEach((profile) => { map[profile.userId] = profile; });
    return map;
  }, [profiles]);

  const farmers = useMemo(
    () => users
      .filter((user) => Boolean(profileMap[user.id]))
      .sort((a, b) => (SORT_ORDER[statusKey(profileMap[a.id])] ?? 9) - (SORT_ORDER[statusKey(profileMap[b.id])] ?? 9)),
    [users, profileMap],
  );

  const counts = useMemo(() => {
    const result = { all: farmers.length };
    farmers.forEach((farmer) => {
      const key = statusKey(profileMap[farmer.id]);
      result[key] = (result[key] || 0) + 1;
    });
    return result;
  }, [farmers, profileMap]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return farmers.filter((farmer) => {
      const profile = profileMap[farmer.id];
      const matchesFilter = filter === "all" || statusKey(profile) === filter;
      const matchesSearch = !term || `${farmer.fullName || ""} ${farmer.email || ""} ${profile?.farmName || ""} ${profile?.farmState || ""}`.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [farmers, filter, profileMap, search]);

  // Always show the main chips; "Not submitted" only when relevant.
  const chipOptions = FILTERS
    .filter((item) => item.value !== "unverified" || counts.unverified || filter === "unverified")
    .map((item) => ({ ...item, count: counts[item.value] || 0 }));
  const activeLabel = FILTERS.find((item) => item.value === filter)?.label.toLowerCase();

  return (
    <div className="animate-fade-in">
      <AdminPageHeader eyebrow="Account management" title="Farmers" description="Review verification requests and open each farmer's profile." />

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Filter farmers by status" options={chipOptions} value={filter} onChange={setFilter} />
        <SearchField id="farmer-search" label="Search farmers" value={search} onChange={setSearch} placeholder="Search name, email, farm or state" disabled={loading} className="lg:w-80" />
      </div>

      {error && (
        <div className="mt-4 flex flex-wrap items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-destructive">Farmers could not be loaded</p><p className="mt-0.5 text-sm text-muted-foreground">{error}</p></div>
          <Button variant="outline" onClick={load}>Try again</Button>
        </div>
      )}

      <div className="mb-3 mt-5">{!loading && !error && <ResultCount shown={filtered.length} total={farmers.length} noun="farmer" />}</div>
      {loading ? <ListSkeleton /> : error ? null : filtered.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((farmer) => {
            const profile = profileMap[farmer.id];
            const key = statusKey(profile);
            const info = verificationInfo(key);
            const name = farmer.fullName || "Unnamed farmer";
            return (
              <AdminAccountCard
                key={farmer.id}
                name={name}
                email={farmer.email}
                subtitle={profile?.farmName || "Farm name not provided"}
                badge={<StatusBadge tone={info.tone} dot className="shrink-0">{info.label}</StatusBadge>}
                attention={key === "pending"}
                ctaLabel="Review verification"
                onClick={() => navigate(`/admin/farmers/${farmer.id}`)}
                meta={[{ icon: MapPin, label: "State", value: profile?.farmState || "State not provided" }]}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={UserCheck}
          title={search ? "No matching farmers" : filter === "all" ? "No farmers yet" : filter === "pending" ? "No farmers waiting for review" : `No ${activeLabel} farmers`}
          description={search ? "Try a different name, email, farm or state." : filter === "pending" ? "All caught up. New verification requests will appear here." : "Farmers appear here after they register a farm profile."}
          action={(search || filter !== "all") ? <Button variant="outline" onClick={() => { setSearch(""); setFilter("all"); }}>Show all farmers</Button> : null}
        />
      )}
    </div>
  );
}
