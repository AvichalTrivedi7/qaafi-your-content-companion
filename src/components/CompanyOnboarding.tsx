import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface CompanyOnboardingProps {
  onComplete: () => void;
}

export const CompanyOnboarding = ({ onComplete }: CompanyOnboardingProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateCompany = async () => {
    if (!companyName.trim() || !companyType) {
      toast({
        title: 'Missing information',
        description: 'Please enter a company name and select a type.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_and_assign_company', {
        company_name: companyName.trim(),
        company_type: companyType as 'supplier' | 'wholesaler' | 'retailer' | 'manufacturer',
      });

      if (error) throw error;

      toast({
        title: 'Company created!',
        description: 'Your company has been set up successfully.',
      });

      // Trigger a refresh of the auth context
      onComplete();
    } catch (error: any) {
      console.error('Failed to create company:', error);
      toast({
        title: 'Failed to create company',
        description: error.message || 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Set Up Your Company</CardTitle>
          <CardDescription>
            Create your company profile to start managing inventory and shipments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Enter your company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyType">Company Type</Label>
            <Select value={companyType} onValueChange={setCompanyType} disabled={isLoading}>
              <SelectTrigger id="companyType">
                <SelectValue placeholder="Select company type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="wholesaler">Wholesaler</SelectItem>
                <SelectItem value="retailer">Retailer</SelectItem>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            className="w-full" 
            onClick={handleCreateCompany}
            disabled={isLoading || !companyName.trim() || !companyType}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Company'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
