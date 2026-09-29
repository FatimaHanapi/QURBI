import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { qurbi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivestockForm, { MissingSummary } from "@/components/agri/LivestockForm";
import StepIndicator from "@/components/agri/StepIndicator";
import StickyActionBar from "@/components/agri/StickyActionBar";
import { getDraft, setDraft } from "@/lib/livestockDraft";
import { MALAYSIA_STATES } from "@/lib/agri";

export default function AddLivestock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [initial, setInitial] = useState(null);
  const [registeredState, setRegisteredState] = useState("");
  const [validation, setValidation] = useState({ missing: [], attempted: false });
  const formRef = useRef(null);

  useEffect(() => {
    const draft = getDraft();
    const resolveRegisteredState = () =>
      user?.id
        ? qurbi.entities.FarmerProfile.filter({ userId: user.id })
            .then((rows) => rows?.[0]?.state || "")
            .catch(() => "")
        : Promise.resolve("");

    resolveRegisteredState().then((state) => {
      setRegisteredState(state);
      const draftState = MALAYSIA_STATES.includes(draft?.state) ? draft.state : state;
      setInitial(draft ? { ...draft, state: draftState, farmLocation: draftState } : (state ? { state, farmLocation: state } : {}));
    });
  }, [user?.id]);

  const handleNext = (data) => {
    setDraft(data);
    navigate("/livestock/add/policy");
  };

  if (initial === null) {
    return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  const { missing, attempted } = validation;
  const hint = attempted && missing.length
    ? <MissingSummary missing={missing} />
    : missing.length
      ? `${missing.length} required item${missing.length === 1 ? "" : "s"} left · Step 1 of 2`
      : "All required details are filled in · Step 1 of 2";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Header
        onBack={() => navigate("/livestock")}
        title="Add Livestock"
        description="Fill in the details for one animal. You'll review and sign on the next step."
      />
      <StepIndicator current={1} className="mt-5" />

      <div className="mt-4">
        <LivestockForm
          ref={formRef}
          initial={initial}
          registeredState={registeredState}
          onSubmit={handleNext}
          submitting={false}
          hideActions
          onValidationChange={setValidation}
        />
      </div>

      <StickyActionBar hint={hint} hintTone={attempted && missing.length ? "danger" : missing.length ? "muted" : "success"}>
        <Button variant="outline" onClick={() => navigate("/livestock")} className="h-12 w-[34%] shrink-0 rounded-2xl">
          Cancel
        </Button>
        <Button onClick={() => formRef.current?.submit()} className="h-12 flex-1 rounded-2xl text-base font-semibold">
          Next: review <ArrowRight className="ml-1.5 h-5 w-5" />
        </Button>
      </StickyActionBar>
    </div>
  );
}

function Header({ onBack, title, description }) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={onBack} aria-label="Back to livestock" className="soft-card flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors hover:bg-muted">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
