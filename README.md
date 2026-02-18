This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Sincronización en tiempo real (multiusuario)

Cuando vos u otro usuario crea o modifica meses, cuentas, categorías, subcategorías o transacciones, el cambio se refleja al instante en todos los clientes abiertos gracias a **Supabase Realtime**.

### Cómo habilitarlo

1. En el Dashboard de Supabase: **Database → Replication** → en la publicación `supabase_realtime` activá las tablas: **`months`**, **`accounts`**, **`categories`**, **`subcategories`**, **`transactions`**, **`transaction_amounts`**, **`opening_balances`**.
2. O ejecutá la migración `migrations/006_realtime_transactions.sql` en el SQL Editor (o con `supabase db push`).

La app ya está suscrita a cambios en todas esas tablas; al habilitar Realtime, la invalidación de React Query y la actualización de la UI en todas las pestañas es automática.

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
