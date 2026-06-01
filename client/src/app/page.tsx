import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Disaster Relief Coordination Platform
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Coordinate incidents, tasks and resources in real time.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
          >
            Open Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded border px-5 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
