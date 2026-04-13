'use client';
import { useState, useEffect } from 'react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'ITEM_TO_TABLE' | 'ITEM_WITHIN_TABLE' | 'SUBCHECK_TO_TABLE' | 'TABLE_TRANSFER';
  sourceSubCheckId?: number;
  sourceTableId?: number;
  sourceTableName?: string;
  selectedItemIds?: number[];
  allFlatChecks?: any[];
  tables: any[];
  zones: any[];
  onTransferComplete: () => void;
}

export default function TransferModal({
  isOpen,
  onClose,
  mode,
  sourceSubCheckId,
  sourceTableId,
  sourceTableName,
  selectedItemIds = [],
  allFlatChecks = [],
  tables,
  zones,
  onTransferComplete,
}: TransferModalProps) {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [targetTableId, setTargetTableId] = useState<number | null>(null);
  const [targetSubCheckId, setTargetSubCheckId] = useState<number | 'NEW' | null>(null);
  const [newSubCheckLabel, setNewSubCheckLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [step, setStep] = useState<'SELECT_TARGET' | 'CONFIRM'>('SELECT_TARGET');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3050';

  useEffect(() => {
    if (isOpen) {
      setTargetTableId(null);
      setTargetSubCheckId(null);
      setNewSubCheckLabel('');
      setConfirmationRequired(false);
      setConfirmationMessage('');
      setStep('SELECT_TARGET');
      setIsLoading(false);
      if (zones.length > 0 && !selectedZone) {
        setSelectedZone(zones[0].id);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTitle = () => {
    switch (mode) {
      case 'ITEM_TO_TABLE': return 'Ürünleri Başka Masaya Taşı';
      case 'ITEM_WITHIN_TABLE': return 'Ürünleri Başka Adisyona Taşı';
      case 'SUBCHECK_TO_TABLE': return 'Alt Adisyonu Başka Masaya Taşı';
      case 'TABLE_TRANSFER': return 'Masayı Taşı';
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'ITEM_TO_TABLE': return 'fa-boxes-packing';
      case 'ITEM_WITHIN_TABLE': return 'fa-arrows-turn-to-dots';
      case 'SUBCHECK_TO_TABLE': return 'fa-file-export';
      case 'TABLE_TRANSFER': return 'fa-arrow-right-arrow-left';
    }
  };

  const filteredTables = tables.filter(t => {
    if (!selectedZone) return true;
    return t.zone?.id === selectedZone;
  }).filter(t => {
    // Kendisini gizle
    if (mode === 'TABLE_TRANSFER') return t.id !== sourceTableId;
    if (mode === 'ITEM_TO_TABLE' || mode === 'SUBCHECK_TO_TABLE') return t.id !== sourceTableId;
    return true;
  });

  const handleTransfer = async (confirmed = false) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = '';
      let body: any = {};

      switch (mode) {
        case 'ITEM_TO_TABLE':
          url = `${API_URL}/sales/transfer/items-to-table`;
          body = {
            sourceSubCheckId,
            targetTableId,
            itemIds: selectedItemIds,
            confirmed,
          };
          break;

        case 'ITEM_WITHIN_TABLE':
          url = `${API_URL}/sales/transfer/items-within-table`;
          body = {
            sourceSubCheckId,
            targetSubCheckId: targetSubCheckId === 'NEW' ? 'NEW' : targetSubCheckId,
            itemIds: selectedItemIds,
            newLabel: newSubCheckLabel || undefined,
          };
          break;

        case 'SUBCHECK_TO_TABLE':
          url = `${API_URL}/sales/transfer/subcheck-to-table`;
          body = {
            subCheckId: sourceSubCheckId,
            targetTableId,
            confirmed,
          };
          break;

        case 'TABLE_TRANSFER':
          url = `${API_URL}/sales/transfer/table`;
          body = {
            sourceTableId,
            targetTableId,
            confirmed,
          };
          break;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Transfer başarısız oldu.');
      }

      const data = await res.json();

      // Onay gerekiyor mu?
      if (data.requireConfirmation) {
        setConfirmationRequired(true);
        setConfirmationMessage(data.message);
        setStep('CONFIRM');
        setIsLoading(false);
        return;
      }

      // Başarılı
      const { showSwal, toastSwal } = await import('../utils/swal');
      toastSwal({
        icon: 'success',
        title: 'Transfer Başarılı!',
        text: data.transferCode ? `Kod: ${data.transferCode}` : undefined,
      });

      onTransferComplete();
      onClose();
    } catch (error: any) {
      const { showSwal } = await import('../utils/swal');
      showSwal({
        icon: 'error',
        title: 'Transfer Hatası',
        text: error.message || 'İşlem gerçekleştirilemedi.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showTableSelector = mode === 'ITEM_TO_TABLE' || mode === 'SUBCHECK_TO_TABLE' || mode === 'TABLE_TRANSFER';
  const showSubCheckSelector = mode === 'ITEM_WITHIN_TABLE';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 dark:border-slate-700/50 transform transition-all flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="p-6 text-center shrink-0 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-500/5 dark:to-slate-800">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className={`fat ${getIcon()} text-3xl text-yellow-600 dark:text-yellow-400`}></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{getTitle()}</h2>
          {sourceTableName && (
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Kaynak: <span className="font-bold text-yellow-600 dark:text-yellow-400">{sourceTableName}</span>
              {selectedItemIds.length > 0 && mode !== 'TABLE_TRANSFER' && mode !== 'SUBCHECK_TO_TABLE' && (
                <span className="ml-2 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-bold">
                  {selectedItemIds.length} ürün seçili
                </span>
              )}
            </p>
          )}
        </div>

        {/* Onay Ekranı */}
        {step === 'CONFIRM' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fat fa-triangle-exclamation text-4xl text-amber-600 dark:text-amber-400"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Onay Gerekiyor</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-8">{confirmationMessage}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setStep('SELECT_TARGET'); setConfirmationRequired(false); }}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
              >
                İptal
              </button>
              <button
                onClick={() => handleTransfer(true)}
                disabled={isLoading}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-white rounded-2xl font-bold shadow-lg shadow-yellow-500/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2"><i className="fat fa-spinner-third fa-spin"></i> İşleniyor...</span>
                ) : (
                  <span className="flex items-center gap-2"><i className="fat fa-check"></i> Evet, Taşı</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Hedef Seçici */}
        {step === 'SELECT_TARGET' && (
          <>
            <div className="flex-1 overflow-y-auto p-4">

              {/* Masa Seçimi */}
              {showTableSelector && (
                <>
                  {/* Zone Tabs */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                    {zones.map(z => (
                      <button
                        key={z.id}
                        onClick={() => setSelectedZone(z.id)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                          selectedZone === z.id
                            ? 'bg-yellow-500 text-white border-yellow-500 shadow-md shadow-yellow-500/20'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-yellow-400'
                        }`}
                      >
                        {z.name}
                      </button>
                    ))}
                  </div>

                  {/* Table Grid */}
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredTables.map(table => (
                      <button
                        key={table.id}
                        onClick={() => setTargetTableId(table.id)}
                        className={`relative p-4 rounded-2xl border-2 transition-all text-center ${
                          targetTableId === table.id
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 shadow-lg shadow-yellow-500/20 scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-yellow-300 dark:hover:border-yellow-500/50'
                        }`}
                      >
                        <span className="text-2xl mb-1 block">
                          {table.status === 'BOŞ' ? '🪑' : table.status === 'REZERVE' ? '📅' : '🍽️'}
                        </span>
                        <span className="font-extrabold text-slate-800 dark:text-white text-sm block">{table.name}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block uppercase ${
                          table.status === 'BOŞ'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : table.status === 'REZERVE'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                        }`}>
                          {table.status}
                        </span>
                        {table.status === 'DOLU' && table.currentTotal > 0 && (
                          <span className="block text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">
                            ₺{Number(table.currentTotal).toFixed(0)}
                          </span>
                        )}
                        {targetTableId === table.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <i className="fat fa-check text-white text-xs"></i>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Alt Adisyon Seçimi (Masa İçi) */}
              {showSubCheckSelector && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    <i className="fat fa-list mr-2"></i> Hedef Alt Adisyon Seçin
                  </p>

                  {/* Yeni Adisyon Oluştur */}
                  <button
                    onClick={() => setTargetSubCheckId('NEW')}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                      targetSubCheckId === 'NEW'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 shadow-lg shadow-yellow-500/20'
                        : 'border-dashed border-slate-300 dark:border-slate-600 hover:border-yellow-400'
                    }`}
                  >
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl flex items-center justify-center">
                      <i className="fat fa-plus text-yellow-600 dark:text-yellow-400 text-xl"></i>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white block">Yeni Alt Adisyon Oluştur</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Ürünler yeni bir alt adisyona taşınır</span>
                    </div>
                  </button>

                  {targetSubCheckId === 'NEW' && (
                    <div className="pl-4">
                      <input
                        type="text"
                        placeholder="Adisyon adı (opsiyonel)"
                        value={newSubCheckLabel}
                        onChange={(e) => setNewSubCheckLabel(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold text-sm dark:text-white"
                      />
                    </div>
                  )}

                  {/* Mevcut adisyonlar */}
                  {allFlatChecks
                    .filter(c => c.id !== sourceSubCheckId)
                    .map(check => (
                      <button
                        key={check.id}
                        onClick={() => setTargetSubCheckId(check.id)}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                          targetSubCheckId === check.id
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 shadow-lg shadow-yellow-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-yellow-400'
                        }`}
                      >
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                          <i className="fat fa-file-lines text-indigo-600 dark:text-indigo-400 text-xl"></i>
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 dark:text-white block">
                            {check.subCheckLabel || `Adisyon ${check.subCheckIndex + 1}`}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {check.items?.length || 0} ürün · ₺{Number(check.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        {targetSubCheckId === check.id && (
                          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                            <i className="fat fa-check text-white text-xs"></i>
                          </div>
                        )}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleTransfer(false)}
                  disabled={
                    isLoading ||
                    (showTableSelector && !targetTableId) ||
                    (showSubCheckSelector && !targetSubCheckId)
                  }
                  className="flex-[2] py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-white rounded-2xl font-bold text-sm shadow-lg shadow-yellow-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fat fa-spinner-third fa-spin"></i> İşleniyor...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fat fa-arrow-right"></i> Transfer Et
                    </span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
