import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'nav.inventory': { en: 'Inventory', hi: 'इन्वेंटरी' },
  'nav.shipments': { en: 'Shipments', hi: 'शिपमेंट' },
  'nav.settings': { en: 'Settings', hi: 'सेटिंग्स' },
  
  // Dashboard
  'dashboard.title': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'dashboard.welcome': { en: 'Welcome back', hi: 'वापसी पर स्वागत है' },
  'dashboard.totalInventory': { en: 'Total Inventory', hi: 'कुल इन्वेंटरी' },
  'dashboard.availableStock': { en: 'Available Stock', hi: 'उपलब्ध स्टॉक' },
  'dashboard.reservedStock': { en: 'Reserved Stock', hi: 'आरक्षित स्टॉक' },
  'dashboard.lowStockAlerts': { en: 'Low Stock Alerts', hi: 'कम स्टॉक अलर्ट' },
  'dashboard.shipmentsInTransit': { en: 'In Transit', hi: 'ट्रांज़िट में' },
  'dashboard.shipmentsDelivered': { en: 'Delivered', hi: 'डिलीवर हो गया' },
  'dashboard.shipmentsDelayed': { en: 'Delayed', hi: 'विलंबित' },
  'dashboard.recentActivity': { en: 'Recent Activity', hi: 'हाल की गतिविधि' },
  'dashboard.needsAttention': { en: 'Needs Attention', hi: 'ध्यान देने की ज़रूरत' },
  'dashboard.todayMovement': { en: "Today's Movement", hi: 'आज की गतिविधि' },
  'dashboard.stockIn': { en: 'Stock In', hi: 'स्टॉक इन' },
  'dashboard.stockOut': { en: 'Stock Out', hi: 'स्टॉक आउट' },
  'dashboard.avgDeliveryTime': { en: 'Avg Delivery Time', hi: 'औसत डिलीवरी समय' },
  'dashboard.days': { en: 'days', hi: 'दिन' },
  
  // Inventory
  'inventory.title': { en: 'Inventory', hi: 'इन्वेंटरी' },
  'inventory.addProduct': { en: 'Add Product', hi: 'प्रोडक्ट जोड़ें' },
  'inventory.productName': { en: 'Product Name', hi: 'प्रोडक्ट का नाम' },
  'inventory.unit': { en: 'Unit', hi: 'इकाई' },
  'inventory.meters': { en: 'Meters', hi: 'मीटर' },
  'inventory.pieces': { en: 'Pieces', hi: 'पीस' },
  'inventory.available': { en: 'Available', hi: 'उपलब्ध' },
  'inventory.reserved': { en: 'Reserved', hi: 'आरक्षित' },
  'inventory.lastUpdated': { en: 'Last Updated', hi: 'अंतिम अपडेट' },
  'inventory.actions': { en: 'Actions', hi: 'कार्रवाई' },
  'inventory.stockIn': { en: 'Stock In', hi: 'स्टॉक इन' },
  'inventory.stockOut': { en: 'Stock Out', hi: 'स्टॉक आउट' },
  'inventory.activityLog': { en: 'Activity Log', hi: 'गतिविधि लॉग' },
  'inventory.quantity': { en: 'Quantity', hi: 'मात्रा' },
  'inventory.lowStock': { en: 'Low Stock', hi: 'कम स्टॉक' },
  'inventory.inStock': { en: 'In Stock', hi: 'स्टॉक में' },
  'inventory.searchProducts': { en: 'Search products...', hi: 'प्रोडक्ट खोजें...' },
  
  // Shipments
  'shipments.title': { en: 'Shipments', hi: 'शिपमेंट' },
  'shipments.createShipment': { en: 'Create Shipment', hi: 'शिपमेंट बनाएं' },
  'shipments.shipmentId': { en: 'Shipment ID', hi: 'शिपमेंट आईडी' },
  'shipments.destination': { en: 'Destination', hi: 'गंतव्य' },
  'shipments.status': { en: 'Status', hi: 'स्थिति' },
  'shipments.dispatched': { en: 'Dispatched', hi: 'भेज दिया गया' },
  'shipments.inTransit': { en: 'In Transit', hi: 'ट्रांज़िट में' },
  'shipments.delivered': { en: 'Delivered', hi: 'डिलीवर हो गया' },
  'shipments.delayed': { en: 'Delayed', hi: 'विलंबित' },
  'shipments.items': { en: 'Items', hi: 'आइटम' },
  'shipments.createdAt': { en: 'Created', hi: 'बनाया गया' },
  'shipments.updatedAt': { en: 'Updated', hi: 'अपडेट किया गया' },
  'shipments.updateStatus': { en: 'Update Status', hi: 'स्थिति अपडेट करें' },
  'shipments.uploadProof': { en: 'Upload Proof', hi: 'प्रमाण अपलोड करें' },
  'shipments.proofOfDelivery': { en: 'Proof of Delivery', hi: 'डिलीवरी का प्रमाण' },
  'shipments.selectProduct': { en: 'Select Product', hi: 'प्रोडक्ट चुनें' },
  'shipments.all': { en: 'All', hi: 'सभी' },
  
  // Common
  'common.save': { en: 'Save', hi: 'सेव करें' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें' },
  'common.delete': { en: 'Delete', hi: 'हटाएं' },
  'common.edit': { en: 'Edit', hi: 'संपादित करें' },
  'common.search': { en: 'Search', hi: 'खोजें' },
  'common.filter': { en: 'Filter', hi: 'फ़िल्टर' },
  'common.loading': { en: 'Loading...', hi: 'लोड हो रहा है...' },
  'common.noData': { en: 'No data available', hi: 'कोई डेटा उपलब्ध नहीं' },
  'common.today': { en: 'Today', hi: 'आज' },
  'common.yesterday': { en: 'Yesterday', hi: 'कल' },
  'common.viewAll': { en: 'View All', hi: 'सभी देखें' },
  'common.items': { en: 'items', hi: 'आइटम' },
  'common.add': { en: 'Add', hi: 'जोड़ें' },
  'common.close': { en: 'Close', hi: 'बंद करें' },
  
  // Roles
  'role.admin': { en: 'Admin', hi: 'एडमिन' },
  'role.logistics': { en: 'Logistics', hi: 'लॉजिस्टिक्स' },
  
  // App
  'app.name': { en: 'Qaafi', hi: 'क़ाफ़ी' },
  'app.tagline': { en: 'Simplified Supply Chain', hi: 'सरल सप्लाई चेन' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
