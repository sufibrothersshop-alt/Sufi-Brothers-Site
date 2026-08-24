'use client'

import { useEffect } from 'react'

type SlipItem = { item_name: string; quantity: number; line_total: number }
type SlipOrder = {
  id: string
  customer_phone: string
  delivery_address: string | null
  notes: string | null
  delivery_fee: number
  total_amount: number
  created_at: string
  order_items: SlipItem[]
}

export function PrintSlip({ order }: { order: SlipOrder }) {
  useEffect(() => {
    // Give the page a beat to finish laying out before opening the print
    // dialog — the closest a browser allows to "automatic" printing
    // without a physical printer + local print agent already set up.
    const timer = setTimeout(() => window.print(), 300)
    return () => clearTimeout(timer)
  }, [])

  const subtotal = order.total_amount - order.delivery_fee

  return (
    <>
      <style>{`
        @page { size: 80mm auto; margin: 4mm; }
        html, body { background: #fff; }
      `}</style>
      <div className="mx-auto w-[80mm] max-w-full bg-white p-2 font-mono text-[15px] leading-relaxed text-black">
        <div className="text-center">
          <p className="text-xl font-bold">SUFI BROTHERS</p>
          <p className="text-sm">Fast food &amp; more</p>
          <p className="text-sm">Ghouri Town, Islamabad</p>
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <p>Order #{order.id.slice(0, 8).toUpperCase()}</p>
        <p>{new Date(order.created_at).toLocaleString()}</p>

        <div className="my-2 border-t border-dashed border-black" />

        <p>Customer: {order.customer_phone}</p>
        {order.delivery_address && <p>Address: {order.delivery_address}</p>}

        <div className="my-2 border-t border-dashed border-black" />

        <div className="flex flex-col gap-1">
          {order.order_items.map((item, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span>{item.quantity}x {item.item_name}</span>
              <span className="shrink-0">{item.line_total}</span>
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="flex flex-col gap-1">
          <div className="flex justify-between"><span>Subtotal</span><span>Rs. {subtotal}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>{order.delivery_fee > 0 ? `Rs. ${order.delivery_fee}` : 'Free'}</span></div>
          <div className="flex justify-between text-lg font-bold"><span>TOTAL</span><span>Rs. {order.total_amount}</span></div>
        </div>

        {order.notes && (
          <>
            <div className="my-2 border-t border-dashed border-black" />
            <p>Note: {order.notes}</p>
          </>
        )}

        <div className="my-2 border-t border-dashed border-black" />

        <div className="text-center">
          <p>Thank you for ordering!</p>
          <p>0344-7575657</p>
        </div>
      </div>
    </>
  )
}
