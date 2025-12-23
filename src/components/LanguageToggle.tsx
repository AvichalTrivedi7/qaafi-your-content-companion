import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
      className="gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">{language === 'en' ? 'हिंदी' : 'English'}</span>
    </Button>
  );
};
