import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

interface ConfirmProviderProps {
  children: ReactNode;
}

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolve,
      });
    });
  };

  const handleClose = (value: boolean) => {
    if (modalState.resolve) {
      modalState.resolve(value);
    }
    setModalState({
      isOpen: false,
      options: null,
      resolve: null,
    });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalState.isOpen && modalState.options && (
        <ConfirmModal 
          isOpen={modalState.isOpen}
          options={modalState.options}
          onClose={handleClose}
        />
      )}
    </ConfirmContext.Provider>
  );
};

// Internal ConfirmModal component
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  options: ConfirmOptions;
  onClose: (value: boolean) => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, options, onClose }) => {
  const { title, message, confirmText = 'Confirmer', cancelText = 'Annuler', type = 'warning' } = options;

  const icons = {
    danger: <AlertTriangle className="text-red-600" size={24} />,
    warning: <AlertCircle className="text-amber-600" size={24} />,
    info: <Info className="text-blue-600" size={24} />,
  };

  const colors = {
    danger: 'bg-red-50 text-red-700 border-red-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    info: 'bg-blue-50 text-blue-700 border-blue-100',
  };

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", colors[type])}>
                  {icons[type]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">
                    {title || (type === 'danger' ? 'Attention' : 'Confirmation')}
                  </h3>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {message}
                  </p>
                </div>
                <button 
                  onClick={() => onClose(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 flex gap-3">
              <button
                onClick={() => onClose(false)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => onClose(true)}
                className={cn("flex-1 px-4 py-3 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-opacity-20", buttonColors[type])}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
