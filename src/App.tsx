import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext.tsx';
import { MobileNavigation, ActiveTab } from './components/MobileNavigation.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { MovementsView } from './components/MovementsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { ScannerModal } from './components/ScannerModal.tsx';
import { ItemFormModal } from './components/ItemFormModal.tsx';
import { ItemDetailModal } from './components/ItemDetailModal.tsx';
import { RoleSwitcherModal } from './components/RoleSwitcherModal.tsx';
import { InventoryItem } from './types.ts';

function WarehouseApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [prefilledBarcode, setPrefilledBarcode] = useState('');

  const handleOpenCreateItem = (barcode = '') => {
    setItemToEdit(null);
    setPrefilledBarcode(barcode);
    setIsItemFormOpen(true);
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsItemFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header & Bottom Tab Bar */}
      <MobileNavigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
      />

      {/* Main Screen Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-4">
        {activeTab === 'inventory' && (
          <InventoryView
            onSelectItem={(it) => setSelectedItem(it)}
            onOpenCreateItem={() => handleOpenCreateItem('')}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'movements' && <MovementsView />}

        {activeTab === 'reports' && <ReportsView />}
      </main>

      {/* Modals & Overlays */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onOpenCreateItemWithCode={(code) => handleOpenCreateItem(code)}
      />

      <ItemFormModal
        isOpen={isItemFormOpen}
        onClose={() => setIsItemFormOpen(false)}
        initialBarcode={prefilledBarcode}
        editItem={itemToEdit}
      />

      <ItemDetailModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(it) => handleOpenEditItem(it)}
      />

      <RoleSwitcherModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <WarehouseApp />
    </InventoryProvider>
  );
}
