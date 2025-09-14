import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedDatabase, clearDatabase } from '@/utils/seedDatabase';
import { useManuscripts } from '@/contexts/ManuscriptsContext';

export const DatabaseSeeder: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { refreshManuscripts } = useManuscripts();
  const { toast } = useToast();

  const handleSeedDatabase = async () => {
    try {
      setIsSeeding(true);
      await seedDatabase();
      await refreshManuscripts();
      toast({
        title: "Success",
        description: "Database seeded with sample manuscripts",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to seed database',
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearDatabase = async () => {
    try {
      setIsClearing(true);
      await clearDatabase();
      await refreshManuscripts();
      toast({
        title: "Success",
        description: "Database cleared successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to clear database',
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Database Tools</CardTitle>
        <CardDescription>
          Development utilities for managing sample data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleSeedDatabase}
          disabled={isSeeding}
          className="w-full"
        >
          {isSeeding ? 'Seeding...' : 'Seed Sample Data'}
        </Button>
        <Button 
          onClick={handleClearDatabase}
          disabled={isClearing}
          variant="destructive"
          className="w-full"
        >
          {isClearing ? 'Clearing...' : 'Clear All Data'}
        </Button>
      </CardContent>
    </Card>
  );
};