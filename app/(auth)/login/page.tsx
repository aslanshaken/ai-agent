import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full max-w-lg space-y-6 text-center">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Welcome</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign in or create an account.</p>
      </div>
      <LoginForm />
    </div>
  );
}
