import { createContext, useContext, useState, type ReactNode } from "react";
import type { Workspace } from "../types/model";
import { usePersistentState } from "../hooks/use-persistent-state";
import {
  initialWorkspace,
  seedWorkspace,
  storageKey,
  validWorkspace,
} from "../services/storage";

type Store = {
  state: Workspace;
  error: string;
  notice: string;
  clearNotice: () => void;
  transact: (change: (draft: Workspace) => void, notice?: string) => boolean;
};

const Context = createContext<Store | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      return { value: initialWorkspace(localStorage), error: "" };
    } catch (e) {
      return { value: seedWorkspace(), error: (e as Error).message };
    }
  });
  const {
    value: state,
    commit,
    error,
  } = usePersistentState(storageKey, initial.value, validWorkspace);
  const [notice, setNotice] = useState("");
  const transact: Store["transact"] = (change, message = "Changes saved") => {
    if (initial.error) return false;
    const ok = commit((current) => {
      const next = structuredClone(current);
      change(next);
      return next;
    });
    if (ok) setNotice(message);
    return ok;
  };
  return (
    <Context.Provider
      value={{
        state,
        error: initial.error || error,
        notice,
        clearNotice: () => setNotice(""),
        transact,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(Context);
  if (!ctx) throw Error("Workspace provider missing");
  return ctx;
}
