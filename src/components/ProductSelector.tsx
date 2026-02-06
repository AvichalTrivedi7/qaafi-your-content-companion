import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InventoryItem, INVENTORY_UNITS, InventoryUnit } from '@/domain/models';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductSelectorProps {
  inventoryItems: InventoryItem[];
  selectedItemId: string;
  onSelect: (item: InventoryItem | null) => void;
  onCreateNew: (name: string, unit: InventoryUnit) => InventoryItem | null;
  disabled?: boolean;
}

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export function ProductSelector({
  inventoryItems,
  selectedItemId,
  onSelect,
  onCreateNew,
  disabled = false,
}: ProductSelectorProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState<InventoryUnit>('pieces');

  const selectedItem = useMemo(
    () => inventoryItems.find((item) => item.id === selectedItemId),
    [inventoryItems, selectedItemId]
  );

  // Filter items by search query (case-insensitive partial match on name)
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return inventoryItems;
    const query = searchQuery.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query)
    );
  }, [inventoryItems, searchQuery]);

  // Check if the search query matches an existing product name (case-insensitive)
  const existingMatch = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return inventoryItems.find(
      (item) => item.name.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [inventoryItems, searchQuery]);

  const canCreateNew = searchQuery.trim().length > 0 && !existingMatch;

  const handleSelect = (itemId: string) => {
    const item = inventoryItems.find((i) => i.id === itemId);
    onSelect(item || null);
    setOpen(false);
    setSearchQuery('');
  };

  const handleCreateNewClick = () => {
    setNewProductName(searchQuery.trim());
    setNewProductUnit('pieces');
    setShowCreateDialog(true);
    setOpen(false);
  };

  const handleCreateConfirm = () => {
    if (!newProductName.trim()) return;

    const createdItem = onCreateNew(newProductName.trim(), newProductUnit);
    if (createdItem) {
      onSelect(createdItem);
      setShowCreateDialog(false);
      setNewProductName('');
      setSearchQuery('');
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedItem ? (
              <span className="truncate">
                {selectedItem.name} ({selectedItem.availableStock} {selectedItem.unit}{' '}
                {t('shipments.availableLabel')})
              </span>
            ) : (
              <span className="text-muted-foreground">{t('shipments.selectProduct')}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t('shipments.searchOrCreateProduct')}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {canCreateNew ? (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full p-2 text-sm text-left hover:bg-accent cursor-pointer"
                    onClick={handleCreateNewClick}
                  >
                    <Plus className="h-4 w-4" />
                    <span>
                      {t('shipments.createProduct')} "<strong>{searchQuery}</strong>"
                    </span>
                  </button>
                ) : (
                  <span className="p-2 text-sm text-muted-foreground">
                    {t('common.noData')}
                  </span>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={handleSelect}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedItemId === item.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        SKU: {item.sku} · {item.availableStock} {item.unit} {t('shipments.availableLabel')}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {canCreateNew && filteredItems.length > 0 && (
                <CommandGroup>
                  <CommandItem
                    value="__create_new__"
                    onSelect={handleCreateNewClick}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>
                      {t('shipments.createProduct')} "<strong>{searchQuery}</strong>"
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create New Product Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.addProduct')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('inventory.productName')}</Label>
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder={t('inventory.productName')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.unit')}</Label>
              <Select
                value={newProductUnit}
                onValueChange={(v) => setNewProductUnit(v as InventoryUnit)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {t(`inventory.units.${unit}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('shipments.newProductNote')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateConfirm} disabled={!newProductName.trim()}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { DEFAULT_LOW_STOCK_THRESHOLD };
