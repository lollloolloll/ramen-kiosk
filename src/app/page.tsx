import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center space-y-4 p-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Welcome to the Ramen Kiosk
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-500 md:text-xl dark:text-gray-400">
          Your one-stop solution for delicious, self-served ramen.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button asChild size="lg">
          <Link href="/kiosk">Go to Kiosk</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/admin/stock">Admin Panel</Link>
        </Button>
      </div>
    </div>
  );
}