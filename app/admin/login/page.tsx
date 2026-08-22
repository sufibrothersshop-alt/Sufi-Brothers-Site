import { signIn } from '@/app/admin/actions'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">Sufi Brothers</p>
        <h1 className="mt-1 font-serif text-2xl font-black">Admin sign in</h1>

        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            Invalid username or password.
          </p>
        )}

        <form action={signIn} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Username</label>
            <input id="username" name="username" type="text" required autoComplete="username" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>
          <button type="submit" className="mt-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110">
            Sign in
          </button>
        </form>
      </div>
    </main>
  )
}
