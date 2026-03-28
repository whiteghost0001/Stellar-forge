import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FAQ_DATA = [
  {
    question: 'What is a Stellar token?',
    answer: 'A Stellar token is a custom asset created on the Stellar blockchain using the Stellar Asset Contract standard. It represents digital value or utility on the Stellar network and can be used for payments, voting, or other purposes.'
  },
  {
    question: 'What are the fees?',
    answer: 'Token creation costs 0.5 XLM base fee + 0.2 XLM per metadata byte (IPFS hash ~100 bytes = ~20.2 XLM total). Minting/burning costs ~0.00001 XLM per transaction. Network fees are minimal compared to Ethereum.'
  },
  {
    question: 'What is IPFS?',
    answer: 'IPFS (InterPlanetary File System) is a decentralized protocol for storing and sharing files. Your token metadata (name, symbol, image) is pinned to IPFS via Pinata, ensuring permanent, censorship-resistant storage with content-addressed hashes.'
  },
  {
    question: 'How do I get XLM?',
    answer: 'Use the Fundbot button (testnet only) for free test XLM. For mainnet, buy XLM on exchanges like Coinbase, Kraken, Binance, or Stellar DEX. Minimum ~25 XLM recommended for transactions + base reserves.'
  },
  {
    question: 'Is my token on mainnet or testnet?',
    answer: 'Check the network selector in the top-right. Testnet tokens are for development (free XLM). Mainnet tokens are live/production. Always confirm network before creating/minting!'
  }
];

export const FAQ: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  const filteredFAQ = FAQ_DATA.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">{t('faq.title', 'Frequently Asked Questions')}</h1>
        <p className="text-xl text-gray-600 mb-8">
          {t('faq.subtitle', 'Find answers to common questions about token creation, fees, and Stellar network.')}
        </p>
        <div className="max-w-md mx-auto">
          <input
            type="text"
            placeholder={t('faq.searchPlaceholder', 'Search FAQs...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredFAQ.length > 0 ? (
          filteredFAQ.map((item, index) => (
            <details key={index} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <summary className="font-semibold text-gray-900 text-lg cursor-pointer list-none pb-4">
                {item.question}
              </summary>
              <p className="text-gray-600 leading-relaxed mt-2">{item.answer}</p>
            </details>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('faq.noResults', 'No FAQs match your search. Try another keyword.')}</p>
          </div>
        )}
      </div>

      {searchQuery && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setSearchQuery('')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('faq.clearSearch', 'Clear search')}
          </button>
        </div>
      )}
    </div>
  );
};

