'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { addTransaction } from '../lib/transactions';

export default function PayAndInvoice({ currency, onAdded }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate a small network delay for UX
      await new Promise(resolve => setTimeout(resolve, 600));

      await addTransaction({
        amount: parseFloat(amount),
        type: 'expense',
        category: 'Payment',
        description: `Invoice: ${recipient} - ${description}`,
      });
      
      if (onAdded) onAdded();
      setInvoiceGenerated(true);
    } catch (error) {
      console.error('Payment failed', error);
      alert('Failed to process payment.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRecipient('');
    setAmount('');
    setDescription('');
    setInvoiceGenerated(false);
    setIsOpen(false);
  };

  const invoiceText = `Invoice from B1OversWallet%0A%0ARecipient: ${recipient}%0AAmount: ${currency} ${amount}%0ADescription: ${description}%0ADate: ${new Date().toLocaleDateString()}`;

  const shareEmail = `mailto:?subject=Payment Invoice&body=${invoiceText}`;
  const shareWhatsApp = `https://wa.me/?text=${invoiceText}`;
  const shareBeOneOfUs = `https://beoneofus.work/share?text=${invoiceText}`;

  const downloadPDF = () => {
    const doc = new jsPDF();
    const safeName = recipient.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const generateText = () => {
      doc.setFontSize(22);
      doc.text('INVOICE', 105, 25, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text(`From: B1OversWallet`, 20, 45);
      doc.text(`To: ${recipient}`, 20, 55);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 65);
      
      doc.text(`Description: ${description}`, 20, 85);
      
      doc.setFontSize(16);
      doc.text(`Total Amount: ${currency} ${amount}`, 20, 105);
      
      doc.save(`invoice_${safeName}.pdf`);
    };

    const img = new window.Image();
    img.src = '/apple-touch-icon.png'; // Uses the existing icon in your public folder
    img.onload = () => {
      doc.addImage(img, 'PNG', 20, 12, 16, 16);
      generateText();
    };
    img.onerror = () => {
      generateText(); // Fallback if image fails to load
    };
  };

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center border-b border-card-border pb-3">
        <h2 className="text-[10px] font-black tracking-widest uppercase text-gray-500 flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Pay & Invoice
        </h2>
        <button onClick={() => setIsOpen(!isOpen)} className="text-[10px] text-accent hover:text-accent-hover uppercase tracking-widest font-bold transition-colors">
          {isOpen ? 'Close' : '+ New Payment'}
        </button>
      </div>

      {isOpen && !invoiceGenerated && (
        <form onSubmit={handlePay} className="space-y-4 pt-4 animate-in fade-in zoom-in duration-200">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Recipient Name/Email</label>
            <input type="text" required value={recipient} onChange={(e) => setRecipient(e.target.value)} className="minimal-input p-2 w-full text-sm" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount ({currency})</label>
            <input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} className="minimal-input p-2 w-full text-sm" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description / Services</label>
            <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} className="minimal-input p-2 w-full text-sm" placeholder="Consulting..." />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex justify-center items-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Process Payment'}
          </button>
        </form>
      )}

      {isOpen && invoiceGenerated && (
        <div className="space-y-4 pt-4 animate-in fade-in zoom-in duration-200 text-center">
          <div className="bg-card border border-card-border p-5 rounded-2xl">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-1">Payment Successful</h3>
            <p className="text-[10px] text-gray-400 mb-4">Invoice generated for {recipient}</p>
            
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-t border-card-border pt-4">Share Invoice</p>
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <a href={shareEmail} className="flex-1 bg-background border border-card-border hover:border-accent text-foreground px-3 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] transition-all text-center">
                Email
              </a>
              <a href={shareWhatsApp} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#25D366] hover:bg-[#1DA851] text-white px-3 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] transition-all text-center">
                WhatsApp
              </a>
              <a href={shareBeOneOfUs} target="_blank" rel="noopener noreferrer" className="flex-1 bg-accent hover:bg-accent-hover text-black px-3 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] transition-all text-center shadow-lg shadow-accent/20">
                BeOneOfUs
              </a>
            </div>
            <button onClick={downloadPDF} className="w-full mt-2 bg-card border border-card-border hover:border-accent text-foreground px-3 py-2.5 rounded-full font-bold uppercase tracking-widest text-[9px] transition-all text-center">
              Download PDF
            </button>
          </div>
          <button onClick={resetForm} className="text-[9px] uppercase tracking-widest font-bold text-gray-500 hover:text-foreground transition-colors mt-2">Make Another Payment</button>
        </div>
      )}
    </div>
  );
}