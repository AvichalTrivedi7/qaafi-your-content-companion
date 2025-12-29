import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { shipmentService } from '@/services/shipmentService';
import { companyService } from '@/services/companyService';
import { inventoryService } from '@/services/inventoryService';
import { Shipment, ShipmentStatus } from '@/domain/models';
import { 
  Truck, 
  Plus, 
  Search, 
  Building2,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const AdminShipments = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>(shipmentService.getAllShipments());
  const companies = companyService.getAll();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'all'>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('pending');

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || shipment.status === filterStatus;
    const matchesCompany = filterCompany === 'all' || shipment.companyId === filterCompany;
    return matchesSearch && matchesStatus && matchesCompany;
  });

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return '-';
    const company = companies.find(c => c.id === companyId);
    return company?.name || '-';
  };

  const getStatusIcon = (status: ShipmentStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: ShipmentStatus) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'in_transit': return 'default';
      case 'delivered': return 'outline';
      case 'cancelled': return 'destructive';
    }
  };

  const openStatusDialog = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setNewStatus(shipment.status);
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = () => {
    if (!selectedShipment) return;
    
    const updated = shipmentService.updateStatus(selectedShipment.id, newStatus);
    if (updated) {
      setShipments(shipmentService.getAllShipments());
      toast({
        title: t('shipments.updateStatus'),
        description: `${selectedShipment.shipmentNumber} → ${t(`shipments.${newStatus}`)}`,
      });
    }
    setStatusDialogOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('shipments.title')}</h1>
            <p className="text-muted-foreground">{t('admin.shipmentsSubtitle')}</p>
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('shipments.createShipment')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ShipmentStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('shipments.all')}</SelectItem>
              <SelectItem value="pending">{t('shipments.pending')}</SelectItem>
              <SelectItem value="in_transit">{t('shipments.inTransit')}</SelectItem>
              <SelectItem value="delivered">{t('shipments.delivered')}</SelectItem>
              <SelectItem value="cancelled">{t('shipments.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('admin.filterByCompany')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('shipments.all')}</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Shipments Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredShipments.map(shipment => (
            <Card key={shipment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-mono">
                      {shipment.shipmentNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {shipment.customerName}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(shipment.status)}>
                    {getStatusIcon(shipment.status)}
                    <span className="ml-1">{t(`shipments.${shipment.status}`)}</span>
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{shipment.destination}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{getCompanyName(shipment.companyId)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>{shipment.items.length} {t('common.items')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{format(shipment.createdAt, 'MMM dd, yyyy')}</span>
                </div>
                
                {/* Items list */}
                <div className="pt-3 border-t border-border space-y-1">
                  {shipment.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">{item.inventoryItemName}</span>
                      <span className="font-medium">{item.quantity}</span>
                    </div>
                  ))}
                  {shipment.items.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{shipment.items.length - 2} more
                    </p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="pt-3 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => openStatusDialog(shipment)}
                    disabled={shipment.status === 'delivered' || shipment.status === 'cancelled'}
                  >
                    {t('shipments.updateStatus')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredShipments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        )}

        {/* Status Update Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('shipments.updateStatus')}</DialogTitle>
              <DialogDescription>
                {selectedShipment?.shipmentNumber} - {selectedShipment?.customerName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('shipments.status')}</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ShipmentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('shipments.pending')}</SelectItem>
                    <SelectItem value="in_transit">{t('shipments.inTransit')}</SelectItem>
                    <SelectItem value="delivered">{t('shipments.delivered')}</SelectItem>
                    <SelectItem value="cancelled">{t('shipments.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleStatusUpdate}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminShipments;
