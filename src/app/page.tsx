import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-white p-8">
      <div className="mb-12 text-center">
        <span className="text-5xl font-bold text-blue-600 block">EVC</span>
        <span className="text-xl font-semibold text-blue-700 uppercase tracking-wider">
          EVCARE
        </span>
      </div>
      <p className="text-gray-600 mb-12 text-center max-w-md">
        Electric Vehicle Fleet Management Console
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="px-8 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
        >
          Sign Up
        </Link>
      </div>
      <Link
        href="/dashboard"
        className="mt-8 text-blue-600 font-medium hover:underline"
      >
        Go to Dashboard →
      </Link>
      <p className="absolute bottom-8 text-sm text-gray-500">
        caring for the ❤️ of EV
      </p>
    </div>
  );
}
