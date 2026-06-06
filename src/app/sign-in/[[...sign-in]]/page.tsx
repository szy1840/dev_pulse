import { SignInForm } from "@/components/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const target = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <SignInForm redirectTo={target} />
    </div>
  );
}
