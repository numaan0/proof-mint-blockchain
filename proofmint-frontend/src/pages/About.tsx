import React from 'react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <h1 className="text-5xl font-bold tracking-tighter text-gray-900 mb-12">
        About ProofMint.
      </h1>
      
      <div className="space-y-12">
        <section className="space-y-6 max-w-2xl">
          <p className="text-xl font-light text-gray-600 leading-relaxed">
            ProofMint is a decentralized verification platform designed to bring transparency to the digital asset ecosystem. 
            In a world where digital ownership is increasingly complex, we provide a streamlined layer of trust.
          </p>
          <p className="text-xl font-light text-gray-600 leading-relaxed">
            Our protocol leverages immutable blockchain ledgers on the Flare network to ensure that every credit score and work history is verified, traceable, and authentic.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-8 border-t border-gray-100 pt-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">For Workers</h3>
            <p className="text-gray-500 leading-relaxed">
              Build your on-chain reputation. Your work history becomes a verifiable asset that grants you access to decentralized credit and financial tools.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">For Lenders</h3>
            <p className="text-gray-500 leading-relaxed">
              Provide liquidity with confidence. Our protocol ensures that borrowers are vetted through mathematical proof of earnings and tenure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
