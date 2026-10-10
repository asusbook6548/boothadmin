import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { assembliesApi } from '../api/assemblies.api';
import { useAuth } from './auth.context';
import type { Assembly } from '../types';
import toast from 'react-hot-toast';
import { ConfigureAssemblyModal } from '../components/assembly/ConfigureAssemblyModal';

interface AssemblyContextValue {
  assembly: Assembly | null | undefined; // undefined = loading, null = no assembly, Assembly = active
  isLoading: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  refreshAssembly: () => Promise<Assembly | null>;
  submitAssembly: (data: { number: string; name: string; district: string; electionYear: number }) => Promise<void>;
}

const AssemblyContext = createContext<AssemblyContextValue | null>(null);

export function AssemblyProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [assembly, setAssembly] = useState<Assembly | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAssembly = useCallback(async (): Promise<Assembly | null> => {
    setIsLoading(true);
    try {
      const res = await assembliesApi.getAll();
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : (data as unknown as { assemblies?: Assembly[] }).assemblies ?? [];

      const active = list.find((a) => a.isActive) ?? (list.length > 0 ? list[0] : null);

      setAssembly(active);

      if (!active) {
        // Automatically open modal if no assembly exists
        setIsModalOpen(true);
      }

      return active;
    } catch {
      // 404 No Assembly configured
      setAssembly(null);
      setIsModalOpen(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAssembly();
    } else {
      setAssembly(undefined);
      setIsLoading(false);
      setIsModalOpen(false);
    }
  }, [isAuthenticated, fetchAssembly]);

  const submitAssembly = useCallback(
    async (data: { number: string; name: string; district: string; electionYear: number }) => {
      const res = await assembliesApi.create(data);
      const created = (res.data as unknown as { assembly?: Assembly })?.assembly ?? (res.data as unknown as Assembly);

      setAssembly(created);
      setIsModalOpen(false);
      toast.success('Assembly configured successfully!');

      // Notify window / reload components if needed
      window.dispatchEvent(new CustomEvent('assembly:configured', { detail: created }));
    },
    []
  );

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => {
    // Only allow manual closing if an assembly already exists
    if (assembly) {
      setIsModalOpen(false);
    } else {
      setIsModalOpen(false);
    }
  }, [assembly]);

  return (
    <AssemblyContext.Provider
      value={{
        assembly,
        isLoading,
        isModalOpen,
        openModal,
        closeModal,
        refreshAssembly: fetchAssembly,
        submitAssembly,
      }}
    >
      {children}

      {/* Global Configure Assembly Modal */}
      <ConfigureAssemblyModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={submitAssembly}
        isForced={assembly === null}
      />
    </AssemblyContext.Provider>
  );
}

export function useAssembly(): AssemblyContextValue {
  const ctx = useContext(AssemblyContext);
  if (!ctx) {
    throw new Error('useAssembly must be used within an AssemblyProvider');
  }
  return ctx;
}
