import { createContext, useContext, useState, ReactNode } from "react";
import type { KansenkaartResult, FormInputs } from "./types";

interface ResultContextValue {
  inputs: FormInputs | null;
  result: KansenkaartResult | null;
  // when true, the result page should trigger a generation via the API
  pending: boolean;
  startGeneration: (inputs: FormInputs) => void;
  setPreset: (inputs: FormInputs, result: KansenkaartResult) => void;
  setResult: (result: KansenkaartResult) => void;
  reset: () => void;
}

const ResultContext = createContext<ResultContextValue | null>(null);

export function ResultProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputs] = useState<FormInputs | null>(null);
  const [result, setResultState] = useState<KansenkaartResult | null>(null);
  const [pending, setPending] = useState(false);

  const startGeneration = (i: FormInputs) => {
    setInputs(i);
    setResultState(null);
    setPending(true);
  };

  const setPreset = (i: FormInputs, r: KansenkaartResult) => {
    setInputs(i);
    setResultState(r);
    setPending(false);
  };

  const setResult = (r: KansenkaartResult) => {
    setResultState(r);
    setPending(false);
  };

  const reset = () => {
    setInputs(null);
    setResultState(null);
    setPending(false);
  };

  return (
    <ResultContext.Provider value={{ inputs, result, pending, startGeneration, setPreset, setResult, reset }}>
      {children}
    </ResultContext.Provider>
  );
}

export function useResult() {
  const ctx = useContext(ResultContext);
  if (!ctx) throw new Error("useResult must be used within ResultProvider");
  return ctx;
}
