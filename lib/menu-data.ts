export type MenuItem = {
  id: number
  category: string
  name: string
  subtitle: string
  price: number
  image: string | null
}

// Sourced from docs/soofi_brothers_menu_prices.csv
// Categories mirror the public/ image folders: Burgers, Shawarmas, chicken, Fries, chats (chaat), Ice-Creams, Juices, deals
export const categories = [
  'Deals',
  'Burgers',
  'Shawarma & Rolls',
  'Chicken',
  'Fries',
  'Chaat & Bhalle',
  'Ice Cream',
  'Juices & Shakes',
  'Cold Drinks',
] as const

export const categoryEmoji: Record<string, string> = {
  Deals: '🔥',
  Burgers: '🍔',
  'Shawarma & Rolls': '🌯',
  Chicken: '🍗',
  Fries: '🍟',
  'Chaat & Bhalle': '🥗',
  'Ice Cream': '🍨',
  'Juices & Shakes': '🥤',
  'Cold Drinks': '🧊',
}

export const menuItems: MenuItem[] = [
  // Deals — public/deals
  { id: 1, category: 'Deals', name: 'Deal 01', subtitle: '01 Zinger Burger + 01 Reg Drink + Fries', price: 450, image: '/deals/deal-1.png' },
  { id: 2, category: 'Deals', name: 'Deal 02', subtitle: '02 Zinger Burger + 02 Reg Drink + Fries', price: 890, image: '/deals/deal-2.png' },
  { id: 3, category: 'Deals', name: 'Deal 03', subtitle: '01 Zinger Burger + 01 Chicken Shawarma + 01 Half Ltr Drink + Fries', price: 640, image: '/deals/deal-3.png' },
  { id: 4, category: 'Deals', name: 'Deal 04', subtitle: '03 Zinger Burger + 01 Ltr Drink + Fries', price: 1200, image: '/deals/deal-4.png' },
  { id: 5, category: 'Deals', name: 'Deal 05', subtitle: '02 Zinger Roll Paratha + 02 Zinger Shawarma + 01 Ltr Drink', price: 1150, image: '/deals/deal-5.png' },
  { id: 6, category: 'Deals', name: 'Deal 06', subtitle: '02 Anda Shami Burger + 02 Chicken Shawarma + 01 Ltr Drink', price: 780, image: '/deals/deal-6.png' },

  // Burgers — public/Burgers
  { id: 7, category: 'Burgers', name: 'Zinger Burger', subtitle: 'زنگر برگر', price: 400, image: '/Burgers/zinger-burger.png' },
  { id: 8, category: 'Burgers', name: 'Zinger Cheese Burger', subtitle: 'زنگر چیز برگر', price: 450, image: '/Burgers/zinger-burger-cheeze.png' },
  { id: 9, category: 'Burgers', name: 'Chicken Patty Burger', subtitle: 'چکن پیٹی برگر', price: 280, image: '/Burgers/chicken-pattie-burger.png' },
  { id: 10, category: 'Burgers', name: 'Chicken Patty Cheese Burger', subtitle: 'چکن پیٹی چیز برگر', price: 330, image: '/Burgers/chicken-pattie-burger-cheeze.png' },
  { id: 11, category: 'Burgers', name: 'Double Taker Burger', subtitle: 'ڈبل ٹیکر برگر', price: 580, image: '/Burgers/chicken-takar-burger.png' },
  { id: 12, category: 'Burgers', name: 'Chicken Platter Burger', subtitle: 'چکن پلیٹر برگر', price: 350, image: '/Burgers/chicken-lapeta-burger.png' },
  { id: 13, category: 'Burgers', name: 'Shami Burger', subtitle: 'شامی برگر', price: 140, image: '/Burgers/shami-burger.png' },
  { id: 14, category: 'Burgers', name: 'Anda Shami Burger', subtitle: 'انڈہ شامی برگر', price: 170, image: '/Burgers/anda-burger.png' },
  { id: 15, category: 'Burgers', name: 'Double Anda Roll Burger', subtitle: 'ڈبل انڈہ رول برگر', price: 230, image: '/Burgers/double-anda-roll-burger.png' },
  { id: 16, category: 'Burgers', name: 'Shami Kebab', subtitle: 'شامی کباب', price: 40, image: '/Burgers/shami-kabab.png' },

  // Fries — public/Fries
  { id: 17, category: 'Fries', name: 'Loaded Fries', subtitle: 'لوڈڈ فرائز', price: 350, image: '/Fries/loaded-fries.png' },
  { id: 18, category: 'Fries', name: 'Nuggets', subtitle: 'نگٹس', price: 350, image: '/Fries/nugets.png' },
  { id: 29, category: 'Fries', name: 'Finger Chips', subtitle: 'فنگر چپس', price: 150, image: '/Fries/fries.png' },

  // Shawarma & Rolls — public/Shawarmas
  { id: 19, category: 'Shawarma & Rolls', name: 'Chicken Shawarma', subtitle: 'چکن شوارما', price: 180, image: '/Shawarmas/chicken-shawarma.png' },
  { id: 20, category: 'Shawarma & Rolls', name: 'Chicken Cheese Shawarma', subtitle: 'چکن چیز شوارما', price: 230, image: '/Shawarmas/chicken-shawarma-cheeze.png' },
  { id: 21, category: 'Shawarma & Rolls', name: 'Zinger Shawarma', subtitle: 'زنگر شوارما', price: 250, image: '/Shawarmas/zinger-shawarma.png' },
  { id: 62, category: 'Shawarma & Rolls', name: 'Zinger Platter Shawarma', subtitle: 'زنگر پلیٹر شوارما', price: 320, image: '/Shawarmas/zinger-shawarma.png' },
  { id: 22, category: 'Shawarma & Rolls', name: 'Zinger Cheese Shawarma', subtitle: 'زنگر چیز شوارما', price: 300, image: '/Shawarmas/zinger-shawarma-cheeze.png' },
  { id: 23, category: 'Shawarma & Rolls', name: 'Chicken Roll Paratha', subtitle: 'چکن رول پراٹھا', price: 250, image: '/Shawarmas/chicken-roll.png' },
  { id: 24, category: 'Shawarma & Rolls', name: 'Chicken Cheese Roll Paratha', subtitle: 'چکن چیز رول پراٹھا', price: 300, image: '/Shawarmas/chicken-roll-cheeze.png' },
  { id: 25, category: 'Shawarma & Rolls', name: 'Zinger Roll Paratha', subtitle: 'زنگر رول پراٹھا', price: 300, image: '/Shawarmas/zinger-roll.png' },
  { id: 26, category: 'Shawarma & Rolls', name: 'Zinger Cheese Roll Paratha', subtitle: 'زنگر چیز رول پراٹھا', price: 350, image: '/Shawarmas/zinger-roll-cheeze.png' },

  // Chicken — public/chicken
  { id: 27, category: 'Chicken', name: 'Wings (6 Pcs)', subtitle: 'ونگز 6 پیس', price: 350, image: '/chicken/wings.png' },
  { id: 36, category: 'Chicken', name: 'Chicken Pieces Small', subtitle: 'چکن پیس چھوٹا', price: 180, image: '/chicken/chicken-small.png' },
  { id: 37, category: 'Chicken', name: 'Chicken Pieces Big', subtitle: 'چکن پیس بڑا', price: 280, image: '/chicken/chicken-big.png' },

  // Chaat & Bhalle — public/chats
  { id: 30, category: 'Chaat & Bhalle', name: 'Dahi Bhalle', subtitle: 'دہی بھلے', price: 220, image: '/chats/dahi-bhala.png' },
  { id: 31, category: 'Chaat & Bhalle', name: 'Chana Chaat', subtitle: 'چنا چاٹ', price: 220, image: '/chats/channa-chat.png' },
  { id: 32, category: 'Chaat & Bhalle', name: 'Papri Chaat', subtitle: 'پاپڑی چاٹ', price: 220, image: '/chats/papri-chat.png' },
  { id: 33, category: 'Chaat & Bhalle', name: 'Cream Fruit Chaat', subtitle: 'کریم فروٹ چاٹ', price: 250, image: '/chats/fruit-chat.png' },
  { id: 34, category: 'Chaat & Bhalle', name: 'Khatte Meethe Gol Gappe Half', subtitle: 'کھٹے میٹھے گول گپے ہاف', price: 150, image: '/chats/gol-gappy-half.png' },
  { id: 35, category: 'Chaat & Bhalle', name: 'Khatte Meethe Gol Gappe Full', subtitle: 'کھٹے میٹھے گول گپے فل', price: 250, image: '/chats/gol-gappy-full.png' },

  // Ice Cream — public/Ice-Creams
  { id: 48, category: 'Ice Cream', name: 'Ice Cream Large', subtitle: 'آئس کریم لارج', price: 220, image: '/Ice-Creams/Ice-cream-large.png' },
  { id: 49, category: 'Ice Cream', name: 'Ice Cream Small', subtitle: 'آئس کریم سمال', price: 250, image: '/Ice-Creams/Ice-cream-small.png' },
  { id: 50, category: 'Ice Cream', name: 'Kulfa Falooda', subtitle: 'قلفہ فالودہ', price: 300, image: '/Ice-Creams/khulfa-falooda.png' },

  // Juices & Shakes — public/Juices
  { id: 38, category: 'Juices & Shakes', name: 'Apple Banana Milkshake', subtitle: 'سیب کیلا ملک شیک', price: 220, image: '/Juices/apple-banana-milk-shake.png' },
  { id: 39, category: 'Juices & Shakes', name: 'Chiku Milkshake', subtitle: 'چیکو ملک شیک', price: 220, image: '/Juices/chicu-shake.png' },
  { id: 40, category: 'Juices & Shakes', name: 'Khajoor Banana Milkshake', subtitle: 'کھجور کیلا ملک شیک', price: 250, image: '/Juices/date-banana-milk-shake.png' },
  { id: 41, category: 'Juices & Shakes', name: 'Khajoor Badam Milkshake', subtitle: 'کھجور بادام ملک شیک', price: 300, image: '/Juices/date-almond-shake.png' },
  { id: 42, category: 'Juices & Shakes', name: 'Mint Margarita', subtitle: 'منٹ مارگریٹا', price: 200, image: '/Juices/mint-margaretta.png' },
  { id: 43, category: 'Juices & Shakes', name: 'Chocolate Shake', subtitle: 'چاکلیٹ شیک', price: 300, image: '/Juices/choclate-shake.png' },
  { id: 44, category: 'Juices & Shakes', name: 'Strawberry Milkshake', subtitle: 'اسٹرابیری ملک شیک', price: 300, image: '/Juices/straw-berry-shake.png' },
  { id: 45, category: 'Juices & Shakes', name: 'Falsa Juice', subtitle: 'فالسہ جوس', price: 220, image: '/Juices/falsa-juice.png' },
  { id: 46, category: 'Juices & Shakes', name: 'Pineapple Milkshake', subtitle: 'پائن ایپل ملک شیک', price: 300, image: '/Juices/pine-apple-shake.png' },
  { id: 47, category: 'Juices & Shakes', name: 'Ice Cream Milkshake', subtitle: 'آئس کریم ملک شیک', price: 220, image: '/Juices/ice-cream-shake.png' },
  { id: 51, category: 'Juices & Shakes', name: 'Almond Milkshake', subtitle: 'آلو ملک شیک', price: 250, image: '/Juices/almond-shake.png' },
  { id: 52, category: 'Juices & Shakes', name: 'Anar Juice', subtitle: 'انار جوس', price: 300, image: '/Juices/anar-juice.png' },
  { id: 53, category: 'Juices & Shakes', name: 'Apple Juice', subtitle: 'سیب جوس', price: 300, image: '/Juices/apple-juice.png' },
  { id: 54, category: 'Juices & Shakes', name: 'Carrot Juice', subtitle: 'گاجر جوس', price: 160, image: '/Juices/carrot-juice.png' },
  { id: 55, category: 'Juices & Shakes', name: 'Grape Fruit Juice', subtitle: 'گریپ فروٹ جوس', price: 220, image: '/Juices/grapes-juice.png' },
  { id: 56, category: 'Juices & Shakes', name: 'Oreo Chocolate Shake', subtitle: 'Oreo چاکلیٹ شیک', price: 350, image: '/Juices/oreo-choclate-shake.png' },
  { id: 57, category: 'Juices & Shakes', name: 'Pineapple Juice', subtitle: 'پائن ایپل کا جوس', price: 260, image: '/Juices/pine-apple-juice.png' },
  { id: 58, category: 'Juices & Shakes', name: 'Malta Juice', subtitle: 'مالٹا جوس', price: 180, image: '/Juices/orange-juice.png' },

  // Cold Drinks
  { id: 59, category: 'Cold Drinks', name: 'Cola Next (Regular)', subtitle: 'کولا نیکسٹ ریگولر', price: 80, image: '/drinks/cola-regular.png' },
  { id: 60, category: 'Cold Drinks', name: 'Cola Next (1 Ltr)', subtitle: 'کولا نیکسٹ 1 لیٹر', price: 160, image: '/drinks/cola-1.png' },
  { id: 61, category: 'Cold Drinks', name: 'Cola Next (1.5 Ltr)', subtitle: 'کولا نیکسٹ 1.5 لیٹر', price: 200, image: '/drinks/cola-1.5.png' },
]
