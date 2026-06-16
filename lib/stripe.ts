import Stripe from 'stripe'

// Lazy server-only Stripe client. Instantiated on first use (not at import),
// so a build without STRIPE_SECRET_KEY set doesn't crash collecting page data.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, {
      // Pin to the SDK's native version so Stripe-side changes don't surprise us.
      apiVersion: '2026-05-27.dahlia',
      typescript: true,
    })
  }
  return _stripe
}

export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY
