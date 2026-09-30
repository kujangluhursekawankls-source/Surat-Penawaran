import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from './AuthContext';
import {
  CompanyProfile,
  Customer,
  Quotation,
  QuotationTemplate,
  UserSettings,
} from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface DataContextType {
  companies: CompanyProfile[];
  customers: Customer[];
  quotations: Quotation[];
  templates: QuotationTemplate[];
  settings: UserSettings | null;
  loading: boolean;
  // Companies
  saveCompany: (company: Partial<CompanyProfile>) => Promise<string>;
  deleteCompany: (id: string) => Promise<void>;
  setDefaultCompany: (id: string) => Promise<void>;
  // Customers
  saveCustomer: (customer: Partial<Customer>) => Promise<string>;
  deleteCustomer: (id: string) => Promise<void>;
  // Quotations
  saveQuotation: (quotation: Partial<Quotation>) => Promise<string>;
  updateQuotationStatus: (id: string, status: Quotation['status']) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  duplicateQuotation: (quotation: Quotation) => Promise<string>;
  // Templates
  saveTemplate: (tmpl: Partial<QuotationTemplate>) => Promise<string>;
  deleteTemplate: (id: string) => Promise<void>;
  // Settings
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  // Backup / Restore
  exportDataJson: () => string;
  importDataJson: (jsonStr: string) => Promise<{ count: number }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-time synchronization with Firestore (STRICT USER OWNERSHIP - NO SAMPLE DUMMY DATA)
  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setCustomers([]);
      setQuotations([]);
      setTemplates([]);
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userId = user.uid;

    // 1. Companies / Profil Kop Surat (Hanya milik user yang sedang login)
    const compQ = query(collection(db, 'companies'), where('userId', '==', userId));
    const unsubComp = onSnapshot(
      compQ,
      (snap) => {
        const list: CompanyProfile[] = [];
        snap.forEach((d) => list.push(d.data() as CompanyProfile));
        setCompanies(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'companies')
    );

    // 2. Customers / Pelanggan (Hanya milik user yang sedang login)
    const custQ = query(collection(db, 'customers'), where('userId', '==', userId));
    const unsubCust = onSnapshot(
      custQ,
      (snap) => {
        const list: Customer[] = [];
        snap.forEach((d) => list.push(d.data() as Customer));
        setCustomers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
    );

    // 3. Quotations / Surat Penawaran (Hanya milik user yang sedang login)
    const quotQ = query(collection(db, 'quotations'), where('userId', '==', userId));
    const unsubQuot = onSnapshot(
      quotQ,
      (snap) => {
        const list: Quotation[] = [];
        snap.forEach((d) => list.push(d.data() as Quotation));
        list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        setQuotations(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'quotations')
    );

    // 4. Templates
    const tmplQ = query(collection(db, 'templates'), where('userId', '==', userId));
    const unsubTmpl = onSnapshot(
      tmplQ,
      (snap) => {
        const list: QuotationTemplate[] = [];
        snap.forEach((d) => list.push(d.data() as QuotationTemplate));
        setTemplates(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'templates')
    );

    // 5. Settings (Format penomoran surat user)
    const unsubSettings = onSnapshot(
      doc(db, 'settings', userId),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as UserSettings);
        } else {
          const initSettings: UserSettings = {
            userId,
            numberFormat: '{Nomor}/SP/{BulanRomawi}/{Tahun}',
            currentSequence: 1,
            sessionTimeoutMinutes: 30,
          };
          setSettings(initSettings);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `settings/${userId}`)
    );

    return () => {
      unsubComp();
      unsubCust();
      unsubQuot();
      unsubTmpl();
      unsubSettings();
    };
  }, [user]);

  // Company Actions
  const saveCompany = async (companyData: Partial<CompanyProfile>): Promise<string> => {
    if (!user) throw new Error('Unauthenticated');
    const id = companyData.id || 'comp_' + Date.now();
    const isFirst = companies.length === 0;

    const data: CompanyProfile = {
      id,
      userId: user.uid,
      name: companyData.name || '',
      address: companyData.address || '',
      city: companyData.city || '',
      postalCode: companyData.postalCode || '',
      phone: companyData.phone || '',
      whatsapp: companyData.whatsapp || '',
      email: companyData.email || '',
      website: companyData.website || '',
      npwp: companyData.npwp || '',
      directorName: companyData.directorName || '',
      directorTitle: companyData.directorTitle || 'Direktur',
      logoUrl: companyData.logoUrl || '',
      signatureUrl: companyData.signatureUrl || '',
      stampUrl: companyData.stampUrl || '',
      backgroundUrl: companyData.backgroundUrl || '',
      isDefault: companyData.isDefault ?? isFirst,
      createdAt: companyData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'companies', id), data);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${id}`);
      return id;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'companies', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `companies/${id}`);
    }
  };

  const setDefaultCompany = async (id: string) => {
    for (const comp of companies) {
      try {
        await updateDoc(doc(db, 'companies', comp.id), {
          isDefault: comp.id === id,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `companies/${comp.id}`);
      }
    }
  };

  // Customer Actions
  const saveCustomer = async (custData: Partial<Customer>): Promise<string> => {
    if (!user) throw new Error('Unauthenticated');
    const id = custData.id || 'cust_' + Date.now();
    const data: Customer = {
      id,
      userId: user.uid,
      name: custData.name || '',
      companyName: custData.companyName || '',
      pic: custData.pic || '',
      address: custData.address || '',
      phone: custData.phone || '',
      whatsapp: custData.whatsapp || '',
      email: custData.email || '',
      notes: custData.notes || '',
      createdAt: custData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'customers', id), data);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customers/${id}`);
      return id;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
    }
  };

  // Quotation Actions
  const saveQuotation = async (qData: Partial<Quotation>): Promise<string> => {
    if (!user) throw new Error('Unauthenticated');
    const id = qData.id || 'quot_' + Date.now();
    const data: Quotation = {
      id,
      userId: user.uid,
      quotationNumber: qData.quotationNumber || 'SP-001',
      date: qData.date || new Date().toISOString().slice(0, 10),
      attachment: qData.attachment || '',
      hasAttachment: qData.hasAttachment ?? Boolean(qData.attachment && qData.attachment.trim()),
      toRecipient: qData.toRecipient || '',
      customerCompany: qData.customerCompany || '',
      customerPic: qData.customerPic || '',
      customerAddress: qData.customerAddress || '',
      customerPhone: qData.customerPhone || '',
      customerEmail: qData.customerEmail || '',
      subject: qData.subject || 'Surat Penawaran Harga',
      companyProfileId: qData.companyProfileId || '',
      companySnapshot: qData.companySnapshot || {},
      openingText: qData.openingText || '',
      closingText: qData.closingText || '',
      items: qData.items || [],
      subtotal: Number(qData.subtotal) || 0,
      discountType: qData.discountType || 'percent',
      discountValue: Number(qData.discountValue) || 0,
      discountAmount: Number(qData.discountAmount) || 0,
      ppnPercent: Number(qData.ppnPercent) || 0,
      ppnAmount: Number(qData.ppnAmount) || 0,
      grandTotal: Number(qData.grandTotal) || 0,
      terbilang: qData.terbilang || '',
      additionalNotes: qData.additionalNotes || '',
      status: qData.status || 'draft',
      createdAt: qData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'quotations', id), data);

      if (settings && (!qData.id || qData.id.startsWith('quot_'))) {
        await updateDoc(doc(db, 'settings', user.uid), {
          currentSequence: (settings.currentSequence || 1) + 1,
          updatedAt: new Date().toISOString(),
        });
      }

      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `quotations/${id}`);
      return id;
    }
  };

  const updateQuotationStatus = async (id: string, status: Quotation['status']) => {
    try {
      await updateDoc(doc(db, 'quotations', id), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `quotations/${id}`);
    }
  };

  const deleteQuotation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'quotations', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `quotations/${id}`);
    }
  };

  const duplicateQuotation = async (original: Quotation): Promise<string> => {
    const newId = 'quot_' + Date.now();
    const duplicated: Quotation = {
      ...original,
      id: newId,
      quotationNumber: `${original.quotationNumber}-COPY`,
      date: new Date().toISOString().slice(0, 10),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'quotations', newId), duplicated);
    return newId;
  };

  // Templates
  const saveTemplate = async (tmpl: Partial<QuotationTemplate>): Promise<string> => {
    if (!user) throw new Error('Unauthenticated');
    const id = tmpl.id || 'tmpl_' + Date.now();
    const data: QuotationTemplate = {
      id,
      userId: user.uid,
      title: tmpl.title || 'Template Baru',
      type: tmpl.type || 'opening',
      content: tmpl.content || '',
      createdAt: tmpl.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'templates', id), data);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `templates/${id}`);
      return id;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'templates', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `templates/${id}`);
    }
  };

  // Settings
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, 'settings', user.uid),
        {
          userId: user.uid,
          ...newSettings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `settings/${user.uid}`);
    }
  };

  // Backup & Restore
  const exportDataJson = (): string => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'SuratPenawaranPro',
      userId: user?.uid,
      companies,
      customers,
      quotations,
      templates,
      settings,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importDataJson = async (jsonStr: string): Promise<{ count: number }> => {
    if (!user) throw new Error('Unauthenticated');
    const parsed = JSON.parse(jsonStr);
    let count = 0;

    if (Array.isArray(parsed.companies)) {
      for (const comp of parsed.companies) {
        await saveCompany({ ...comp, userId: user.uid });
        count++;
      }
    }
    if (Array.isArray(parsed.customers)) {
      for (const cust of parsed.customers) {
        await saveCustomer({ ...cust, userId: user.uid });
        count++;
      }
    }
    if (Array.isArray(parsed.quotations)) {
      for (const q of parsed.quotations) {
        await saveQuotation({ ...q, userId: user.uid });
        count++;
      }
    }
    return { count };
  };

  return (
    <DataContext.Provider
      value={{
        companies,
        customers,
        quotations,
        templates,
        settings,
        loading,
        saveCompany,
        deleteCompany,
        setDefaultCompany,
        saveCustomer,
        deleteCustomer,
        saveQuotation,
        updateQuotationStatus,
        deleteQuotation,
        duplicateQuotation,
        saveTemplate,
        deleteTemplate,
        updateSettings,
        exportDataJson,
        importDataJson,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
