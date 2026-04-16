import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen" style={{ marginTop: '-60px' }}>
      <div className="text-center animate-fade-in max-w-3xl mx-auto">
        <h1 className="text-5xl mb-4 bg-gradient-text">
          Student Evaluation Ecosystem
        </h1>
        <p className="text-lg text-secondary mb-12">
          A premium platform to manage student performance, discipline, attendance, and behavioral growth with seamless rating aggregation.
        </p>

        <div className="flex justify-center gap-4">
          <Link href="/login" className="btn btn-primary px-4 py-2 text-lg">
            Enter Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
