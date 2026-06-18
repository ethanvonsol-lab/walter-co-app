import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Stripe webhook — keeps each client's billing state in sync with Stripe.
// Verifies the signature against STRIPE_WEBHOOK_SECRET using the RAW body
// (Next 16: read it with req.text(), no bodyParser config needed).
//
// Register this URL in Stripe → Developers → Webhooks:
//   https://YOUR-DOMAIN/api/stripe/webhook
// listening for: checkout.session.completed, customer.subscription.updated,
//                customer.subscription.deleted, invoice.payment_failed

// Maps a Stripe subscription status to our billing_status + operational status.
function applyStatus(stripeStatus: string): { billing_status: string; status?: string } {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return { billing_status: stripeStatus, status: 'active' }
    case 'past_due':
    case 'unpaid':
      return { billing_status: 'past_due' }
    case 'canceled':
      return { billing_status: 'canceled', status: 'churned' }
    default:
      return { billing_status: stripeStatus }
  }
}

async function updateByCustomer(customerId: string, patch: Record<string, unknown>) {
  await supabaseAdmin.from('clients').update(patch).eq('stripe_customer_id', customerId)
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get('stripe-signature')
  if (!secret || !sig) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const raw = await req.text()
    event = getStripe().webhooks.constructEvent(raw, sig, secret)
  } catch (e) {
    console.error('stripe signature verify failed:', e)
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const clientId = s.metadata?.client_id
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id
        const subscriptionId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id
        if (clientId) {
          await supabaseAdmin.from('clients').update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            billing_status: 'active',
            status: 'active',
            paused_at: null,
          }).eq('id', clientId)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await updateByCustomer(customerId, {
          stripe_subscription_id: sub.id,
          ...applyStatus(sub.status),
        })
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
        if (customerId) await updateByCustomer(customerId, { billing_status: 'past_due' })
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('stripe webhook handler error:', e)
    return NextResponse.json({ received: true, handler_error: true })
  }

  return NextResponse.json({ received: true })
}
