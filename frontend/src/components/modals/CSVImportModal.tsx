import { useState } from 'react';
import { Modal } from '../Modal';
import { useFinance } from '../../context/FinanceContext';
import { apiFetch } from '../../services/api';
import { Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose }) => {
  const { refreshFinanceData } = useFinance();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSuccessMsg('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', file);

    const res = await apiFetch<{ count: number; message: string }>('/transactions/import', {
      method: 'POST',
      body: formData
    });

    setUploading(false);

    if (res.success && res.data) {
      setSuccessMsg(res.data.message);
      await refreshFinanceData();
      setTimeout(() => {
        onClose();
        setFile(null);
        setSuccessMsg('');
      }, 1500);
    } else {
      setError(res.error || 'Failed to parse and import CSV file.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Transactions via CSV">
      <form onSubmit={handleUpload} className="space-y-4">
        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-finance-emerald/10 border border-finance-emerald/30 text-finance-emerald rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="border-2 border-dashed border-finance-border hover:border-finance-emerald/50 rounded-2xl p-8 text-center bg-finance-bg/50 transition-colors">
          <FileSpreadsheet className="w-10 h-10 text-finance-emerald mx-auto mb-3" />
          <p className="text-sm font-semibold text-finance-text mb-1">
            {file ? file.name : 'Select or drag bank statement CSV'}
          </p>
          <p className="text-xs text-finance-muted mb-4">
            Supports CSV columns: <span className="text-finance-text num-font">Date, Type, Amount, Notes</span>
          </p>
          <label className="cursor-pointer px-4 py-2 bg-finance-card hover:bg-finance-border/60 text-finance-text text-xs font-semibold rounded-xl border border-finance-border inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Browse Computer</span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full py-3 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-finance-emerald/20 text-sm mt-2 disabled:opacity-50"
        >
          {uploading ? 'Validating & Importing...' : 'Import Statement'}
        </button>
      </form>
    </Modal>
  );
};
