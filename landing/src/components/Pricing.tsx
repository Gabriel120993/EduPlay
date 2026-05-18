'use client';

import { useLocale } from '@/context/LocaleContext';

export default function Pricing() {
  const { t } = useLocale();
  const section = t.pricing;

  return (
    <section id="pricing" style={{ padding: '4rem 1rem', background: '#0f172a' }}>
      <h2 style={{ textAlign: 'center', fontSize: '2rem' }}>{section.heading}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          maxWidth: 1100,
          margin: '2rem auto 0',
        }}
      >
        {section.plans.map((plan, index) => {
          const popular = index === 1;
          return (
            <article
              key={plan.name}
              style={{
                border: popular ? '2px solid #facc15' : '1px solid #475569',
                borderRadius: 16,
                padding: '1.5rem',
                background: '#1e293b',
              }}
            >
              {popular ? (
                <span style={{ color: '#facc15', fontWeight: 700 }}>{section.popular}</span>
              ) : null}
              <h3>{plan.name}</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>
                {plan.price}
                <span style={{ fontSize: '1rem' }}>{plan.period}</span>
              </p>
              <ul style={{ paddingLeft: '1.2rem', lineHeight: 1.8 }}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a
                href="#download"
                style={{
                  display: 'inline-block',
                  marginTop: '1rem',
                  background: popular ? '#facc15' : '#3b82f6',
                  color: popular ? '#1e3a8a' : '#fff',
                  padding: '0.75rem 1.25rem',
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                {plan.cta}
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
