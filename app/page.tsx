'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Bike,
  Clock3,
  Heart,
  MapPin,
  Menu,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-react'
import { categories as menuCategories, categoryEmoji } from '@/lib/menu-data'
import { DishDialog } from '@/components/dish-dialog'
import { CartDialog } from '@/components/cart-dialog'
import { OrderTrackerWidget } from '@/components/order-tracker-widget'
import { DeliveryOffBanner } from '@/components/delivery-off-banner'
import { MenuImagePrefetcher } from '@/components/menu-image-prefetcher'
import { useResolvedMenu, type ResolvedMenuItem } from '@/lib/use-resolved-menu'
import { useOrderTracker } from '@/lib/use-order-tracker'
import { useDeliveryStatus } from '@/lib/use-delivery-status'

export default function Page() {
  const menuItems = useResolvedMenu()
  const deliveryEnabled = useDeliveryStatus()
  const [activeCategory, setActiveCategory] = useState<string>(menuCategories[0])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<number, number>>({})
  const [mobileOpen, setMobileOpen] = useState(false)
  const [liked, setLiked] = useState<number[]>([])
  const [selectedDish, setSelectedDish] = useState<ResolvedMenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const orderTracker = useOrderTracker()

  const filteredDishes = useMemo(() => menuItems.filter((dish) => {
    const categoryMatch = dish.category === activeCategory
    const searchMatch = `${dish.name} ${dish.category} ${dish.subtitle}`.toLowerCase().includes(search.toLowerCase())
    return categoryMatch && searchMatch
  }), [menuItems, activeCategory, search])

  const cartCount = Object.values(cart).reduce((sum, value) => sum + value, 0)
  const cartTotal = menuItems.reduce((sum, dish) => sum + dish.price * (cart[dish.id] || 0), 0)

  const addToCart = (id: number, quantity = 1) => setCart((current) => ({ ...current, [id]: (current[id] || 0) + quantity }))
  const toggleLike = (id: number) => setLiked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const incrementCartItem = (id: number) => setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }))
  const decrementCartItem = (id: number) => setCart((current) => {
    const next = (current[id] || 0) - 1
    if (next <= 0) {
      const { [id]: _removed, ...rest } = current
      return rest
    }
    return { ...current, [id]: next }
  })
  const removeCartItem = (id: number) => setCart((current) => {
    const { [id]: _removed, ...rest } = current
    return rest
  })

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <MenuImagePrefetcher />
      {!deliveryEnabled && <DeliveryOffBanner />}
      <div className="bg-primary px-4 py-2 text-center text-xs font-semibold tracking-wide text-primary-foreground sm:text-sm">
        Free delivery in Ghouri Town on orders above Rs. 1000 <span className="mx-2 opacity-50">•</span> Call us: 0344-7575657
      </div>

      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="Sufi Brothers home">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Utensils className="size-5" /></span>
            <span><span className="block font-serif text-xl font-black leading-none text-primary">Sufi Brothers</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Fast food & more</span></span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex" aria-label="Main navigation">
            <a className="text-primary" href="#home">Home</a><a href="#menu" className="text-muted-foreground transition hover:text-primary">Menu</a><a href="#deals" className="text-muted-foreground transition hover:text-primary">Deals</a><a href="#about" className="text-muted-foreground transition hover:text-primary">About us</a><a href="#contact" className="text-muted-foreground transition hover:text-primary">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <button aria-label="Search menu" className="hidden size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary sm:flex"><Search className="size-5" /></button>
            <button onClick={() => setCartOpen(true)} aria-label={`${cartCount} items in cart`} className="relative flex size-10 items-center justify-center rounded-full bg-secondary text-primary transition hover:brightness-95"><ShoppingBag className="size-5" />{cartCount > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{cartCount}</span>}</button>
            <button onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })} className="hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110 sm:block">Order now</button>
            <button aria-label="Toggle menu" onClick={() => setMobileOpen(!mobileOpen)} className="flex size-10 items-center justify-center rounded-full md:hidden">{mobileOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {mobileOpen && <nav className="flex flex-col gap-4 border-t border-border px-5 py-5 text-sm font-semibold md:hidden"><a href="#home" onClick={() => setMobileOpen(false)}>Home</a><a href="#menu" onClick={() => setMobileOpen(false)}>Menu</a><a href="#deals" onClick={() => setMobileOpen(false)}>Deals</a><a href="#about" onClick={() => setMobileOpen(false)}>About us</a><a href="#contact" onClick={() => setMobileOpen(false)}>Contact</a></nav>}
      </header>

      <section id="home" className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-20 lg:pt-8">
        <div className="relative z-10">
          <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-primary"><span className="h-px w-8 bg-primary" /> Fresh from Ghouri Town</p>
          <h1 className="max-w-xl font-serif text-5xl font-black leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl">Good food.<br /><span className="text-primary">Good mood.</span></h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">Crave-worthy burgers, shawarmas and roll parathas made fresh for your table. The Sufi Brothers taste is just a call away.</p>
        </div>
        <div className="relative min-h-[360px] sm:min-h-[460px]">
          <div className="absolute right-0 top-3 h-[82%] w-[87%] rounded-[40%_40%_12%_12%] bg-primary/10 sm:rounded-[45%_45%_18%_18%]" />
          <img src="/Burgers/zinger-burger.png" alt="Sufi Brothers zinger burger" className="relative z-0 h-[390px] w-full rounded-[42%_42%_12%_12%] object-cover shadow-2xl shadow-primary/20 sm:h-[500px]" />
          <div className="absolute bottom-0 left-0 z-20 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl sm:left-6"><span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bike className="size-6" /></span><span><strong className="block text-sm">Fast delivery</strong><small className="text-xs text-muted-foreground">Hot & fresh at your door</small></span></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><div className="mb-6 flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">Hungry already?</p><h2 className="mt-1 font-serif text-3xl font-black">Explore categories</h2></div><a href="#menu" className="hidden items-center gap-1 text-sm font-bold text-primary sm:flex">View menu <ArrowRight className="size-4" /></a></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{menuCategories.map((name) => <button key={name} onClick={() => { setActiveCategory(name); setSearch(''); document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }) }} className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/10"><span className="text-4xl transition group-hover:scale-110">{categoryEmoji[name]}</span><span className="text-center text-sm font-bold">{name}</span></button>)}</div></section>

      <section id="menu" className="mx-auto max-w-7xl px-5 py-12 lg:px-8"><div className="mb-6"><p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">Fresh & full menu</p><h2 className="mt-1 font-serif text-3xl font-black">Our menu</h2></div><div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-sm">{menuCategories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeCategory === category ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary/60 text-secondary-foreground hover:bg-primary/15'}`}>{category}</button>)}</div><div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">{filteredDishes.map((dish) => { const isSoldOut = !dish.available; return <article key={dish.id} onClick={() => setSelectedDish(dish)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDish(dish) } }} className="group cursor-pointer overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"><div className="relative aspect-square overflow-hidden bg-secondary/40">{dish.image ? <img src={dish.image} alt={dish.name} className={`h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105 sm:p-6 ${isSoldOut ? 'opacity-50 grayscale' : ''}`} /> : <div className={`flex h-full w-full items-center justify-center text-4xl sm:text-6xl ${isSoldOut ? 'opacity-50 grayscale' : ''}`}>{categoryEmoji[dish.category]}</div>}{isSoldOut && <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-foreground/80 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-background sm:text-xs">Sold out</span>}<button onClick={(e) => { e.stopPropagation(); toggleLike(dish.id) }} aria-label={`Like ${dish.name}`} className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-card/90 text-primary shadow sm:right-3 sm:top-3 sm:size-9"><Heart className={`size-3.5 sm:size-4 ${liked.includes(dish.id) ? 'fill-primary' : ''}`} /></button><span className="absolute bottom-2 left-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground sm:bottom-3 sm:left-3 sm:px-3 sm:py-1 sm:text-xs">{dish.category}</span></div><div className="p-3 sm:p-5"><h3 className="text-sm font-black sm:text-lg">{dish.name}</h3><p dir="auto" className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">{dish.subtitle}</p><div className="mt-3 flex items-center justify-between gap-2 sm:mt-5"><span className="font-serif text-base font-black text-primary sm:text-xl">Rs. {dish.price}</span>{isSoldOut ? <span className="rounded-xl bg-secondary px-2 py-1.5 text-[11px] font-bold text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">Sold out</span> : <button onClick={(e) => { e.stopPropagation(); addToCart(dish.id) }} className="flex items-center gap-1 rounded-xl bg-primary px-2 py-1.5 text-[11px] font-bold text-primary-foreground transition hover:brightness-110 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"><Plus className="size-3.5 sm:size-4" />Add</button>}</div></div></article> })}</div>
      <DishDialog dish={selectedDish} available={selectedDish?.available ?? true} open={selectedDish !== null} onOpenChange={(isOpen) => { if (!isOpen) setSelectedDish(null) }} onAddToCart={addToCart} />{filteredDishes.length === 0 && <div className="rounded-3xl border border-dashed border-border py-16 text-center text-muted-foreground">No dishes found. Try another search.</div>}</section>

      <section id="deals" className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><div className="relative overflow-hidden rounded-[2rem] bg-primary px-7 py-10 text-primary-foreground sm:px-12"><div className="relative z-10 max-w-md"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground/70">Sufi Brothers special</p><h2 className="mt-3 font-serif text-4xl font-black leading-tight sm:text-5xl">More bite.<br />Less price.</h2><p className="mt-4 text-sm leading-6 text-primary-foreground/80">Bring your people, pick your favourites and make it a meal to remember.</p><button onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-black text-secondary-foreground">Order now <ArrowRight className="size-4" /></button></div><div className="absolute -right-16 -top-24 size-80 rounded-full border-[28px] border-primary-foreground/10" /><div className="absolute bottom-[-70px] right-8 hidden w-80 rotate-[-8deg] overflow-hidden rounded-3xl border-8 border-primary-foreground/20 shadow-2xl md:block"><img src="/deals/deal-4.png" alt="Sufi Brothers combo deal" className="h-56 w-full object-cover" /></div></div></section>

      <section id="about" className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-3 lg:px-8"><div><p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">Why Sufi Brothers</p><h2 className="mt-2 font-serif text-3xl font-black">Your local comfort food stop.</h2></div><div className="flex gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><Clock3 /></span><div><h3 className="font-bold">Always fresh</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Every order is prepared when you order it, never sitting around.</p></div></div><div className="flex gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><MapPin /></span><div><h3 className="font-bold">Proudly in Ghouri Town</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Serving our neighbours in Islamabad with fast, friendly delivery.</p></div></div></section>

      <footer id="contact" className="bg-foreground px-5 py-12 text-background lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Utensils className="size-5" /></span><span className="font-serif text-2xl font-black">Sufi Brothers</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-background/60">Big flavours, honest prices, and the kind of food you think about on the way home.</p></div><div className="flex flex-col gap-3 text-sm text-background/70"><a className="flex items-center gap-2 hover:text-background" href="tel:03447575657"><Phone className="size-4 text-primary" />0344-7575657</a><span className="flex items-center gap-2"><MapPin className="size-4 text-primary" />Ghouri Town, Islamabad</span></div></div><div className="mx-auto mt-10 max-w-7xl border-t border-background/10 pt-5 text-xs text-background/40">© 2026 Sufi Brothers. All prices in PKR.</div></footer>

      {cartCount > 0 && <button onClick={() => setCartOpen(true)} className="fixed bottom-5 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl bg-foreground px-4 py-3 text-left text-background shadow-2xl transition hover:brightness-110"><span className="text-sm font-bold">{cartCount} item{cartCount > 1 ? 's' : ''} <span className="font-normal text-background/60">in your order</span></span><span className="flex items-center gap-3"><strong className="text-primary-foreground">Rs. {cartTotal}</strong><span onClick={(e) => { e.stopPropagation(); setCart({}) }} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Clear</span></span></button>}

      <CartDialog
        open={cartOpen}
        onOpenChange={setCartOpen}
        menuItems={menuItems}
        cart={cart}
        deliveryEnabled={deliveryEnabled}
        onIncrement={incrementCartItem}
        onDecrement={decrementCartItem}
        onRemove={removeCartItem}
        onClear={() => setCart({})}
        onOrderPlaced={orderTracker.startTracking}
      />

      {orderTracker.activeOrder && (
        <OrderTrackerWidget
          order={orderTracker.activeOrder}
          progress={orderTracker.progress}
          remainingMinutes={orderTracker.remainingMinutes}
          currentPhaseIndex={orderTracker.currentPhaseIndex}
          isDelivered={orderTracker.isDelivered}
          isCancelled={orderTracker.isCancelled}
          riderName={orderTracker.riderName}
          riderPhone={orderTracker.riderPhone}
          onDismiss={orderTracker.clearTracking}
        />
      )}
    </main>
  )
}
