import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  db,
  auth,
  testConnection,
  handleFirestoreError,
  OperationType,
  signInWithPopup,
  signOut,
  googleProvider,
} from '../firebase.ts';
import { InventoryItem, StockMovement, UserProfile, UserRole, MovementType } from '../types.ts';
import { INITIAL_ITEMS, INITIAL_MOVEMENTS, INITIAL_USERS } from '../data/initialData.ts';
import { calculateNewStock, cleanBarcode } from '../utils/inventoryLogic.ts';
import { playScanSuccessSound, playScanErrorSound, triggerHaptic } from '../utils/feedback.ts';

interface InventoryContextType {
  items: InventoryItem[];
  movements: StockMovement[];
  users: UserProfile[];
  currentUser: UserProfile;
  firebaseUser: User | null;
  currentRole: UserRole;
  isCloudConnected: boolean;
  isLoading: boolean;
  switchRole: (role: UserRole) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  findItemByCode: (code: string) => InventoryItem | undefined;
  performMovement: (params: {
    itemId: string;
    type: MovementType;
    quantity: number;
    reason: string;
    reference?: string;
  }) => Promise<{ success: boolean; message: string; newStock?: number }>;
  createItem: (itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'updatedBy'>) => Promise<{ success: boolean; id?: string; message?: string }>;
  updateItem: (id: string, itemData: Partial<InventoryItem>) => Promise<{ success: boolean; message?: string }>;
  deleteItem: (id: string) => Promise<{ success: boolean; message?: string }>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('almacen_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('almacen_movements');
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active profile
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    uid: 'admin-principal',
    email: 'aplic.recimetales@gmail.com',
    displayName: 'Jefe de Almacén (Admin)',
    role: 'admin',
  });

  // Save local mirror
  useEffect(() => {
    localStorage.setItem('almacen_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('almacen_movements', JSON.stringify(movements));
  }, [movements]);

  // Check Firestore connection at boot
  useEffect(() => {
    let mounted = true;

    async function initFirebase() {
      try {
        const connected = await testConnection();
        if (mounted) setIsCloudConnected(connected);
      } catch (err) {
        console.warn('Connection check notice:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    initFirebase();

    // Listen to Firebase auth state
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setFirebaseUser(user);
      if (user) {
        setIsCloudConnected(true);
        const isAdmin = user.email === 'aplic.recimetales@gmail.com';
        const updatedProfile: UserProfile = {
          uid: user.uid,
          email: user.email || 'usuario@almacen.com',
          displayName: user.displayName || user.email?.split('@')[0] || 'Operario',
          role: isAdmin ? 'admin' : 'operator',
          photoURL: user.photoURL || undefined,
        };
        setCurrentUser(updatedProfile);

        // Record or fetch user in users collection
        try {
          await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
        } catch {
          // Rule or network fallback
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribeAuth();
    };
  }, []);

  // Listen to Firestore real-time collections when connected
  useEffect(() => {
    if (!firebaseUser) return;

    // Listen to items
    const unsubItems = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudItems: InventoryItem[] = [];
          snapshot.forEach((d) => {
            cloudItems.push(d.data() as InventoryItem);
          });
          setItems(cloudItems);
        } else {
          // If Firestore collection is empty, seed initial items
          INITIAL_ITEMS.forEach(async (item) => {
            try {
              await setDoc(doc(db, 'items', item.id), item);
            } catch (err) {
              console.warn('Seeding item notice:', err);
            }
          });
        }
      },
      (error) => {
        console.warn('Firestore items listener notification:', error);
      }
    );

    // Listen to movements
    const unsubMovements = onSnapshot(
      collection(db, 'movements'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudMovs: StockMovement[] = [];
          snapshot.forEach((d) => {
            cloudMovs.push(d.data() as StockMovement);
          });
          // sort descending by timestamp
          cloudMovs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setMovements(cloudMovs);
        } else {
          INITIAL_MOVEMENTS.forEach(async (mov) => {
            try {
              await setDoc(doc(db, 'movements', mov.id), mov);
            } catch (err) {
              console.warn('Seeding movement notice:', err);
            }
          });
        }
      },
      (error) => {
        console.warn('Firestore movements listener notification:', error);
      }
    );

    // Listen to users
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudUsers: UserProfile[] = [];
          snapshot.forEach((d) => {
            cloudUsers.push(d.data() as UserProfile);
          });
          setUsers(cloudUsers);
        }
      },
      (error) => {
        console.warn('Firestore users listener notification:', error);
      }
    );

    return () => {
      unsubItems();
      unsubMovements();
      unsubUsers();
    };
  }, [firebaseUser]);

  const switchRole = useCallback((role: UserRole) => {
    setCurrentUser((prev) => {
      let displayName = prev.displayName;
      if (role === 'admin') displayName = 'Jefe de Almacén (Admin)';
      if (role === 'supervisor') displayName = 'Supervisor de Operaciones';
      if (role === 'operator') displayName = 'Operario / Despachador';
      return { ...prev, role, displayName };
    });
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign in error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const findItemByCode = useCallback(
    (code: string): InventoryItem | undefined => {
      if (!code) return undefined;
      const clean = cleanBarcode(code).toLowerCase();
      return items.find(
        (it) =>
          it.barcode.toLowerCase() === clean ||
          it.sku.toLowerCase() === clean ||
          it.id.toLowerCase() === clean ||
          it.name.toLowerCase().includes(clean)
      );
    },
    [items]
  );

  const performMovement = useCallback(
    async ({
      itemId,
      type,
      quantity,
      reason,
      reference,
    }: {
      itemId: string;
      type: MovementType;
      quantity: number;
      reason: string;
      reference?: string;
    }): Promise<{ success: boolean; message: string; newStock?: number }> => {
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        playScanErrorSound();
        triggerHaptic('error');
        return { success: false, message: 'Artículo no encontrado en el catálogo.' };
      }

      // Check role permissions:
      // An operator can do ENTRADA and SALIDA. Only supervisor or admin can do AJUSTE or MERMA.
      if ((type === 'AJUSTE' || type === 'MERMA') && currentUser.role === 'operator') {
        playScanErrorSound();
        triggerHaptic('error');
        return {
          success: false,
          message: 'Permiso denegado: Los ajustes de auditoría y mermas requieren rol de Supervisor o Administrador.',
        };
      }

      const calc = calculateNewStock(item.quantity, type, quantity);
      if (!calc.success) {
        playScanErrorSound();
        triggerHaptic('error');
        return { success: false, message: calc.error || 'Error en el cálculo de existencias.' };
      }

      const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      const newMovement: StockMovement = {
        id: movementId,
        itemId: item.id,
        itemName: item.name,
        barcode: item.barcode,
        type,
        quantity,
        previousStock: item.quantity,
        newStock: calc.newStock,
        reason: reason.trim() || `Registro rápido de ${type.toLowerCase()}`,
        reference: reference ? reference.trim() : `MOV-${Date.now().toString().slice(-6)}`,
        performedBy: currentUser.displayName || currentUser.email,
        performedByRole: currentUser.role,
        timestamp: nowIso,
      };

      const updatedItem: InventoryItem = {
        ...item,
        quantity: calc.newStock,
        lastUpdated: nowIso,
        updatedBy: `${currentUser.displayName} (${currentUser.role})`,
      };

      // Optimistic local update
      setItems((prev) => prev.map((it) => (it.id === item.id ? updatedItem : it)));
      setMovements((prev) => [newMovement, ...prev]);

      playScanSuccessSound();
      triggerHaptic('success');

      // Persist to Cloud Firestore if connected
      if (firebaseUser) {
        try {
          await setDoc(doc(db, 'items', item.id), updatedItem, { merge: true });
          await setDoc(doc(db, 'movements', movementId), newMovement);
        } catch (error) {
          console.warn('Cloud sync error, stored locally:', error);
          // Non-fatal for offline UX
        }
      }

      return {
        success: true,
        message: `${type} registrada exitosamente. Nuevo stock: ${calc.newStock} ${item.unit}.`,
        newStock: calc.newStock,
      };
    },
    [items, currentUser, firebaseUser]
  );

  const createItem = useCallback(
    async (
      itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'updatedBy'>
    ): Promise<{ success: boolean; id?: string; message?: string }> => {
      if (currentUser.role === 'operator') {
        return {
          success: false,
          message: 'Permiso denegado: Solo supervisores o administradores pueden dar de alta artículos nuevos.',
        };
      }

      // Check duplicates
      const existingBarcode = items.find((i) => i.barcode === itemData.barcode.trim());
      if (existingBarcode) {
        return {
          success: false,
          message: `El código de barras "${itemData.barcode}" ya pertenece a "${existingBarcode.name}".`,
        };
      }

      const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      const newItem: InventoryItem = {
        ...itemData,
        id,
        sku: itemData.sku.trim() || `SKU-${Date.now().toString().slice(-5)}`,
        barcode: itemData.barcode.trim(),
        name: itemData.name.trim(),
        lastUpdated: nowIso,
        updatedBy: `${currentUser.displayName} (${currentUser.role})`,
      };

      setItems((prev) => [newItem, ...prev]);

      // Record initial movement
      const initialMov: StockMovement = {
        id: `mov-${Date.now()}`,
        itemId: id,
        itemName: newItem.name,
        barcode: newItem.barcode,
        type: 'ENTRADA',
        quantity: newItem.quantity,
        previousStock: 0,
        newStock: newItem.quantity,
        reason: 'Alta de producto inicial en inventario',
        reference: 'ALTA-CATALOGO',
        performedBy: currentUser.displayName,
        performedByRole: currentUser.role,
        timestamp: nowIso,
      };

      setMovements((prev) => [initialMov, ...prev]);

      if (firebaseUser) {
        try {
          await setDoc(doc(db, 'items', id), newItem);
          await setDoc(doc(db, 'movements', initialMov.id), initialMov);
        } catch (error) {
          console.warn('Cloud sync error on createItem:', error);
        }
      }

      return { success: true, id, message: 'Artículo creado exitosamente.' };
    },
    [currentUser, items, firebaseUser]
  );

  const updateItem = useCallback(
    async (id: string, itemData: Partial<InventoryItem>): Promise<{ success: boolean; message?: string }> => {
      if (currentUser.role === 'operator') {
        return {
          success: false,
          message: 'Permiso denegado: Operarios no pueden modificar los datos maestros del catálogo.',
        };
      }

      const current = items.find((it) => it.id === id);
      if (!current) return { success: false, message: 'Artículo no encontrado.' };

      const updated: InventoryItem = {
        ...current,
        ...itemData,
        lastUpdated: new Date().toISOString(),
        updatedBy: `${currentUser.displayName} (${currentUser.role})`,
      };

      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));

      if (firebaseUser) {
        try {
          await setDoc(doc(db, 'items', id), updated, { merge: true });
        } catch (error) {
          console.warn('Cloud sync updateItem error:', error);
        }
      }

      return { success: true, message: 'Artículo actualizado exitosamente.' };
    },
    [currentUser, items, firebaseUser]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<{ success: boolean; message?: string }> => {
      if (currentUser.role !== 'admin') {
        return {
          success: false,
          message: 'Permiso restringido: Solo un Administrador puede eliminar artículos del sistema.',
        };
      }

      setItems((prev) => prev.filter((it) => it.id !== id));

      if (firebaseUser) {
        try {
          await deleteDoc(doc(db, 'items', id));
        } catch (error) {
          console.warn('Cloud sync deleteItem error:', error);
        }
      }

      return { success: true, message: 'Artículo eliminado del almacén.' };
    },
    [currentUser, firebaseUser]
  );

  return (
    <InventoryContext.Provider
      value={{
        items,
        movements,
        users,
        currentUser,
        firebaseUser,
        currentRole: currentUser.role,
        isCloudConnected,
        isLoading,
        switchRole,
        loginWithGoogle,
        logout,
        findItemByCode,
        performMovement,
        createItem,
        updateItem,
        deleteItem,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory debe ser utilizado dentro de un InventoryProvider');
  }
  return context;
};
