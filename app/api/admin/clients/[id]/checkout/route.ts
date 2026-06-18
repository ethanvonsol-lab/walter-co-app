import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getAdmin, logAudit } from '@/lib/admin'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe, stripeConfigured } from '@/lib/stripe'

// Creates a Stripe Checkout payment link for a client, billed from the numbers
// already on their record: `mrr` as the recurring monthly price and `setup_fee`
// as a one-time charge on the first invoice. No Stripe price IDs to manage —
// each client is billed exactly what the admin entered.
//
// Admin-only. Returns { url } to send to the client.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (!stripeConfigured()) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 400 })

  const { id } = await ctx.params
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin

  const stripe = getStripe()

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, plan, mrr, setup_fee, stripe_customer_id')
    .eq('id', id)
    .maybeSingle()
  if (!client) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!client.mrr || client.mrr <= 0) {
    return NextResponse.json({ error: 'no_mrr', message: 'Set this client’s MRR before billing.' }, { status: 400 })
  }

  try {
    // Reuse an existing Stripe customer or create one keyed to the client.
    let customerId = client.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client.email,
        name: client.name || undefined,
        metadata: { client_id: client.id },
      })
      customerId = customer.id
      await supabaseAdmin.from('clients').update({ stripe_customer_id: customerId }).eq('id', client.id)
    }

    const planLabel = client.plan === 'agency' || client.plan === 'whitelabel' ? 'Agency' : 'Direct'

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `Walter & Co — ${planLabel} plan` },
          unit_amount: Math.round(client.mrr * 100),
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ]
    // One-time setup fee on the first invoice (allowed in subscription mode).
    if (client.setup_fee && client.setup_fee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'One-time setup fee' },
          unit_amount: Math.round(client.setup_fee * 100),
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      success_url: `${origin}/admin/clients/${client.id}?billing=success`,
      cancel_url: `${origin}/admin/clients/${client.id}?billing=cancelled`,
      metadata: { client_id: client.id },
      subscription_data: { metadata: { client_id: client.id } },
    })

    await logAudit(admin.email, 'client.billing_link', client.id, { mrr: client.mrr, setup_fee: client.setup_fee })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('checkout error:', e)
    return NextResponse.json({ error: 'checkout_failed', message: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
