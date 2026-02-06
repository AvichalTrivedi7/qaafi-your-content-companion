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
  'nav.companies': { en: 'Companies', hi: 'कंपनियाँ' },
  'nav.goods': { en: 'My Goods', hi: 'मेरा माल' },
  
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
  'dashboard.thisMonth': { en: 'This month', hi: 'इस महीने' },
  'dashboard.products': { en: 'products', hi: 'प्रोडक्ट' },
  
  // Inventory
  'inventory.title': { en: 'Inventory', hi: 'इन्वेंटरी' },
  'inventory.addProduct': { en: 'Add Product', hi: 'प्रोडक्ट जोड़ें' },
  'inventory.productName': { en: 'Product Name', hi: 'प्रोडक्ट का नाम' },
  'inventory.unit': { en: 'Unit', hi: 'इकाई' },
  'inventory.meters': { en: 'Meters', hi: 'मीटर' },
  'inventory.pieces': { en: 'Pieces', hi: 'पीस' },
  'inventory.units': { en: 'units', hi: 'इकाइयाँ' },
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
  'inventory.sku': { en: 'SKU', hi: 'SKU' },
  'inventory.lowStockThreshold': { en: 'Low Stock Threshold', hi: 'कम स्टॉक सीमा' },
  'inventory.enterProductName': { en: 'Enter product name', hi: 'उत्पाद का नाम दर्ज करें' },
  'inventory.enterSku': { en: 'Enter SKU', hi: 'SKU दर्ज करें' },
  'inventory.productAdded': { en: 'Product added successfully', hi: 'उत्पाद सफलतापूर्वक जोड़ा गया' },
  'inventory.addProductDescription': { en: 'Add a new product to your inventory', hi: 'अपनी इन्वेंटरी में नया उत्पाद जोड़ें' },
  'inventory.kg': { en: 'Kilograms', hi: 'किलोग्राम' },
  'inventory.grams': { en: 'Grams', hi: 'ग्राम' },
  'inventory.liters': { en: 'Liters', hi: 'लीटर' },
  'inventory.productUpdated': { en: 'Product updated successfully', hi: 'उत्पाद सफलतापूर्वक अपडेट किया गया' },
  'inventory.productDeleted': { en: 'Product removed successfully', hi: 'उत्पाद सफलतापूर्वक हटाया गया' },
  'inventory.fillAllFields': { en: 'Please fill all required fields', hi: 'कृपया सभी आवश्यक फ़ील्ड भरें' },
  'inventory.skuExists': { en: 'SKU already exists', hi: 'SKU पहले से मौजूद है' },
  'inventory.insufficientStock': { en: 'Insufficient stock available', hi: 'अपर्याप्त स्टॉक उपलब्ध' },
  'inventory.deleteConfirmMessage': { en: 'Are you sure you want to remove this product?', hi: 'क्या आप वाकई इस उत्पाद को हटाना चाहते हैं?' },
  'inventory.filterAll': { en: 'All', hi: 'सभी' },
  'inventory.filterLowStock': { en: 'Low Stock', hi: 'कम स्टॉक' },
  'inventory.filterOutOfStock': { en: 'Out of Stock', hi: 'स्टॉक खत्म' },
  
  // Shipments
  'shipments.title': { en: 'Shipments', hi: 'शिपमेंट' },
  'shipments.createShipment': { en: 'Create Shipment', hi: 'शिपमेंट बनाएं' },
  'shipments.shipmentId': { en: 'Shipment ID', hi: 'शिपमेंट आईडी' },
  'shipments.destination': { en: 'Destination', hi: 'गंतव्य' },
  'shipments.status': { en: 'Status', hi: 'स्थिति' },
  'shipments.pending': { en: 'Pending', hi: 'लंबित' },
  'shipments.dispatched': { en: 'Dispatched', hi: 'भेज दिया गया' },
  'shipments.inTransit': { en: 'In Transit', hi: 'ट्रांज़िट में' },
  'shipments.in_transit': { en: 'In Transit', hi: 'ट्रांज़िट में' },
  'shipments.delivered': { en: 'Delivered', hi: 'डिलीवर हो गया' },
  'shipments.cancelled': { en: 'Cancelled', hi: 'रद्द' },
  'shipments.delayed': { en: 'Delayed', hi: 'विलंबित' },
  'shipments.items': { en: 'Items', hi: 'आइटम' },
  'shipments.createdAt': { en: 'Created', hi: 'बनाया गया' },
  'shipments.updatedAt': { en: 'Updated', hi: 'अपडेट किया गया' },
  'shipments.deliveredAt': { en: 'Delivered', hi: 'डिलीवर किया गया' },
  'shipments.updateStatus': { en: 'Update Status', hi: 'स्थिति अपडेट करें' },
  'shipments.uploadProof': { en: 'Upload Proof', hi: 'प्रमाण अपलोड करें' },
  'shipments.proofOfDelivery': { en: 'Proof of Delivery', hi: 'डिलीवरी का प्रमाण' },
  'shipments.selectProduct': { en: 'Select Product', hi: 'प्रोडक्ट चुनें' },
  'shipments.all': { en: 'All', hi: 'सभी' },
  'shipments.customerName': { en: 'Customer Name', hi: 'ग्राहक का नाम' },
  'shipments.enterCustomerName': { en: 'Enter customer name', hi: 'ग्राहक का नाम दर्ज करें' },
  'shipments.customer': { en: 'Customer', hi: 'ग्राहक' },
  'shipments.totalShipments': { en: 'total shipments', hi: 'कुल शिपमेंट' },
  'shipments.markAs': { en: 'Mark as', hi: 'स्थिति बदलें' },
  'shipments.cancelShipment': { en: 'Cancel Shipment', hi: 'शिपमेंट रद्द करें' },
  'shipments.proofAltText': { en: 'Proof of Delivery', hi: 'डिलीवरी का प्रमाण' },
  'shipments.qty': { en: 'Qty', hi: 'मात्रा' },
  'shipments.availableLabel': { en: 'available', hi: 'उपलब्ध' },
  'shipments.myShipments': { en: 'My Shipments', hi: 'मेरे शिपमेंट' },
  'shipments.trackingHistory': { en: 'Tracking History', hi: 'ट्रैकिंग इतिहास' },
  'shipments.searchOrCreateProduct': { en: 'Search or create product...', hi: 'प्रोडक्ट खोजें या बनाएं...' },
  'shipments.createProduct': { en: 'Create new product', hi: 'नया प्रोडक्ट बनाएं' },
  'shipments.newProductNote': { en: 'A new inventory item will be created with initial stock equal to the shipment quantity.', hi: 'शिपमेंट मात्रा के बराबर प्रारंभिक स्टॉक के साथ एक नया इन्वेंटरी आइटम बनाया जाएगा।' },
  'shipments.productCreated': { en: 'Product created successfully', hi: 'प्रोडक्ट सफलतापूर्वक बनाया गया' },
  'shipments.productExists': { en: 'A product with this name already exists', hi: 'इस नाम का प्रोडक्ट पहले से मौजूद है' },
  'inventory.units.pieces': { en: 'Pieces', hi: 'पीस' },
  'inventory.units.kg': { en: 'Kilograms', hi: 'किलोग्राम' },
  'inventory.units.grams': { en: 'Grams', hi: 'ग्राम' },
  'inventory.units.liters': { en: 'Liters', hi: 'लीटर' },
  'inventory.units.meters': { en: 'Meters', hi: 'मीटर' },
  
  // Shipments - Additional
  'shipments.shipmentDetails': { en: 'Shipment Details', hi: 'शिपमेंट विवरण' },
  'shipments.deleteConfirmTitle': { en: 'Delete Shipment?', hi: 'शिपमेंट हटाएं?' },
  'shipments.deleteConfirmDescription': { en: 'Are you sure you want to delete this shipment? This will release any reserved inventory.', hi: 'क्या आप वाकई इस शिपमेंट को हटाना चाहते हैं? यह किसी भी आरक्षित इन्वेंटरी को जारी करेगा।' },
  'shipments.shipmentDeleted': { en: 'Shipment deleted successfully', hi: 'शिपमेंट सफलतापूर्वक हटाया गया' },
  
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
  'common.yes': { en: 'Yes', hi: 'हाँ' },
  'common.no': { en: 'No', hi: 'नहीं' },
  'common.more': { en: 'more', hi: 'और' },
  'admin.company': { en: 'Company', hi: 'कंपनी' },
  'common.confirmDelete': { en: 'Confirm Delete', hi: 'हटाने की पुष्टि करें' },
  
  // Roles
  'role.admin': { en: 'Admin', hi: 'एडमिन' },
  'role.user': { en: 'User', hi: 'उपयोगकर्ता' },
  'role.logistics': { en: 'Logistics', hi: 'लॉजिस्टिक्स' },
  'role.supplier': { en: 'Supplier', hi: 'सप्लायर' },
  'role.wholesaler': { en: 'Wholesaler', hi: 'थोक विक्रेता' },
  'role.retailer': { en: 'Retailer', hi: 'खुदरा विक्रेता' },
  
  // Dashboard titles
  'dashboard.personalDashboard': { en: 'Personal Dashboard', hi: 'व्यक्तिगत डैशबोर्ड' },
  'dashboard.personalDashboardSubtitle': { en: 'Your overview and activity', hi: 'आपका अवलोकन और गतिविधि' },
  
  // App
  'app.name': { en: 'Qaafi', hi: 'क़ाफ़ी' },
  'app.tagline': { en: 'Simplified Supply Chain', hi: 'सरल सप्लाई चेन' },
  
  // Admin
  'admin.dashboard': { en: 'Admin Dashboard', hi: 'एडमिन डैशबोर्ड' },
  'admin.controlPanel': { en: 'Control Panel', hi: 'कंट्रोल पैनल' },
  'admin.dashboardSubtitle': { en: 'System-wide overview and management', hi: 'सिस्टम-व्यापी अवलोकन और प्रबंधन' },
  'admin.companies': { en: 'Companies', hi: 'कंपनियाँ' },
  'admin.companiesSubtitle': { en: 'Manage suppliers, wholesalers, and retailers', hi: 'सप्लायर, थोक विक्रेता, और खुदरा विक्रेता प्रबंधित करें' },
  'admin.inventorySubtitle': { en: 'Manage all inventory across companies', hi: 'सभी कंपनियों की इन्वेंटरी प्रबंधित करें' },
  'admin.shipmentsSubtitle': { en: 'Track and manage all shipments', hi: 'सभी शिपमेंट ट्रैक और प्रबंधित करें' },
  'admin.totalCompanies': { en: 'Total Companies', hi: 'कुल कंपनियाँ' },
  'admin.suppliers': { en: 'Suppliers', hi: 'सप्लायर' },
  'admin.wholesalers': { en: 'Wholesalers', hi: 'थोक विक्रेता' },
  'admin.retailers': { en: 'Retailers', hi: 'खुदरा विक्रेता' },
  'admin.active': { en: 'active', hi: 'सक्रिय' },
  'admin.addCompany': { en: 'Add Company', hi: 'कंपनी जोड़ें' },
  'admin.editCompany': { en: 'Edit Company', hi: 'कंपनी संपादित करें' },
  'admin.companyName': { en: 'Company Name', hi: 'कंपनी का नाम' },
  'admin.companyType': { en: 'Type', hi: 'प्रकार' },
  'admin.contactEmail': { en: 'Contact Email', hi: 'संपर्क ईमेल' },
  'admin.contactPhone': { en: 'Contact Phone', hi: 'संपर्क फ़ोन' },
  'admin.address': { en: 'Address', hi: 'पता' },
  'admin.accessCode': { en: 'Access Code', hi: 'एक्सेस कोड' },
  'admin.status': { en: 'Status', hi: 'स्थिति' },
  'admin.activate': { en: 'Activate', hi: 'सक्रिय करें' },
  'admin.deactivate': { en: 'Deactivate', hi: 'निष्क्रिय करें' },
  'admin.filterByCompany': { en: 'Filter by company', hi: 'कंपनी द्वारा फ़िल्टर' },
  'admin.assignedTo': { en: 'Assigned To', hi: 'असाइन किया गया' },
  'admin.filterByType': { en: 'Filter by type', hi: 'प्रकार द्वारा फ़िल्टर' },
  'admin.allTypes': { en: 'All Types', hi: 'सभी प्रकार' },
  'admin.searchCompanies': { en: 'Search companies...', hi: 'कंपनियाँ खोजें...' },
  
  // External View
  'external.welcome': { en: 'Welcome', hi: 'स्वागत है' },
  'external.yourGoods': { en: 'Your Goods', hi: 'आपका माल' },
  'external.yourShipments': { en: 'Your Shipments', hi: 'आपके शिपमेंट' },
  'external.goodsSubtitle': { en: 'View your inventory and stock levels', hi: 'अपनी इन्वेंटरी और स्टॉक स्तर देखें' },
  'external.shipmentsSubtitle': { en: 'Track your shipments and delivery status', hi: 'अपने शिपमेंट और डिलीवरी स्थिति ट्रैक करें' },
  'external.noGoods': { en: 'No goods assigned to you', hi: 'आपको कोई माल नहीं दिया गया' },
  'external.noShipments': { en: 'No shipments found', hi: 'कोई शिपमेंट नहीं मिला' },
  
  // Access
  'access.title': { en: 'Access Portal', hi: 'एक्सेस पोर्टल' },
  'access.subtitle': { en: 'Choose how you want to access the system', hi: 'चुनें कि आप सिस्टम तक कैसे पहुंचना चाहते हैं' },
  'access.adminAccess': { en: 'Admin Access', hi: 'एडमिन एक्सेस' },
  'access.adminDescription': { en: 'Full system management and control', hi: 'पूर्ण सिस्टम प्रबंधन और नियंत्रण' },
  'access.externalAccess': { en: 'Company Access', hi: 'कंपनी एक्सेस' },
  'access.externalDescription': { en: 'View your goods and shipments', hi: 'अपना माल और शिपमेंट देखें' },
  'access.enterCode': { en: 'Enter your access code', hi: 'अपना एक्सेस कोड दर्ज करें' },
  'access.submit': { en: 'Access Portal', hi: 'पोर्टल एक्सेस करें' },
  'access.invalidCode': { en: 'Invalid access code', hi: 'अमान्य एक्सेस कोड' },
  'access.companyInactive': { en: 'Company is inactive', hi: 'कंपनी निष्क्रिय है' },
  
  // Auth
  'auth.login': { en: 'Login', hi: 'लॉगिन' },
  'auth.signup': { en: 'Sign Up', hi: 'साइन अप' },
  'auth.logout': { en: 'Logout', hi: 'लॉगआउट' },
  'auth.email': { en: 'Email', hi: 'ईमेल' },
  'auth.password': { en: 'Password', hi: 'पासवर्ड' },
  'auth.loginDescription': { en: 'Sign in to your account', hi: 'अपने खाते में साइन इन करें' },
  'auth.signupDescription': { en: 'Create a new account', hi: 'नया खाता बनाएं' },
  'auth.noAccount': { en: "Don't have an account? Sign up", hi: 'खाता नहीं है? साइन अप करें' },
  'auth.hasAccount': { en: 'Already have an account? Login', hi: 'पहले से खाता है? लॉगिन करें' },
  
  // Common
  'common.back': { en: 'Back', hi: 'वापस' },
  
  // Errors / Not Found
  'error.pageNotFound': { en: 'Oops! Page not found', hi: 'उफ़! पेज नहीं मिला' },
  'error.returnHome': { en: 'Return to Home', hi: 'होम पर वापस जाएं' },
  'error.insufficientStock': { en: 'Insufficient stock', hi: 'अपर्याप्त स्टॉक' },
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
