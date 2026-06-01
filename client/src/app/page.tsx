export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Disaster Relief Coordination Platform
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Next.js + TypeScript + Tailwind client. The API server runs separately
          on port 4000.
        </p>
        <code className="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm text-gray-100">
          NEXT_PUBLIC_API_URL={process.env.NEXT_PUBLIC_API_URL ?? 'not set'}
        </code>
      </div>
    </main>
  );
}
