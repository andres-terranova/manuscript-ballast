import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_STYLE_RULES } from '@/lib/styleRuleConstants';
import { ManuscriptService } from '@/services/manuscriptService';
import { Manuscript, ManuscriptCreateInput, ManuscriptUpdateInput, dbToFrontend } from '@/types/manuscript';
import { useToast } from '@/hooks/use-toast';
import { ensureSampleData } from '@/utils/seedDatabase';

// Export Manuscript type for backward compatibility
export type { Manuscript } from '@/types/manuscript';

// Remove legacy mock data - we're now DOCX-first
const seedManuscripts: Manuscript[] = [];

interface ManuscriptsContextType {
  manuscripts: Manuscript[];
  loading: boolean;
  error: string | null;
  getManuscriptById: (id: string) => Manuscript | undefined;
  updateManuscript: (id: string, updates: ManuscriptUpdateInput) => Promise<void>;
  addManuscript: (input: ManuscriptCreateInput) => Promise<Manuscript>;
  deleteManuscript: (id: string) => Promise<void>;
  refreshManuscripts: () => Promise<void>;
}

const ManuscriptsContext = createContext<ManuscriptsContextType | undefined>(undefined);

export const ManuscriptsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load manuscripts on mount
  useEffect(() => {
    refreshManuscripts();
  }, []);

  const refreshManuscripts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure sample data exists (for new users)
      await ensureSampleData();
      
      const dbManuscripts = await ManuscriptService.getAllManuscripts();
      const frontendManuscripts = dbManuscripts.map(dbToFrontend);
      setManuscripts(frontendManuscripts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load manuscripts';
      setError(errorMessage);
      console.error('Error loading manuscripts:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getManuscriptById = (id: string) => {
    return manuscripts.find(m => m.id === id);
  };

  const updateManuscript = async (id: string, updates: ManuscriptUpdateInput) => {
    try {
      const updatedDbManuscript = await ManuscriptService.updateManuscript(id, updates);
      const updatedManuscript = dbToFrontend(updatedDbManuscript);
      
      setManuscripts(prev => prev.map(m => 
        m.id === id ? updatedManuscript : m
      ));
      
      toast({
        title: "Success",
        description: "Manuscript updated successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update manuscript';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const addManuscript = async (input: ManuscriptCreateInput): Promise<Manuscript> => {
    try {
      // Ensure default style rules if not provided
      const inputWithDefaults = {
        ...input,
        style_rules: input.style_rules || DEFAULT_STYLE_RULES
      };
      
      const dbManuscript = await ManuscriptService.createManuscript(inputWithDefaults);
      const frontendManuscript = dbToFrontend(dbManuscript);
      
      setManuscripts(prev => [frontendManuscript, ...prev]);
      
      // Only show success toast for non-DOCX uploads or when processing succeeds
      if (!inputWithDefaults.docx_file_path) {
        toast({
          title: "Success",
          description: "Manuscript created successfully",
        });
      }
      
      return frontendManuscript;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create manuscript';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteManuscript = async (id: string) => {
    try {
      await ManuscriptService.deleteManuscript(id);
      setManuscripts(prev => prev.filter(m => m.id !== id));
      
      toast({
        title: "Success",
        description: "Manuscript deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete manuscript';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  return (
    <ManuscriptsContext.Provider value={{ 
      manuscripts, 
      loading, 
      error, 
      getManuscriptById, 
      updateManuscript, 
      addManuscript, 
      deleteManuscript,
      refreshManuscripts 
    }}>
      {children}
    </ManuscriptsContext.Provider>
  );
};

export const useManuscripts = () => {
  const context = useContext(ManuscriptsContext);
  if (context === undefined) {
    throw new Error('useManuscripts must be used within a ManuscriptsProvider');
  }
  return context;
};