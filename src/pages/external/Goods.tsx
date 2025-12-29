import { ExternalLayout } from '@/components/ExternalLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { inventoryService } from '@/services/inventoryService';
import { Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

const ExternalGoods = () => {
  const { t } = useLanguage();
  const { currentCompany } = useCompany();

  // Filter inventory for current company only
  const companyInventory = inventoryService.getAllItems().filter(
    item => item.companyId === currentCompany?.id
  );

  return (
    <ExternalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('external.yourGoods')}</h1>
          <p className="text-muted-foreground">{t('external.goodsSubtitle')}</p>
        </div>

        {/* Inventory Table */}
        {companyInventory.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inventory.productName')}</TableHead>
                    <TableHead className="text-right">{t('inventory.available')}</TableHead>
                    <TableHead className="text-right">{t('inventory.reserved')}</TableHead>
                    <TableHead>{t('inventory.lastUpdated')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyInventory.map(item => {
                    const isLowStock = item.availableStock <= item.lowStockThreshold;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium">{item.availableStock}</span>
                            <span className="text-muted-foreground">{item.unit}</span>
                            {isLowStock && (
                              <Badge variant="outline" className="text-warning border-warning">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {t('inventory.lowStock')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-muted-foreground">{item.reservedStock} {item.unit}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(item.updatedAt, 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('external.noGoods')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ExternalLayout>
  );
};

export default ExternalGoods;
